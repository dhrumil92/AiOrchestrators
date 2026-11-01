/**
 * Shared API contract, used by client and server. Matches docs/ARCHITECTURE.md section 5.
 * Change this file and the document together, and only after agreeing with the team.
 * Money is in whole rupees. Null means the value is missing and must be shown as missing.
 */

export const API_BASE_URL = 'http://localhost:4000/api';

/** Fixed id of the seeded demo request. */
export const DEMO_REQUEST_ID = '11111111-1111-4111-8111-111111111111';

export type Language = 'en' | 'hi' | 'gu';
export type RequestStatus = 'open' | 'closed';
export type QuoteStatus = 'submitted' | 'accepted' | 'not_selected';
export type AiSource = 'live' | 'saved' | 'template';
export type Confidence = 'low' | 'medium' | 'high';

export type UserRole = 'household' | 'vendor';

export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  /** Set only for vendor accounts. */
  vendorId: string | null;
}

export interface SignupBody {
  role: UserRole;
  /** A person's name, or the company name for a vendor. */
  name: string;
  email: string;
  password: string;
  /** Required for vendors. */
  city?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

/** POST /auth/forgot-password. Always answers 204, whether or not the email has an account. */
export interface ForgotPasswordBody {
  email: string;
}

/** POST /auth/reset-password. `token` comes from the emailed link. Logs in and returns the AuthUser. */
export interface ResetPasswordBody {
  token: string;
  /** At least 8 characters. */
  password: string;
}

/** POST /auth/change-password, logged in. Answers 204 and logs out the account's other sessions. */
export interface ChangePasswordBody {
  currentPassword: string;
  /** At least 8 characters. */
  newPassword: string;
}

export interface ApiError {
  error: { code: string; message: string };
}

export interface Vendor {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  isSample: boolean;
}

export interface CreateRequestBody {
  householdName: string;
  phone?: string;
  latitude: number;
  longitude: number;
  addressText?: string;
  monthlyUnits: number;
  budgetRupees: number;
  usableAreaSqm?: number;
  preferredLanguage: Language;
}

export interface UpdateRequestBody {
  usableAreaSqm?: number;
  preferredLanguage?: Language;
}

export interface Obstruction {
  name: string;
  note: string;
}

export interface PhotoAssessment {
  obstructions: Obstruction[];
  summary: string;
  confidence: Confidence;
  source: AiSource;
}

/**
 * A vendor gets a limited view until its quote is accepted: masked name, city only, location
 * rounded to about 1 km, and no phone number.
 */
export interface ServiceRequest {
  id: string;
  householdName: string;
  contactPhone: string | null;
  latitude: number;
  longitude: number;
  addressText: string | null;
  stateCode: string;
  tariffCode: string;
  monthlyUnits: number;
  budgetRupees: number;
  usableAreaSqm: number | null;
  preferredLanguage: Language;
  status: RequestStatus;
  acceptedQuoteId: string | null;
  photoUrl: string | null;
  assessment: PhotoAssessment | null;
  isSample: boolean;
  createdAt: string;
}

export interface MonthlyChartPoint {
  month: string;
  usedUnits: number;
  generatedUnits: number;
}

export interface Estimate {
  suggestedKw: number;
  energySizedKw: number;
  roofLimitKw: number | null;
  limitedByRoof: boolean;
  schemeBand: string;
  monthlyGenerationUnits: number;
  monthlyChart: MonthlyChartPoint[];
  subsidyRupees: number;
  yearlySavingRupees: number;
  explanation: string;
  explanationSource: AiSource;
  rulesUsed: string[];
}

/** The vendor comes from the logged-in account, never from the request body. */
export interface CreateQuoteBody {
  systemKw: number;
  priceRupees?: number | null;
  panelBrand?: string | null;
  panelWatts?: number | null;
  dcrConfirmed?: boolean | null;
  inverterBrand?: string | null;
  inverterKw?: number | null;
  inverterWarrantyYears?: number | null;
  panelWarrantyYears?: number | null;
  installDays?: number | null;
  notes?: string | null;
}

export interface Quote {
  id: string;
  requestId: string;
  vendorId: string;
  vendorName: string;
  systemKw: number;
  priceRupees: number | null;
  panelBrand: string | null;
  panelWatts: number | null;
  dcrConfirmed: boolean | null;
  inverterBrand: string | null;
  inverterKw: number | null;
  inverterWarrantyYears: number | null;
  panelWarrantyYears: number | null;
  installDays: number | null;
  /** Cleaned text. Null when the notes were flagged or empty. */
  notes: string | null;
  status: QuoteStatus;
  injectionFlagged: boolean;
  injectionReason: string | null;
  isSample: boolean;
  createdAt: string;
}

/** Structured facts used for ranking. Vendor notes are excluded on purpose. */
export interface QuoteFacts {
  quoteId: string;
  systemKw: number;
  priceRupees: number | null;
  panelBrand: string | null;
  panelWatts: number | null;
  dcrConfirmed: boolean | null;
  inverterBrand: string | null;
  inverterWarrantyYears: number | null;
  panelWarrantyYears: number | null;
  installDays: number | null;
}

export interface QuoteEvaluation {
  quoteId: string;
  systemKw: number;
  priceRupees: number | null;
  /** Confirmed subsidy only: 0 unless made-in-India panels are confirmed. */
  subsidyRupees: number;
  amountYouPayRupees: number | null;
  paybackYears: number | null;
  yearlySavingRupees: number;
  subsidyAtRisk: boolean;
  /** The next three are set only when subsidyAtRisk is true. */
  possibleSubsidyRupees: number | null;
  amountIfSubsidyApprovedRupees: number | null;
  paybackIfSubsidyApprovedYears: number | null;
  missingItems: string[];
  recommendable: boolean;
  score: number | null;
}

export interface SecurityFlag {
  reason: string;
  removedText: string;
}

export interface ComparisonQuote extends QuoteEvaluation {
  vendorName: string;
  status: QuoteStatus;
  securityFlag: SecurityFlag | null;
  panelBrand: string | null;
  panelWatts: number | null;
  dcrConfirmed: boolean | null;
  inverterBrand: string | null;
  inverterWarrantyYears: number | null;
  panelWarrantyYears: number | null;
  installDays: number | null;
}

export interface Recommendation {
  quoteId: string | null;
  reasons: string[];
  language: Language;
  source: AiSource;
}

export interface Comparison {
  quotes: ComparisonQuote[];
  recommendation: Recommendation;
}

export interface VoiceResult {
  transcript: string;
  fields: {
    monthlyUnits: number | null;
    budgetRupees: number | null;
    notes: string | null;
  };
  source: AiSource;
}

export interface RuleEntry {
  id: string;
  title: string;
  plainText: string;
  formula: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  sourceSection: string | null;
  isAssumption: boolean;
}

export interface CalculatorResult {
  /** Scheme benchmark cost from 2024. An example cost, not a market price. */
  benchmarkRupees: number;
  subsidyRupees: number;
  amountYouPayRupees: number;
  yearlySavingRupees: number;
  paybackYears: number | null;
}
