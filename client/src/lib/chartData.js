// Shapes server figures for charts. These helpers only arrange numbers from the API.

const short = name => name.length > 24 ? name.slice(0, 23) + '…' : name;

/** One stacked bar per quote: what the household pays, plus confirmed or at-risk subsidy. */
export function costBars(quotes) {
  return quotes.filter(q => q.priceRupees !== null).map(q => ({
    name: short(q.vendorName),
    pay: q.subsidyAtRisk ? q.amountIfSubsidyApprovedRupees : q.amountYouPayRupees,
    subsidy: q.subsidyRupees || null,                 // null keeps empty rows out of the tooltip
    atRisk: q.subsidyAtRisk ? q.possibleSubsidyRupees : null,
  }));
}

/** Up to 3 quotes to plot: the recommended one first, then the lowest amount to pay. */
export function pickPaybackQuotes(quotes, recommendedId) {
  return quotes
    .filter(q => q.paybackYears !== null && q.amountYouPayRupees !== null)
    .sort((a, b) => (b.quoteId === recommendedId) - (a.quoteId === recommendedId) || a.amountYouPayRupees - b.amountYouPayRupees)
    .slice(0, 3);
}

/** Yearly position per quote: below zero is still paying back, above zero is profit. */
export function paybackLines(quotes) {
  const last = Math.max(8, Math.ceil(Math.max(0, ...quotes.map(q => q.paybackYears))) + 1);
  return Array.from({ length: last + 1 }, (_, year) => {
    const row = { year };
    quotes.forEach(q => { row[q.quoteId] = q.yearlySavingRupees * year - q.amountYouPayRupees; });
    return row;
  });
}

/** Required quote details filled in on the vendor form. */
export const QUOTE_DETAILS = [
  ['priceRupees', 'Price'], ['panelBrand', 'Panel brand'], ['panelWatts', 'Panel watts'], ['dcrConfirmed', 'Made-in-India panels'],
  ['inverterBrand', 'Inverter brand'], ['inverterWarrantyYears', 'Inverter warranty'], ['panelWarrantyYears', 'Panel warranty'], ['installDays', 'Install time'],
];
export function missingDetails(form) {
  return QUOTE_DETAILS.filter(([key]) => form[key] === '' || form[key] === null || form[key] === undefined).map(([, label]) => label);
}
