import type {
  AuthUser,
  AiSource,
  Confidence,
  CreateRequestBody,
  Estimate,
  Language,
  Obstruction,
  PhotoAssessment,
  RequestStatus,
  ServiceRequest,
  UpdateRequestBody,
} from '../../../shared/api.js';
import { explainEstimate, assessTerracePhoto } from '../ai/index.js';
import { pool } from '../db/pool.js';
import {
  calculateSize,
  calculateSubsidy,
  calculateYearlySaving,
  monthlyGeneration,
} from '../rules/calculations.js';
import { storage } from '../storage/index.js';
import { HttpError, notFound } from './errors.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Catalog ids of the rules an estimate relies on. */
const ESTIMATE_RULES = [
  'cfa-standard',
  'dcr-required',
  'sizing-band',
  'tariff-rgp',
  'assumption-generation',
  'assumption-area',
  'assumption-net-metering',
];

/** The latest photo, and the latest review of that photo. An older photo's review is not shown. */
const REQUEST_SELECT = `
  SELECT r.*, p.storage_key,
         a.obstructions, a.summary, a.confidence, a.source AS assessment_source
  FROM service_requests r
  LEFT JOIN LATERAL (
    SELECT id, storage_key FROM terrace_photos
    WHERE request_id = r.id ORDER BY created_at DESC, id LIMIT 1
  ) p ON TRUE
  LEFT JOIN LATERAL (
    SELECT obstructions, summary, confidence, source FROM photo_assessments
    WHERE photo_id = p.id ORDER BY created_at DESC, id LIMIT 1
  ) a ON TRUE`;

interface RequestRow {
  id: string;
  user_id: string | null;
  phone: string | null;
  household_name: string;
  latitude: number;
  longitude: number;
  address_text: string | null;
  state_code: string;
  tariff_code: string;
  monthly_units: number;
  budget_rupees: number;
  usable_area_sqm: number | null;
  preferred_language: Language;
  status: RequestStatus;
  accepted_quote_id: string | null;
  is_sample: boolean;
  created_at: Date;
  storage_key: string | null;
  obstructions: Obstruction[] | null;
  summary: string | null;
  confidence: Confidence | null;
  assessment_source: AiSource | null;
}

function toServiceRequest(row: RequestRow): ServiceRequest {
  return {
    id: row.id,
    householdName: row.household_name,
    contactPhone: row.phone,
    latitude: row.latitude,
    longitude: row.longitude,
    addressText: row.address_text,
    stateCode: row.state_code,
    tariffCode: row.tariff_code,
    monthlyUnits: row.monthly_units,
    budgetRupees: row.budget_rupees,
    usableAreaSqm: row.usable_area_sqm,
    preferredLanguage: row.preferred_language,
    status: row.status,
    acceptedQuoteId: row.accepted_quote_id,
    photoUrl: row.storage_key === null ? null : `/api/requests/${row.id}/photo`,
    assessment:
      row.summary === null
        ? null
        : {
            obstructions: row.obstructions ?? [],
            summary: row.summary,
            confidence: row.confidence!,
            source: row.assessment_source!,
          },
    isSample: row.is_sample,
    createdAt: row.created_at.toISOString(),
  };
}

const maskName = (name: string): string =>
  name.split(/\s+/).map((word) => word[0] + '*'.repeat(Math.max(word.length - 1, 0))).join(' ');

/** What a vendor sees before winning: enough to quote, not enough to find the household. */
function toVendorView(request: ServiceRequest): ServiceRequest {
  return {
    ...request,
    householdName: maskName(request.householdName),
    contactPhone: null,
    addressText: request.addressText?.split(',').at(-1)?.trim() ?? null,
    latitude: Math.round(request.latitude * 100) / 100,
    longitude: Math.round(request.longitude * 100) / 100,
    acceptedQuoteId: null,
  };
}

