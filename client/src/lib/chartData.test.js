import { describe, expect, it } from 'vitest';
import { costBars, missingDetails, paybackLines, pickPaybackQuotes } from './chartData.js';

const base = { amountIfSubsidyApprovedRupees: null, possibleSubsidyRupees: null, subsidyAtRisk: false, yearlySavingRupees: 14520 };
const a = { ...base, quoteId: 'a', vendorName: 'Sunrise', priceRupees: 145000, subsidyRupees: 69000, amountYouPayRupees: 76000, paybackYears: 5.23 };
const b = { ...base, quoteId: 'b', vendorName: 'QuickSolar', priceRupees: 125000, subsidyRupees: 0, amountYouPayRupees: 125000, paybackYears: 8.6, subsidyAtRisk: true, possibleSubsidyRupees: 69000, amountIfSubsidyApprovedRupees: 56000 };
const c = { ...base, quoteId: 'c', vendorName: 'BrightPeak', priceRupees: 160000, subsidyRupees: 69000, amountYouPayRupees: 91000, paybackYears: 6.27 };

describe('costBars', () => {
  it('keeps each bar equal to the quote price', () => {
    for (const row of costBars([a, b, c])) {
      const quote = [a, b, c].find(q => q.vendorName === row.name);
      expect(row.pay + (row.subsidy ?? 0) + (row.atRisk ?? 0)).toBe(quote.priceRupees);
    }
  });

  it('shows at-risk subsidy separately from confirmed subsidy', () => {
    expect(costBars([b])[0]).toMatchObject({ pay: 56000, subsidy: null, atRisk: 69000 });
  });

  it('skips quotes with no price', () => {
    expect(costBars([{ ...a, priceRupees: null }])).toEqual([]);
  });
});

describe('payback chart', () => {
  it('puts the recommended quote first and limits to 3', () => {
    const picked = pickPaybackQuotes([c, b, a, { ...a, quoteId: 'd', amountYouPayRupees: 80000 }], 'c');
    expect(picked.map(q => q.quoteId)).toEqual(['c', 'a', 'd']);
  });

  it('skips quotes with no payback', () => {
    expect(pickPaybackQuotes([{ ...a, paybackYears: null }], null)).toEqual([]);
  });

  it('starts at minus the amount paid and crosses zero near the payback year', () => {
    const rows = paybackLines([a]);
    expect(rows[0].a).toBe(-76000);
    expect(rows[5].a).toBeLessThan(0);
    expect(rows[6].a).toBeGreaterThan(0);
  });

  it('extends past the slowest payback', () => {
    expect(paybackLines([{ ...b, paybackYears: 12.4 }]).at(-1).year).toBe(14);
  });
});

describe('missingDetails', () => {
  it('treats false as answered and blank as missing', () => {
    const form = { priceRupees: 1, panelBrand: 'A', panelWatts: 540, dcrConfirmed: false, inverterBrand: '', inverterWarrantyYears: null, panelWarrantyYears: 25, installDays: 10 };
    expect(missingDetails(form)).toEqual(['Inverter brand', 'Inverter warranty']);
  });
});
