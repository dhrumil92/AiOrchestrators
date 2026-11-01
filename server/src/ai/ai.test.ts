import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { Language } from '../../../shared/api.js';
import { createRateLimiter, groqJson, parseModelJson, resetRateLimiters } from './client.js';
import { assessTerracePhoto, explainEstimate, explainRecommendation, transcribeAndExtract } from './index.js';
import type { ComparisonFact, EstimateFacts, RecommendationFacts } from './index.js';
import { numbersIn, parseSpokenNumber } from './numbers.js';
import { allowedNumbers, checkExplanation, findInventedNumber, namesOtherVendor } from './verify.js';

const LANGUAGES: Language[] = ['en', 'hi', 'gu'];

const estimate: EstimateFacts = {
  suggestedKw: 2.5,
  monthlyUnits: 300,
  monthlyGenerationUnits: 300,
  subsidyRupees: 69_000,
  yearlySavingRupees: 14_520,
  limitedByRoof: true,
};

function quote(overrides: Partial<ComparisonFact>): ComparisonFact {
  return {
    quoteId: 'a',
    vendorName: 'Sunrise Rooftop Co.',
    amountYouPayRupees: 76_000,
    paybackYears: 76_000 / 14_520,
    subsidyAtRisk: false,
    missingItems: [],
    recommendable: true,
    score: 96,
    inverterWarrantyYears: 8,
    panelWarrantyYears: 25,
    installDays: 21,
    injectionFlagged: false,
    ...overrides,
  };
}

const recommendation: RecommendationFacts = {
  recommendedQuoteId: 'a',
  quotes: [
    quote({}),
    quote({
      quoteId: 'b',
      vendorName: 'QuickSolar Traders',
      amountYouPayRupees: 125_000,
      recommendable: false,
      subsidyAtRisk: true,
      missingItems: ['made-in-India panel confirmation', 'inverter warranty'],
      inverterWarrantyYears: null,
      score: null,
    }),
    quote({ quoteId: 'c', vendorName: 'BrightPeak Energy', amountYouPayRupees: 91_000, injectionFlagged: true }),
  ],
};

type Reply = { status: number; body?: unknown } | Error;

const asGroq = (content: unknown) => ({
  status: 200,
  body: { choices: [{ message: { content: JSON.stringify(content) } }] },
});
const asGemini = (content: unknown) => ({
  status: 200,
  body: { candidates: [{ content: { parts: [{ text: JSON.stringify(content) }] } }] },
});
const down = { status: 500, body: {} };