async function wonRequestIds(vendorId: string): Promise<Set<string>> {
  const { rows } = await pool.query<{ request_id: string }>(
    `SELECT request_id FROM quotes WHERE vendor_id = $1 AND status = 'accepted'`,
    [vendorId],
  );
  return new Set(rows.map((row) => row.request_id));
}

export async function listRequests(user: AuthUser, status?: RequestStatus): Promise<ServiceRequest[]> {
  if (user.role === 'household') {
    const { rows } = await pool.query<RequestRow>(
      `${REQUEST_SELECT} WHERE r.user_id = $1 AND ($2::text IS NULL OR r.status = $2)
       ORDER BY r.created_at DESC, r.id`,
      [user.id, status ?? null],
    );
    return rows.map(toServiceRequest);
  }

  const { rows } = await pool.query<RequestRow>(
    `${REQUEST_SELECT}
     WHERE (r.status = 'open'
            OR EXISTS (SELECT 1 FROM quotes q WHERE q.request_id = r.id AND q.vendor_id = $1))
       AND ($2::text IS NULL OR r.status = $2)
     ORDER BY r.created_at DESC, r.id`,
    [user.vendorId, status ?? null],
  );
  const won = await wonRequestIds(user.vendorId!);
  return rows.map(toServiceRequest).map((r) => (won.has(r.id) ? r : toVendorView(r)));
}

async function findRequest(id: string): Promise<RequestRow> {
  const { rows } = await pool.query<RequestRow>(`${REQUEST_SELECT} WHERE r.id = $1`, [id]);
  if (!rows[0]) throw notFound('Request');
  return rows[0];
}

/** For internal use. Routes must check access first, and must not return this to a vendor. */
export async function getRequest(id: string): Promise<ServiceRequest> {
  return toServiceRequest(await findRequest(id));
}

/** Other people's requests look the same as missing ones, so ids cannot be probed. */
export async function requireRequestOwner(id: string, user: AuthUser): Promise<void> {
  const row = await findRequest(id);
  if (row.user_id !== user.id) throw notFound('Request');
}

export async function viewRequest(id: string, user: AuthUser): Promise<ServiceRequest> {
  const row = await findRequest(id);
  if (user.role === 'household') {
    if (row.user_id !== user.id) throw notFound('Request');
    return toServiceRequest(row);
  }
  const { rows } = await pool.query<{ status: string }>(
    'SELECT status FROM quotes WHERE request_id = $1 AND vendor_id = $2',
    [id, user.vendorId],
  );
  if (row.status !== 'open' && !rows[0]) throw notFound('Request');
  const request = toServiceRequest(row);
  return rows[0]?.status === 'accepted' ? request : toVendorView(request);
}

export async function readPhoto(requestId: string, user: AuthUser) {
  await viewRequest(requestId, user);
  const { rows } = await pool.query<{ storage_key: string; content_type: string }>(
    `SELECT storage_key, content_type FROM terrace_photos
     WHERE request_id = $1 ORDER BY created_at DESC, id LIMIT 1`,
    [requestId],
  );
  if (!rows[0]) throw notFound('Photo');
  return { data: await storage.read(rows[0].storage_key), contentType: rows[0].content_type };
}

export async function createRequest(body: CreateRequestBody, user: AuthUser): Promise<ServiceRequest> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO service_requests
       (user_id, household_name, phone, latitude, longitude, address_text, monthly_units,
        budget_rupees, usable_area_sqm, preferred_language)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      user.id,
      body.householdName,
      body.phone ?? null,
      body.latitude,
      body.longitude,
      body.addressText ?? null,
      body.monthlyUnits,
      body.budgetRupees,
      body.usableAreaSqm ?? null,
      body.preferredLanguage,
    ],
  );
  return getRequest(rows[0].id);
}

