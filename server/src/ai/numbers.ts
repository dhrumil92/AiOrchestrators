/** Turns Hindi and Gujarati digits into Western digits. Other text is left alone. */
export function normalizeDigits(text: string): string {
  return text.normalize('NFKC').replace(/[०-९૦-૯]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code - (code >= 0x0ae6 ? 0x0ae6 : 0x0966));
  });
}

/** Every number written in digits, with grouping commas removed: "₹1,45,000" gives 145000. */
export function numbersIn(text: string): number[] {
  const matches = normalizeDigits(text).match(/\d+(?:,\d+)*(?:\.\d+)?/g) ?? [];
  return matches.map((match) => Number(match.replaceAll(',', '')));
}

const UNITS: Record<string, number> = {};
const add = (value: number, ...words: string[]) => words.forEach((word) => (UNITS[word] = value));
add(1, 'one', 'ek', 'एक', 'એક');
add(2, 'two', 'do', 'दो', 'બે');
add(3, 'three', 'teen', 'तीन', 'ત્રણ');
add(4, 'four', 'char', 'चार', 'ચાર');
add(5, 'five', 'paanch', 'पांच', 'पाँच', 'પાંચ');
add(6, 'six', 'chhe', 'छह', 'छः', 'छे', 'છ');
add(7, 'seven', 'saat', 'सात', 'સાત');
add(8, 'eight', 'aath', 'आठ', 'આઠ');
add(9, 'nine', 'nau', 'नौ', 'નવ');
add(10, 'ten', 'das', 'दस', 'દસ');
add(20, 'twenty', 'bees', 'बीस', 'વીસ');
add(30, 'thirty', 'tees', 'तीस', 'ત્રીસ');
add(40, 'forty', 'chalis', 'चालीस', 'ચાલીસ');
add(50, 'fifty', 'pachas', 'पचास', 'પચાસ');
add(60, 'sixty', 'saath', 'साठ', 'સાઠ');
add(70, 'seventy', 'sattar', 'सत्तर', 'સિત્તેર');
add(80, 'eighty', 'assi', 'अस्सी', 'એંસી');
add(90, 'ninety', 'nabbe', 'नब्बे', 'નેવું');
add(1.5, 'dedh', 'डेढ', 'ડોઢ', 'દોઢ');
add(2.5, 'dhai', 'adhai', 'ढाई', 'अढाई', 'અઢી');

/** Words that adjust the number after them: "सवा दो लाख" is 2.25 lakh. */
const ADJUST: Record<string, number> = {
  sawa: 0.25,
  सवा: 0.25,
  સવા: 0.25,
  sadhe: 0.5,
  साढे: 0.5,
  સાડા: 0.5,
  paune: -0.25,
  पौने: -0.25,
  પોણા: -0.25,
};

const SCALE: Record<string, number> = {
  hundred: 100,
  sau: 100,
  सौ: 100,
  સો: 100,
  thousand: 1_000,
  hazar: 1_000,
  hajar: 1_000,
  हजार: 1_000,
  હજાર: 1_000,
  lakh: 100_000,
  lakhs: 100_000,
  lac: 100_000,
  lacs: 100_000,
  लाख: 100_000,
  લાખ: 100_000,
  crore: 10_000_000,
  करोड: 10_000_000,
  કરોડ: 10_000_000,
};

const IGNORED = new Set([
  'and',
  'a',
  'rs',
  'rupee',
  'rupees',
  'rupaye',
  'inr',
  'unit',
  'units',
  'kwh',
  'रुपये',
  'रुपए',
  'रूपये',
  'रूपए',
  'रुपया',
  'यूनिट',
  'युनिट',
  'રૂપિયા',
  'રૂપિયો',
  'યુનિટ',
  'યૂનિટ',
]);

function tokens(phrase: string): string[] {
  const text = normalizeDigits(phrase)
    .toLowerCase()
    .replace(/[़઼]/g, '')
    .replace(/(?<=\d),(?=\d)/g, '')
    .replaceAll('₹', ' ')
    .replace(/[,.।](?!\d)/g, ' ')
    .replace(/(\d)(?=\p{L})/gu, '$1 ');
  return text
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) => {
      const joined = token.match(/^(.+?)(सौ|સો)$/u);
      return joined ? [joined[1]!, joined[2]!] : [token];
    });
}

/**
 * Reads a spoken amount in English, Hindi or Gujarati, such as "1.5 lakh", "डेढ़ लाख" or
 * "દોઢ લાખ". Returns null for anything it does not fully understand.
 */
export function parseSpokenNumber(phrase: string): number | null {
  let total = 0;
  let current: number | null = null;
  let adjust = 0;
  let seen = false;

  for (const token of tokens(phrase)) {
    if (IGNORED.has(token)) continue;
    const scale = SCALE[token];
    const word = /^\d+(?:\.\d+)?$/.test(token) ? Number(token) : UNITS[token];

    if (word !== undefined) {
      current = (current ?? 0) + word + adjust;
      adjust = 0;
    } else if (token in ADJUST) {
      adjust = ADJUST[token]!;
    } else if (token === 'half') {
      current = (current ?? 0) + 0.5;
    } else if (scale !== undefined) {
      const base: number = current ?? 1 + adjust;
      adjust = 0;
      if (scale === 100) {
        current = base * 100;
      } else {
        total += base * scale;
        current = null;
      }
    } else {
      return null;
    }
    seen = true;
  }
  return seen ? Math.round(total + (current ?? 0)) : null;
}
