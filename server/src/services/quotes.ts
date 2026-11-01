import type {
  AuthUser,
  CreateQuoteBody,
  Quote,
  QuoteStatus,
  SecurityFlag,
  ServiceRequest,
} from '../../../shared/api.js';
import { pool } from '../db/pool.js';
import { withTransaction } from '../db/transaction.js';
import { processVendorNotes } from '../security/index.js';
import { HttpError, notFound, requestClosed } from './errors.js';
import { getRequest, viewRequest } from './requests.js';

export interface QuoteRow {
  id: string;
  request_id: string;
  vendor_id: string;
  vendor_name: string;
  system_kw: number;
  price_rupees: number | null;
  panel_brand: string | null;
  panel_watts: number | null;
  dcr_confirmed: boolean | null;
  inverter_brand: string | null;
  inverter_kw: number | null;
  inverter_warranty_years: number | null;
  panel_warranty_years: number | null;
  install_days: number | null;
  notes_raw: string | null;
  notes_clean: string | null;
  status: QuoteStatus;
  injection_flagged: boolean;
  injection_reason: string | null;
  is_sample: boolean;
  created_at: Date;
}

const QUOTE_SELECT = `
  SELECT q.*, v.name AS vendor_name
  FROM quotes q JOIN vendors v ON v.id = q.vendor_id`;

/**
 * What may be shown of a quote's notes. Removed text has no column, so it is worked out again
 * from notes_raw. Rows inserted without going through the API, such as the seed data, have raw
 * notes that were never processed, so they get the same treatment here.
 */
function readNotes(row: QuoteRow): { notes: string | null; securityFlag: SecurityFlag | null } {
  const unprocessed = row.notes_clean === null && row.notes_raw !== null;
  const processed = row.injection_flagged || unprocessed ? processVendorNotes(row.notes_raw) : null;

  if (row.injection_flagged || processed?.flagged) {
    return {
      notes: null,
      securityFlag: {
        reason: row.injection_reason ?? processed?.reason ?? 'Hidden instructions were found',
        removedText: processed?.removedText ?? '',
      },
    };
  }
  return { notes: row.notes_clean ?? processed?.clean ?? null, securityFlag: null };
}

export function securityFlagOf(row: QuoteRow): SecurityFlag | null {
  return readNotes(row).securityFlag;
}

/** The only way a quote leaves the server as a Quote. notes_raw is never copied across. */
function toQuote(row: QuoteRow): Quote {
  const { notes, securityFlag } = readNotes(row);
  return {
    id: row.id,
    requestId: row.request_id,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    systemKw: row.system_kw,
    priceRupees: row.price_rupees,
    panelBrand: row.panel_brand,
    panelWatts: row.panel_watts,
    dcrConfirmed: row.dcr_confirmed,
    inverterBrand: row.inverter_brand,
    inverterKw: row.inverter_kw,
    inverterWarrantyYears: row.inverter_warranty_years,
    panelWarrantyYears: row.panel_warranty_years,
    installDays: row.install_days,
    notes,
    status: row.status,
    injectionFlagged: securityFlag !== null,
    injectionReason: securityFlag?.reason ?? null,
    isSample: row.is_sample,
    createdAt: row.created_at.toISOString(),
  };
}

export async function quoteRowsForRequest(requestId: string): Promise<QuoteRow[]> {
  const { rows } = await pool.query<QuoteRow>(
    `${QUOTE_SELECT} WHERE q.request_id = $1 ORDER BY q.created_at, q.id`,
    [requestId],
  );
  return rows;
}

/** A household sees every quote on its request. A vendor sees only its own. */
export async function listRequestQuotes(requestId: string, user: AuthUser): Promise<Quote[]> {
  await viewRequest(requestId, user);
  const rows = await quoteRowsForRequest(requestId);
  const visible = user.role === 'vendor' ? rows.filter((row) => row.vendor_id === user.vendorId) : rows;
  return visible.map(toQuote);
}

export async function listVendorQuotes(vendorId: string, user: AuthUser): Promise<Quote[]> {
  if (user.vendorId !== vendorId) throw notFound('Vendor');
  const { rows } = await pool.query<QuoteRow>(
    `${QUOTE_SELECT} WHERE q.vendor_id = $1 ORDER BY q.created_at DESC, q.id`,
    [vendorId],
  );
  return rows.map(toQuote);
}

export async function createQuote(
  requestId: string,
  vendorId: string,
  body: CreateQuoteBody,
): Promise<Quote> {
  const notes = processVendorNotes(body.notes ?? null);

  const quoteId = await withTransaction(async (client) => {
    // The shared lock stops a quote slipping in while an accept is closing the request.
    const request = await client.query<{ status: string }>(
      'SELECT status FROM service_requests WHERE id = $1 FOR SHARE',
      [requestId],
    );
    if (!request.rows[0]) throw notFound('Request');
    if (request.rows[0].status !== 'open') throw requestClosed();

    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO quotes
         (request_id, vendor_id, system_kw, price_rupees, panel_brand, panel_watts, dcr_confirmed,
          inverter_brand, inverter_kw, inverter_warranty_years, panel_warranty_years, install_days,
          notes_raw, notes_clean, injection_flagged, injection_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (request_id, vendor_id) DO NOTHING
       RETURNING id`,
      [
        requestId,
        vendorId,
        body.systemKw,
        body.priceRupees ?? null,
        body.panelBrand ?? null,
        body.panelWatts ?? null,
        body.dcrConfirmed ?? null,
        body.inverterBrand ?? null,
        body.inverterKw ?? null,
        body.inverterWarrantyYears ?? null,
        body.panelWarrantyYears ?? null,
        body.installDays ?? null,
        body.notes ?? null,
        notes.flagged ? null : notes.clean,
        notes.flagged,
        notes.reason,
      ],
    );
    if (!rows[0]) {
      throw new HttpError(409, 'ALREADY_QUOTED', 'This vendor has already quoted on this request');
    }
    return rows[0].id;
  });

  const { rows } = await pool.query<QuoteRow>(`${QUOTE_SELECT} WHERE q.id = $1`, [quoteId]);
  return toQuote(rows[0]);
}

export async function acceptQuote(quoteId: string, user: AuthUser): Promise<ServiceRequest> {
  const requestId = await withTransaction(async (client) => {
    const quote = await client.query<{ request_id: string }>(
      `SELECT q.request_id FROM quotes q JOIN service_requests r ON r.id = q.request_id
       WHERE q.id = $1 AND r.user_id = $2`,
      [quoteId, user.id],
    );
    if (!quote.rows[0]) throw notFound('Quote');
    const { request_id: id } = quote.rows[0];

    const request = await client.query<{ status: string }>(
      'SELECT status FROM service_requests WHERE id = $1 FOR UPDATE',
      [id],
    );
    if (request.rows[0].status !== 'open') throw requestClosed();

    await client.query(
      `UPDATE quotes SET status = CASE WHEN id = $1 THEN 'accepted' ELSE 'not_selected' END
       WHERE request_id = $2`,
      [quoteId, id],
    );
    await client.query(
      `UPDATE service_requests SET status = 'closed', accepted_quote_id = $1 WHERE id = $2`,
      [quoteId, id],
    );
    return id;
  });
  return getRequest(requestId);
}