export async function updateRequest(id: string, body: UpdateRequestBody): Promise<ServiceRequest> {
  const { rowCount } = await pool.query(
    `UPDATE service_requests
     SET usable_area_sqm = COALESCE($2, usable_area_sqm),
         preferred_language = COALESCE($3, preferred_language)
     WHERE id = $1`,
    [id, body.usableAreaSqm ?? null, body.preferredLanguage ?? null],
  );
  if (!rowCount) throw notFound('Request');
  return getRequest(id);
}

export async function savePhoto(
  requestId: string,
  photo: { data: Buffer; contentType: string; extension: string },
): Promise<ServiceRequest> {
  await getRequest(requestId);
  const key = await storage.save(photo.data, photo.extension);
  await pool.query(
    `INSERT INTO terrace_photos (request_id, storage_key, content_type, size_bytes)
     VALUES ($1, $2, $3, $4)`,
    [requestId, key, photo.contentType, photo.data.length],
  );
  return getRequest(requestId);
}

export async function assessPhoto(requestId: string): Promise<PhotoAssessment> {
  await getRequest(requestId);
  const { rows } = await pool.query<{ id: string; storage_key: string; content_type: string }>(
    `SELECT id, storage_key, content_type FROM terrace_photos
     WHERE request_id = $1 ORDER BY created_at DESC, id LIMIT 1`,
    [requestId],
  );
  const photo = rows[0];
  if (!photo) throw new HttpError(409, 'NO_PHOTO', 'Upload a terrace photo first');

  const image = await storage.read(photo.storage_key);
  const result = await assessTerracePhoto(image, photo.content_type, photo.storage_key);
  await pool.query(
    `INSERT INTO photo_assessments
       (request_id, photo_id, obstructions, summary, confidence, source, model_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      requestId,
      photo.id,
      JSON.stringify(result.obstructions),
      result.summary,
      result.confidence,
      result.source,
      result.modelName,
    ],
  );
  return {
    obstructions: result.obstructions,
    summary: result.summary,
    confidence: result.confidence,
    source: result.source,
  };
}

const estimateExplanations = new Map<string, Awaited<ReturnType<typeof explainEstimate>>>();

/** Saves AI quota, since this screen reloads often. Templates are retried, not kept. */
async function cachedEstimateExplanation(
  facts: Parameters<typeof explainEstimate>[0],
  language: Parameters<typeof explainEstimate>[1],
) {
  const key = JSON.stringify({ facts, language });
  const cached = estimateExplanations.get(key);
  if (cached) return cached;

  const result = await explainEstimate(facts, language);
  if (result.source !== 'template') estimateExplanations.set(key, result);
  return result;
}

export async function getEstimate(requestId: string): Promise<Estimate> {
  const request = await getRequest(requestId);
  const size = calculateSize(request.monthlyUnits, request.usableAreaSqm);
  const generatedUnits = monthlyGeneration(size.finalKw);
  // Made-in-India panels are assumed here: this is the subsidy the household could get.
  const subsidyRupees = calculateSubsidy(size.finalKw, request.stateCode, true);
  const yearlySavingRupees = calculateYearlySaving(request.monthlyUnits, size.finalKw);

  const { text, source } = await cachedEstimateExplanation(
    {
      suggestedKw: size.finalKw,
      monthlyUnits: request.monthlyUnits,
      monthlyGenerationUnits: generatedUnits,
      subsidyRupees,
      yearlySavingRupees,
      limitedByRoof: size.limitedByRoof,
    },
    request.preferredLanguage,
  );

  return {
    suggestedKw: size.finalKw,
    energySizedKw: size.energySizedKw,
    roofLimitKw: size.roofLimitKw,
    limitedByRoof: size.limitedByRoof,
    schemeBand: size.schemeBand,
    monthlyGenerationUnits: generatedUnits,
    monthlyChart: MONTHS.map((month) => ({
      month,
      usedUnits: request.monthlyUnits,
      generatedUnits,
    })),
    subsidyRupees,
    yearlySavingRupees,
    explanation: text,
    explanationSource: source,
    rulesUsed: ESTIMATE_RULES,
  };
}
