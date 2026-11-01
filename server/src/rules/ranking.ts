import type { QuoteEvaluation, QuoteFacts } from '../../../shared/api.js';
import { RANKING_POINTS } from './config.js';
import { calculatePayback, calculateSubsidy, calculateYearlySaving } from './calculations.js';

export interface RankingContext {
  monthlyUnits: number;
  stateCode: string;
}

const REQUIRED_ITEMS: ReadonlyArray<[keyof QuoteFacts, string]> = [
  ['priceRupees', 'price'],
  ['panelBrand', 'panel brand'],
  ['panelWatts', 'panel watts'],
  ['dcrConfirmed', 'made-in-India panel confirmation'],
  ['inverterBrand', 'inverter brand'],
  ['inverterWarrantyYears', 'inverter warranty'],
  ['panelWarrantyYears', 'panel warranty'],
  ['installDays', 'install time'],
];

function isMissing(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function evaluate(quote: QuoteFacts, context: RankingContext): QuoteEvaluation {
  const missingItems = REQUIRED_ITEMS.filter(([key]) => isMissing(quote[key])).map(([, label]) => label);
  const yearlySaving = calculateYearlySaving(context.monthlyUnits, quote.systemKw);
  const subsidyRupees = calculateSubsidy(quote.systemKw, context.stateCode, quote.dcrConfirmed);
  const possibleSubsidy = calculateSubsidy(quote.systemKw, context.stateCode, true);
  const subsidyAtRisk = quote.dcrConfirmed === null;

  const price = quote.priceRupees;
  const amountYouPayRupees = price === null ? null : price - subsidyRupees;
  const amountIfSubsidyApproved = subsidyAtRisk && price !== null ? price - possibleSubsidy : null;

  return {
    quoteId: quote.quoteId,
    systemKw: quote.systemKw,
    priceRupees: price,
    subsidyRupees,
    amountYouPayRupees,
    paybackYears: amountYouPayRupees === null ? null : calculatePayback(amountYouPayRupees, yearlySaving),
    yearlySavingRupees: yearlySaving,
    subsidyAtRisk,
    possibleSubsidyRupees: subsidyAtRisk ? possibleSubsidy : null,
    amountIfSubsidyApprovedRupees: amountIfSubsidyApproved,
    paybackIfSubsidyApprovedYears:
      amountIfSubsidyApproved === null ? null : calculatePayback(amountIfSubsidyApproved, yearlySaving),
    missingItems,
    recommendable: missingItems.length === 0 && quote.dcrConfirmed === true,
    score: null,
  };
}

/**
 * docs/RULES.md section 8. Takes only structured facts. Vendor notes must never reach this
 * function, which is the main protection against hidden instructions in a quote.
 */
export function rankQuotes(quotes: readonly QuoteFacts[], context: RankingContext) {
  const evaluations = quotes.map((quote) => evaluate(quote, context));
  const facts = new Map(quotes.map((quote) => [quote.quoteId, quote]));
  const eligible = evaluations.filter((e) => e.recommendable);

  if (eligible.length > 0) {
    const lowestAmount = Math.min(...eligible.map((e) => e.amountYouPayRupees!));
    const fastestDays = Math.min(...eligible.map((e) => facts.get(e.quoteId)!.installDays!));
    const p = RANKING_POINTS;

    for (const evaluation of eligible) {
      const quote = facts.get(evaluation.quoteId)!;
      evaluation.score =
        (p.amount * lowestAmount) / Math.max(evaluation.amountYouPayRupees!, 1) +
        (p.inverterWarranty * Math.min(quote.inverterWarrantyYears!, p.inverterWarrantyCapYears)) /
          p.inverterWarrantyCapYears +
        (p.panelWarranty * Math.min(quote.panelWarrantyYears!, p.panelWarrantyCapYears)) /
          p.panelWarrantyCapYears +
        (p.speed * fastestDays) / Math.max(quote.installDays!, 1);
    }
  }

  const ranked = [...eligible].sort(
    (a, b) =>
      b.score! - a.score! ||
      a.amountYouPayRupees! - b.amountYouPayRupees! ||
      a.quoteId.localeCompare(b.quoteId),
  );

  return { evaluations, recommendedQuoteId: ranked[0]?.quoteId ?? null };
}
