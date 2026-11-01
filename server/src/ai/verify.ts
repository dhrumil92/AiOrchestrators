import type { Language } from '../../../shared/api.js';
import { numbersIn } from './numbers.js';

/** Checks on model text. Each returns a failure reason, or null when the text passes. */

const ID_KEYS = new Set(['quoteId', 'recommendedQuoteId']);
const MAGNITUDE_WORDS = /\b(?:lakhs?|lacs?|crores?|thousands?|millions?)\b|लाख|करोड़|हज़ार|हजार|લાખ|કરોડ|હજાર/i;
const JARGON = /\b(?:CFA|capex|kWp|DCR|net cost|payback period)\b/i;

/** Numbers found anywhere in the facts, including inside text such as a vendor name. Skips IDs. */
export function allowedNumbers(facts: unknown, found: Set<number> = new Set()): Set<number> {
  if (typeof facts === 'number') found.add(facts);
  else if (typeof facts === 'string') numbersIn(facts).forEach((value) => found.add(value));
  else if (Array.isArray(facts)) facts.forEach((item) => allowedNumbers(item, found));
  else if (facts && typeof facts === 'object') {
    for (const [key, value] of Object.entries(facts)) {
      if (!ID_KEYS.has(key)) allowedNumbers(value, found);
    }
  }
  return found;
}

export function findInventedNumber(text: string, allowed: Set<number>): number | null {
  return numbersIn(text).find((value) => !allowed.has(value)) ?? null;
}

function hasRightScript(text: string, language: Language): boolean {
  if (language === 'en') return true;
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  const script = language === 'hi' ? /\p{Script=Devanagari}/gu : /\p{Script=Gujarati}/gu;
  return (text.match(script)?.length ?? 0) * 2 >= letters;
}

export function checkExplanation(text: string, facts: unknown, language: Language): string | null {
  if (findInventedNumber(text, allowedNumbers(facts)) !== null) return 'invented_number';
  if (MAGNITUDE_WORDS.test(text)) return 'number_in_words';
  if (JARGON.test(text)) return 'jargon';
  if (!hasRightScript(text, language)) return 'wrong_language';
  return null;
}

const squeeze = (text: string) => text.toLowerCase().replace(/[\s.,'-]+/g, '');

/** Other vendors must not appear at all: the model has no reason to name one. */
export function namesOtherVendor(text: string, otherVendorNames: readonly string[]): boolean {
  const squeezed = squeeze(text);
  return otherVendorNames.some((name) => name.trim() !== '' && squeezed.includes(squeeze(name)));
}
