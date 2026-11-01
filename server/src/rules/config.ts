/**
 * Every rule value used by the app. Values must match docs/RULES.md.
 * Do not add a value here without a source key or an explicit assumption label.
 */

export const SOURCES = {
  S1: {
    title:
      'MNRE Guidelines for PM-Surya Ghar: Muft Bijli Yojana, Central Financial Assistance to Residential Consumers (capex mode)',
    url: 'https://solar.delhi.gov.in/public/assets/solar/PMSG_Guidelines_for_Residential_CFA_Capex_Mode.pdf',
  },
  S2: {
    title: 'Delhi Solar Portal: central subsidy',
    url: 'https://solar.delhi.gov.in/page/central-subsidy',
  },
  S3: {
    title: 'GERC tariff schedule for DGVCL, MGVCL, PGVCL and UGVCL, effective 1 April 2026',
    url: 'https://gercin.org/viewdocument/dGFyaWZmc2NoZWR1bGVfcGRmXzE3ODYwOTcyMjFfNzk2NA==',
  },
  S6: {
    title: 'CSE publication on rooftop solar generation',
    url: 'https://www.cseindia.org/content/downloadreports/13022',
  },
} as const;

export type SourceKey = keyof typeof SOURCES;

/** S1 section 2(d). */
export const SCHEME_END_DATE = '2027-03-31';

/** S1 section 5(h). Rupees per kW. */
export const CFA_RATES = {
  standard: { firstSlabPerKw: 30_000, secondSlabPerKw: 18_000 },
  special: { firstSlabPerKw: 33_000, secondSlabPerKw: 19_800 },
} as const;

/** S1 section 5(e): first 2 kW, then 1 more kW, nothing beyond 3 kW. */
export const CFA_FIRST_SLAB_KW = 2;
export const CFA_SECOND_SLAB_KW = 1;

/** S1 section 5(g). ISO-style state and UT codes. Gujarat is not included. */
export const SPECIAL_CATEGORY_STATE_CODES: readonly string[] = [
  'UK', 'HP', 'JK', 'LA', 'AR', 'AS', 'MN', 'ML', 'MZ', 'NL', 'SK', 'TR', 'AN', 'LD',
];

/** S2. Scheme guidance on suitable capacity. */
export const SIZING_BANDS = [
  { maxUnits: 150, label: '1 to 2 kW' },
  { maxUnits: 300, label: '2 to 3 kW' },
  { maxUnits: Number.POSITIVE_INFINITY, label: 'Above 3 kW' },
] as const;

/** Assumptions from docs/RULES.md section 5. Shown to the household. */
export const ASSUMPTIONS = {
  unitsPerKwDay: 4, // Conservative end of S6's 4 to 5.
  daysPerMonth: 30,
  sqMPerKw: 10, // Planning assumption with no official source. Verify on site.
  minKw: 1,
  stepKw: 0.5,
} as const;

export const UNITS_PER_KW_MONTH = ASSUMPTIONS.unitsPerKwDay * ASSUMPTIONS.daysPerMonth;

/** S3, Rate RGP, post-paid, non-BPL. Stored in paise so sums stay exact. */
export const TARIFF_RGP_SLABS = [
  { units: 50, paisePerUnit: 305 },
  { units: 50, paisePerUnit: 350 },
  { units: 150, paisePerUnit: 415 },
  { units: Number.POSITIVE_INFINITY, paisePerUnit: 520 },
] as const;

/** S1 section 5(g). Set in February 2024. Rupees per kW. Not a market price. */
export const BENCHMARK_COST = {
  firstSlabPerKw: 50_000,
  secondSlabPerKw: 45_000,
} as const;

/** docs/RULES.md section 8. */
export const RANKING_POINTS = {
  amount: 50,
  inverterWarranty: 20,
  panelWarranty: 10,
  speed: 20,
  inverterWarrantyCapYears: 10,
  panelWarrantyCapYears: 25,
} as const;
