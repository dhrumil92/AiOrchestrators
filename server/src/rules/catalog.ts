import type { RuleEntry } from '../../../shared/api.js';
import { ASSUMPTIONS, SCHEME_END_DATE, SOURCES, UNITS_PER_KW_MONTH, type SourceKey } from './config.js';

function rule(
  id: string,
  title: string,
  plainText: string,
  formula: string | null,
  sourceKey: SourceKey | null,
  sourceSection: string | null,
  isAssumption = false,
): RuleEntry {
  const source = sourceKey ? SOURCES[sourceKey] : null;
  return {
    id,
    title,
    plainText,
    formula,
    sourceTitle: source?.title ?? null,
    sourceUrl: source?.url ?? null,
    sourceSection,
    isAssumption,
  };
}

/** Content for GET /api/rules and the "How was this calculated?" view. */
export const RULE_CATALOG: readonly RuleEntry[] = [
  rule(
    'cfa-standard',
    'Government subsidy',
    'The subsidy is ₹30,000 per kW for the first 2 kW and ₹18,000 for the next 1 kW. There is no extra subsidy beyond 3 kW, so the most you can get is ₹78,000.',
    '₹30,000 x kW up to 2 + ₹18,000 x kW from 2 to 3',
    'S1',
    'Section 5(h)',
  ),
  rule(
    'dcr-required',
    'Made-in-India panels',
    'Panels must be made in India using Indian-made cells. If any panel does not qualify, the installation cannot get the subsidy.',
    null,
    'S1',
    'Section 5(m)',
  ),
  rule(
    'sizing-band',
    'Suggested system size',
    'The scheme guidance suggests 1 to 2 kW for up to 150 units a month, 2 to 3 kW for 150 to 300 units, and above 3 kW for more than 300 units.',
    'Units per month / 120, rounded up to the nearest 0.5 kW',
    'S2',
    'Rooftop capacity table',
  ),
  rule(
    'tariff-rgp',
    'Your bill saving',
    'Savings use the Gujarat residential rates: ₹3.05 for the first 50 units, ₹3.50 for the next 50, ₹4.15 for the next 150, and ₹5.20 above 250. Duty and fuel surcharge are not counted, so the real saving may be higher.',
    'Energy charge before solar - energy charge after solar',
    'S3',
    'Rate RGP, sections 1.1 and 1.2',
  ),
  rule(
    'state-subsidy',
    'State subsidy',
    'States may add their own subsidy. This app does not include it.',
    null,
    'S1',
    'Section 5(i)',
  ),
  rule(
    'scheme-end',
    'Scheme end date',
    `The guidelines say the scheme runs until ${SCHEME_END_DATE}.`,
    null,
    'S1',
    'Section 2(d)',
  ),
  rule(
    'assumption-generation',
    'Solar generation estimate',
    `We assume ${ASSUMPTIONS.unitsPerKwDay} units per kW per day, or ${UNITS_PER_KW_MONTH} units per kW per month. Real output changes by season and site.`,
    `kW x ${UNITS_PER_KW_MONTH}`,
    'S6',
    'Reports about 4 to 5 units per kW per day',
    true,
  ),
  rule(
    'assumption-area',
    'Roof space estimate',
    `We assume ${ASSUMPTIONS.sqMPerKw} square metres of clear terrace per kW. This is a planning assumption with no official source, so a site visit must confirm it.`,
    `Usable area / ${ASSUMPTIONS.sqMPerKw}, rounded down to the nearest 0.5 kW`,
    null,
    null,
    true,
  ),
  rule(
    'assumption-net-metering',
    'Bill credit estimate',
    'We assume each solar unit offsets one unit you use. Actual net metering rules are set by state regulators.',
    null,
    null,
    null,
    true,
  ),
  rule(
    'assumption-payback',
    'Money-back estimate',
    'This is a simple estimate. It assumes flat electricity rates and steady panel output, and leaves out loans, maintenance and state subsidy.',
    'Amount you pay / yearly saving',
    null,
    null,
    true,
  ),
];
