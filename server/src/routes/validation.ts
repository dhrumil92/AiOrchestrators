import path from 'node:path';
import multer from 'multer';
import { z } from 'zod';
import { HttpError } from '../services/errors.js';

// Column limits, so an oversized value is a 400 and not a database error.
const MAX_INT = 2_147_483_647;
const MAX_KW = 999.99;
const MAX_AREA_SQM = 999_999.99;

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/** z.guid, which accepts any UUID Postgres accepts. z.uuid also checks the version bits. */
export const idParam = z.object({ id: z.guid() });

const language = z.enum(['en', 'hi', 'gu']);
const positiveInt = z.number().int().positive().max(MAX_INT);
const shortText = z.string().trim().min(1).max(200);

export const createRequestSchema = z.object({
  householdName: shortText,
  phone: z.string().trim().min(1).max(30).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  addressText: z.string().trim().min(1).max(500).optional(),
  monthlyUnits: positiveInt,
  budgetRupees: positiveInt,
  usableAreaSqm: z.number().min(0).max(MAX_AREA_SQM).optional(),
  preferredLanguage: language,
});

export const updateRequestSchema = z
  .object({
    usableAreaSqm: z.number().min(0).max(MAX_AREA_SQM).optional(),
    preferredLanguage: language.optional(),
  })
  .refine((body) => body.usableAreaSqm !== undefined || body.preferredLanguage !== undefined, {
    message: 'Provide usableAreaSqm or preferredLanguage',
  });

export const listRequestsQuery = z.object({ status: z.enum(['open', 'closed']).optional() });

const email = z.string().trim().toLowerCase().max(200).pipe(z.email());

const newPassword = z.string().min(8, 'Use at least 8 characters').max(128);

export const signupSchema = z
  .object({
    role: z.enum(['household', 'vendor']),
    name: shortText,
    email,
    password: newPassword,
    city: shortText.optional(),
  })
  .refine((body) => body.role !== 'vendor' || body.city !== undefined, {
    path: ['city'],
    message: 'Enter your city',
  });

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });

export const eligibilitySchema = z.object({
  isIndianCitizen: z.boolean(),
  connection: z.enum(['residential', 'commercial', 'industrial', 'none']),
  gridConnected: z.boolean(),
  receivedSubsidyBefore: z.boolean(),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(200),
  password: newPassword,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword,
});

export const createQuoteSchema = z.object({
  systemKw: z.number().positive().max(MAX_KW),
  priceRupees: positiveInt.nullish(),
  panelBrand: shortText.nullish(),
  panelWatts: positiveInt.nullish(),
  dcrConfirmed: z.boolean().nullish(),
  inverterBrand: shortText.nullish(),
  inverterKw: z.number().positive().max(MAX_KW).nullish(),
  inverterWarrantyYears: z.number().int().min(0).max(MAX_INT).nullish(),
  panelWarrantyYears: z.number().int().min(0).max(MAX_INT).nullish(),
  installDays: positiveInt.nullish(),
  notes: z.string().max(5000).nullish(),
});

export const voiceBody = z.object({ language });

const uploaded = z.object({
  buffer: z.instanceof(Buffer),
  mimetype: z.string(),
  size: z.number().int().positive(),
  originalname: z.string(),
});

export const photoFile = uploaded.extend({
  mimetype: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    error: 'Photo must be a JPEG, PNG or WebP',
  }),
  size: z.number().int().positive().max(MAX_PHOTO_BYTES),
});

export const audioFile = uploaded.extend({
  mimetype: z.string().regex(/^(audio|video)\//, 'Upload an audio recording'),
  size: z.number().int().positive().max(MAX_AUDIO_BYTES),
});

export const photoUpload = multer({ limits: { fileSize: MAX_PHOTO_BYTES, files: 1 } }).single('photo');
export const audioUpload = multer({ limits: { fileSize: MAX_AUDIO_BYTES, files: 1 } }).single('audio');

/** The file's real type, from its first bytes. The declared type comes from the client. */
export function photoExtension(data: Buffer, contentType: string): string {
  const startsWith = (hex: string, offset = 0) =>
    data.subarray(offset, offset + hex.length / 2).toString('hex') === hex;

  const detected =
    startsWith('ffd8ff') ? { type: 'image/jpeg', extension: 'jpg' }
    : startsWith('89504e470d0a1a0a') ? { type: 'image/png', extension: 'png' }
    : startsWith('52494646') && startsWith('57454250', 8) ? { type: 'image/webp', extension: 'webp' }
    : null;

  if (detected?.type !== contentType) {
    throw new HttpError(400, 'INVALID_FILE', 'Photo must be a JPEG, PNG or WebP');
  }
  return detected.extension;
}

/** A safe name for the speech service, which reads the format from the extension. */
export function audioFilename(originalName: string): string {
  const extension = path.extname(originalName).toLowerCase();
  return `audio${/^\.[a-z0-9]{1,5}$/.test(extension) ? extension : '.webm'}`;
}

export const calculatorQuery = z.object({
  kw: z.coerce.number().positive().max(100),
  monthlyUnits: z.coerce.number().int().positive().max(100_000),
});
