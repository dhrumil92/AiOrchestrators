import {
  ASSUMPTIONS,
  BENCHMARK_COST,
  CFA_FIRST_SLAB_KW,
  CFA_RATES,
  CFA_SECOND_SLAB_KW,
  SIZING_BANDS,
  SPECIAL_CATEGORY_STATE_CODES,
  TARIFF_RGP_SLABS,
  UNITS_PER_KW_MONTH,
} from './config.js';

function assertNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative number`);
  }
}

function slabbedKw(kw: number) {
  return {
    first: Math.min(kw, CFA_FIRST_SLAB_KW),
    second: Math.min(Math.max(kw - CFA_FIRST_SLAB_KW, 0), CFA_SECOND_SLAB_KW),
  };
}

export function isSpecialCategory(stateCode: string): boolean {
  return SPECIAL_CATEGORY_STATE_CODES.includes(stateCode.toUpperCase());
}

/** docs/RULES.md section 2. Returns the subsidy in rupees. */
export function calculateSubsidy(
  kw: number,
  stateCode: string,
  dcrConfirmed: boolean | null,
): number {
  assertNonNegative(kw, 'kw');
  if (dcrConfirmed !== true) return 0;
  const rates = isSpecialCategory(stateCode) ? CFA_RATES.special : CFA_RATES.standard;
  const { first, second } = slabbedKw(kw);
  return rates.firstSlabPerKw * first + rates.secondSlabPerKw * second;
}

/** docs/RULES.md section 4. */
export function calculateSize(monthlyUnits: number, usableAreaSqM: number | null) {
  assertNonNegative(monthlyUnits, 'monthlyUnits');
  if (monthlyUnits === 0) throw new RangeError('monthlyUnits must be above 0');

  const { minKw, stepKw, sqMPerKw } = ASSUMPTIONS;
  const energyKw = monthlyUnits / UNITS_PER_KW_MONTH;
  const energySizedKw = Math.max(Math.ceil(energyKw / stepKw) * stepKw, minKw);

  let roofLimitKw: number | null = null;
  if (usableAreaSqM !== null) {
    assertNonNegative(usableAreaSqM, 'usableAreaSqM');
    roofLimitKw = Math.floor(usableAreaSqM / sqMPerKw / stepKw) * stepKw;
  }

  const finalKw = roofLimitKw === null ? energySizedKw : Math.min(energySizedKw, roofLimitKw);
  const band = SIZING_BANDS.find((b) => monthlyUnits <= b.maxUnits)!;

  return {
    energySizedKw,
    roofLimitKw,
    finalKw,
    limitedByRoof: roofLimitKw !== null && roofLimitKw < energySizedKw,
    schemeBand: band.label,
  };
}

export function monthlyGeneration(kw: number): number {
  assertNonNegative(kw, 'kw');
  return kw * UNITS_PER_KW_MONTH;
}

/** docs/RULES.md section 6. Energy charge only, in rupees. */
export function energyChargeRupees(units: number): number {
  assertNonNegative(units, 'units');
  let remaining = units;
  let paise = 0;
  for (const slab of TARIFF_RGP_SLABS) {
    const inSlab = Math.min(remaining, slab.units);
    paise += inSlab * slab.paisePerUnit;
    remaining -= inSlab;
    if (remaining === 0) break;
  }
  return paise / 100;
}

export function calculateYearlySaving(monthlyUnits: number, kw: number): number {
  const remaining = Math.max(monthlyUnits - monthlyGeneration(kw), 0);
  return (energyChargeRupees(monthlyUnits) - energyChargeRupees(remaining)) * 12;
}

/** Simple payback. Null when there is no saving to pay the amount back. */
export function calculatePayback(amountRupees: number, yearlySaving: number): number | null {
  if (yearlySaving <= 0) return null;
  return amountRupees / yearlySaving;
}

/** docs/RULES.md section 9 (stretch). */
export function benchmarkCost(kw: number): number {
  assertNonNegative(kw, 'kw');
  const { first, second } = slabbedKw(kw);
  const beyond = Math.max(kw - CFA_FIRST_SLAB_KW, 0);
  return BENCHMARK_COST.firstSlabPerKw * first + BENCHMARK_COST.secondSlabPerKw * Math.max(second, beyond);
}
