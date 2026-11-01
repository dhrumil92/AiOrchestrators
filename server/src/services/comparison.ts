import { createHash } from 'node:crypto';
import type {
  AiSource,
  Comparison,
  ComparisonQuote,
  Language,
  Recommendation,
  QuoteFacts,
} from '../../../shared/api.js';
import { explainRecommendation, type RecommendationFacts } from '../ai/index.js';
import { pool } from '../db/pool.js';
import { rankQuotes } from '../rules/ranking.js';
import { quoteRowsForRequest, securityFlagOf, type QuoteRow } from './quotes.js';
import { getRequest } from './requests.js';

/** Structured fields only. Notes are left out on purpose: ranking must never read them. */
function toQuoteFacts(row: QuoteRow): QuoteFacts {
  return {
    quoteId: row.id,
    systemKw: row.system_kw,
    priceRupees: row.price_rupees,
    panelBrand: row.panel_brand,
    panelWatts: row.panel_watts,
    dcrConfirmed: row.dcr_confirmed,
    inverterBrand: row.inverter_brand,
    inverterWarrantyYears: row.inverter_warranty_years,
    panelWarrantyYears: row.panel_warranty_years,
    installDays: row.install_days,
  };
}

async function explain(
  requestId: string,
  facts: RecommendationFacts,
  language: Language,
): Promise<{ reasons: string[]; source: AiSource }> {
  const inputHash = createHash('sha256').update(JSON.stringify({ facts, language })).digest('hex');
  const cached = await pool.query<{ explanation: string[]; source: AiSource }>(
    'SELECT explanation, source FROM recommendations WHERE request_id = $1 AND input_hash = $2',
    [requestId, inputHash],
  );
  // A template means the AI was unavailable, so try again rather than keep it for good.
  const hit = cached.rows[0];
  if (hit && hit.source !== 'template') return { reasons: hit.explanation, source: hit.source };

  const { reasons, source } = await explainRecommendation(facts, language);
  const scores = Object.fromEntries(facts.quotes.map((quote) => [quote.quoteId, quote.score]));
  await pool.query(
    `INSERT INTO recommendations
       (request_id, recommended_quote_id, scores, explanation, language, source, input_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (request_id, input_hash)
     DO UPDATE SET explanation = EXCLUDED.explanation, source = EXCLUDED.source`,
    [
      requestId,
      facts.recommendedQuoteId,
      JSON.stringify(scores),
      JSON.stringify(reasons),
      language,
      source,
      inputHash,
    ],
  );
  return { reasons, source };
}

export async function getComparison(requestId: string): Promise<Comparison> {
  const request = await getRequest(requestId);
  const rows = await quoteRowsForRequest(requestId);
  const { evaluations, recommendedQuoteId } = rankQuotes(rows.map(toQuoteFacts), {
    monthlyUnits: request.monthlyUnits,
    stateCode: request.stateCode,
  });

  const quotes = rows.map((row, index): ComparisonQuote => ({
    ...evaluations[index],
    vendorName: row.vendor_name,
    status: row.status,
    securityFlag: securityFlagOf(row),
    panelBrand: row.panel_brand,
    panelWatts: row.panel_watts,
    dcrConfirmed: row.dcr_confirmed,
    inverterBrand: row.inverter_brand,
    inverterWarrantyYears: row.inverter_warranty_years,
    panelWarrantyYears: row.panel_warranty_years,
    installDays: row.install_days,
  }));

  const language = request.preferredLanguage;
  const { reasons, source } =
    quotes.length === 0
      ? { reasons: [], source: 'template' as const }
      : await explain(
          requestId,
          {
            recommendedQuoteId,
            quotes: quotes.map((quote) => ({
              quoteId: quote.quoteId,
              vendorName: quote.vendorName,
              amountYouPayRupees: quote.amountYouPayRupees,
              paybackYears: quote.paybackYears,
              subsidyAtRisk: quote.subsidyAtRisk,
              missingItems: quote.missingItems,
              recommendable: quote.recommendable,
              score: quote.score,
              inverterWarrantyYears: quote.inverterWarrantyYears,
              panelWarrantyYears: quote.panelWarrantyYears,
              installDays: quote.installDays,
              injectionFlagged: quote.securityFlag !== null,
            })),
          },
          language,
        );

  // Built from the ranking alone, whatever the AI said.
  const recommendation: Recommendation = {
    quoteId: recommendedQuoteId,
    reasons,
    language,
    source,
  };
  return { quotes, recommendation };
}