/** Queues replies. Anything past the end of the queue is a provider outage. */
function mockFetch(...replies: Reply[]) {
  const mock = vi.fn(async (_url: string, _init: RequestInit) => {
    const reply = replies.shift() ?? down;
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status,
      headers: { 'retry-after': '0' },
    });
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

beforeEach(() => {
  resetRateLimiters();
  vi.stubEnv('GROQ_API_KEY', 'test-groq');
  vi.stubEnv('GEMINI_API_KEY', 'test-gemini');
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('model output schema', () => {
  const schema = z.object({ text: z.string() });

  it('accepts valid JSON, including inside a code fence', () => {
    expect(parseModelJson('```json\n{"text":"hi"}\n```', schema)).toEqual({ ok: true, data: { text: 'hi' } });
  });

  it('rejects wrong shape and non-JSON', () => {
    expect(parseModelJson('{"text":5}', schema)).toMatchObject({ ok: false, reason: 'schema_mismatch' });
    expect(parseModelJson('sorry, no', schema)).toMatchObject({ ok: false, reason: 'not_json' });
  });
});

describe('client', () => {
  const prompt = { system: 's', user: 'u' };
  const schema = z.object({ ok: z.boolean() });

  it('retries a 429 and then succeeds', async () => {
    const fetchMock = mockFetch({ status: 429 }, asGroq({ ok: true }));
    expect(await groqJson(prompt, schema)).toMatchObject({ ok: true, data: { ok: true } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 400', async () => {
    const fetchMock = mockFetch({ status: 400 });
    expect(await groqJson(prompt, schema)).toEqual({ ok: false, reason: 'http_400' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns a failure, not a throw, on a network error', async () => {
    mockFetch(new Error('offline'), new Error('offline'), new Error('offline'));
    expect(await groqJson(prompt, schema)).toEqual({ ok: false, reason: 'network' });
  });

  it('returns a failure without calling out when the key is missing', async () => {
    vi.stubEnv('GROQ_API_KEY', '');
    const fetchMock = mockFetch();
    expect(await groqJson(prompt, schema)).toEqual({ ok: false, reason: 'no_key' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rate limiter queues briefly, then refuses', () => {
    let time = 0;
    const limiter = createRateLimiter(2, 5_000, () => time);
    expect(limiter.reserve()).toBe(0);
    time = 57_000;
    expect(limiter.reserve()).toBe(0);
    expect(limiter.reserve()).toBe(3_000);
    expect(limiter.reserve()).toBeNull();
    time = 120_000;
    expect(limiter.reserve()).toBe(0);
  });
});

describe('number verification', () => {
  const allowed = allowedNumbers({ price: 145_000, years: 5.2, id: 'x', vendor: 'Solar 24' });

  it('reads Indian grouping and Hindi and Gujarati digits', () => {
    expect(numbersIn('₹1,45,000')).toEqual([145_000]);
    expect(numbersIn('₹१,४५,०००')).toEqual([145_000]);
    expect(numbersIn('૫.૨ વર્ષ')).toEqual([5.2]);
  });

  it('accepts numbers from the facts', () => {
    expect(findInventedNumber('₹1,45,000, ५.२ years, Solar 24', allowed)).toBeNull();
  });

  it.each(['₹2,00,000', '₹२,००,०००', '₹૨,૦૦,૦૦૦', 'about 5 years'])('rejects invented %s', (text) => {
    expect(findInventedNumber(text, allowed)).not.toBeNull();
  });

  it('does not treat digits in quote IDs as facts', () => {
    expect(allowedNumbers({ quoteId: '123', recommendedQuoteId: '456' }).size).toBe(0);
  });

  it('rejects number words, jargon and the wrong language', () => {
    expect(checkExplanation('about one lakh', {}, 'en')).toBe('number_in_words');
    expect(checkExplanation('एक लाख', {}, 'hi')).toBe('number_in_words');
    expect(checkExplanation('The CFA is good', {}, 'en')).toBe('jargon');
    expect(checkExplanation('This is in English', {}, 'gu')).toBe('wrong_language');
  });

  it('spots another vendor', () => {
    expect(namesOtherVendor('Choose quicksolar  traders', ['QuickSolar Traders'])).toBe(true);
    expect(namesOtherVendor('Choose Sunrise', ['QuickSolar Traders'])).toBe(false);
  });
});

describe('spoken numbers', () => {
  it.each([
    ['1.5 lakh', 150_000],
    ['डेढ़ लाख', 150_000],
    ['डेढ लाख', 150_000],
    ['ડોઢ લાખ', 150_000],
    ['દોઢ લાખ', 150_000],
    ['ढाई लाख', 250_000],
    ['અઢી લાખ', 250_000],
    ['सवा लाख', 125_000],
    ['सवा दो लाख', 225_000],
    ['साढ़े तीन लाख', 350_000],
    ['પોણા બે લાખ', 175_000],
    ['दो लाख पचास हज़ार', 250_000],
    ['one and a half lakh', 150_000],
    ['1,50,000 रुपये', 150_000],
    ['₹१.५ लाख', 150_000],
    ['तीन सौ यूनिट', 300],
    ['ત્રણસો યુનિટ', 300],
    ['300 units', 300],
    ['૩૦૦', 300],
  ])('%s is %d', (phrase, expected) => {
    expect(parseSpokenNumber(phrase)).toBe(expected);
  });

  it('returns null for words it does not know', () => {
    expect(parseSpokenNumber('around some money')).toBeNull();
    expect(parseSpokenNumber('')).toBeNull();
  });
});

describe('explanations with live output', () => {
  it('uses verified live text', async () => {
    mockFetch(asGroq({ text: 'A 2.5 kW system. Government subsidy: ₹69,000. A site visit is still needed.' }));
    expect(await explainEstimate(estimate, 'en')).toMatchObject({ source: 'live' });
  });

  it('never sends other vendor names to the model', async () => {
    const fetchMock = mockFetch(asGroq({ recommendedQuoteId: 'a', reasons: ['You pay ₹76,000.'] }));
    const result = await explainRecommendation(recommendation, 'en');
    expect(result.source).toBe('live');
    const body = String(fetchMock.mock.calls[0]![1].body);
    expect(body).toContain('Sunrise Rooftop Co.');
    expect(body).not.toContain('QuickSolar');
    expect(body).not.toContain('BrightPeak');
  });

  it('tries Gemini when Groq fails', async () => {
    mockFetch(down, down, asGemini({ text: 'A 2.5 kW system.' }));
    expect(await explainEstimate(estimate, 'en')).toMatchObject({ source: 'live', text: 'A 2.5 kW system.' });
  });

  it('rejects an invented number and falls back to the template', async () => {
    const bad = { text: 'You save ₹99,999.' };
    mockFetch(asGroq(bad), asGemini(bad));
    const result = await explainEstimate(estimate, 'en');
    expect(result.source).toBe('template');
    expect(result.text).not.toContain('99,999');
  });

  it('rejects a changed quote ID', async () => {
    const bad = { recommendedQuoteId: 'c', reasons: ['You pay ₹91,000.'] };
    mockFetch(asGroq(bad), asGemini(bad));
    const result = await explainRecommendation(recommendation, 'en');
    expect(result.source).toBe('template');
    expect(result.reasons[0]).toContain('Sunrise Rooftop Co.');
  });

  it('rejects text that names another vendor', async () => {
    const bad = { recommendedQuoteId: 'a', reasons: ['Pick BrightPeak Energy instead.'] };
    mockFetch(asGroq(bad), asGemini(bad));
    const result = await explainRecommendation(recommendation, 'en');
    expect(result.source).toBe('template');
    expect(result.reasons.join(' ')).not.toContain('BrightPeak');
  });
});

describe.each(LANGUAGES)('explanation fallback in %s', (language) => {
  const script = { en: /[a-z]/i, hi: /\p{Script=Devanagari}/u, gu: /\p{Script=Gujarati}/u }[language];

  it('builds an estimate from facts, with source template', async () => {
    mockFetch();
    const result = await explainEstimate(estimate, language);
    expect(result.source).toBe('template');
    expect(result.text).toMatch(script);
    expect(result.text).toContain('₹69,000');
    expect(result.text).toContain('₹14,520');
    expect(result.text).toContain('2.5 kW');
  });

  it('explains the chosen quote from facts', async () => {
    mockFetch();
    const result = await explainRecommendation(recommendation, language);
    expect(result.source).toBe('template');
    const text = result.reasons.join(' ');
    expect(text).toMatch(script);
    expect(text).toContain('Sunrise Rooftop Co.');
    expect(text).toContain('₹76,000');
    expect(text).toContain('5.2');
    expect(text).not.toContain('5.23');
    expect(text).not.toContain('QuickSolar');
  });

  it('lists what to ask for when nothing is recommended, without calling AI', async () => {
    const fetchMock = mockFetch();
    const result = await explainRecommendation({ ...recommendation, recommendedQuoteId: null }, language);
    expect(result.source).toBe('template');
    expect(fetchMock).not.toHaveBeenCalled();
    const line = result.reasons.find((reason) => reason.includes('QuickSolar Traders'));
    expect(line).toMatch(script);
    if (language !== 'en') expect(line).not.toContain('inverter warranty');
  });

  it('handles no quotes at all', async () => {
    const result = await explainRecommendation({ recommendedQuoteId: null, quotes: [] }, language);
    expect(result).toMatchObject({ source: 'template' });
    expect(result.reasons).toHaveLength(1);
  });
});

describe('voice', () => {
  const extraction = {
    monthlyUnits: 300,
    monthlyUnitsWords: '300 यूनिट',
    budgetRupees: 999,
    budgetWords: 'डेढ़ लाख',
    notes: 'छत पर टंकी है',
  };

  it('returns fields for review, with code reading the spoken amount', async () => {
    mockFetch({ status: 200, body: { text: 'हर महीने 300 यूनिट और बजट डेढ़ लाख है' } }, asGroq(extraction));
    expect(await transcribeAndExtract(Buffer.from('a'), 'a.mp3', 'hi')).toEqual({
      transcript: 'हर महीने 300 यूनिट और बजट डेढ़ लाख है',
      fields: { monthlyUnits: 300, budgetRupees: 150_000, notes: 'छत पर टंकी है' },
      source: 'live',
    });
  });

  it('drops a value whose words were not in the transcript', async () => {
    mockFetch({ status: 200, body: { text: 'मेरा बिल ज़्यादा आता है' } }, asGroq(extraction));
    const result = await transcribeAndExtract(Buffer.from('a'), 'a.mp3', 'hi');
    expect(result.fields).toMatchObject({ monthlyUnits: null, budgetRupees: null });
  });

  it('returns empty template fields when speech fails', async () => {
    mockFetch();
    expect(await transcribeAndExtract(Buffer.from('a'), 'a.mp3', 'gu')).toEqual({
      transcript: '',
      fields: { monthlyUnits: null, budgetRupees: null, notes: null },
      source: 'template',
    });
  });

  it('returns empty template fields when extraction fails the schema', async () => {
    mockFetch({ status: 200, body: { text: 'नमस्ते' } }, asGroq({ monthlyUnits: 'lots' }));
    expect(await transcribeAndExtract(Buffer.from('a'), 'a.mp3', 'hi')).toMatchObject({
      transcript: '',
      source: 'template',
    });
  });
});

describe('terrace review', () => {
  const image = Buffer.from('jpeg');
  const live = {
    obstructions: [{ name: 'water tank', note: 'In the corner.' }],
    summary: 'One water tank.',
    confidence: 'high',
  };

  it('returns a live review with the model name', async () => {
    mockFetch(asGemini(live));
    expect(await assessTerracePhoto(image, 'image/jpeg', 'x.jpg')).toMatchObject({
      source: 'live',
      modelName: expect.any(String),
      obstructions: live.obstructions,
    });
  });

  it('uses the saved review for the demo photo on failure', async () => {
    mockFetch();
    const fixture = JSON.parse(readFileSync(new URL('./fixtures/terrace-demo.json', import.meta.url), 'utf8')) as {
      obstructions: unknown[];
    };
    const result = await assessTerracePhoto(image, 'image/jpeg', 'demo/terrace.jpg');
    expect(result).toMatchObject({ source: 'saved', obstructions: fixture.obstructions });
  });

  it('asks the household to list obstructions for other photos on failure', async () => {
    mockFetch();
    expect(await assessTerracePhoto(image, 'image/jpeg', 'other.jpg')).toMatchObject({
      obstructions: [],
      confidence: 'low',
      source: 'template',
      modelName: null,
    });
  });

  it('rejects output with a measurement', async () => {
    mockFetch(asGemini({ ...live, summary: 'About 20 sq m is free.' }));
    expect(await assessTerracePhoto(image, 'image/jpeg', 'other.jpg')).toMatchObject({ source: 'template' });
  });

  it('rejects output that fails the schema', async () => {
    mockFetch(asGemini({ summary: 'No list' }));
    expect(await assessTerracePhoto(image, 'image/jpeg', 'other.jpg')).toMatchObject({ source: 'template' });
  });
});
