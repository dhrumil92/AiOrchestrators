import 'dotenv/config';
import { z } from 'zod';

/**
 * The only place that talks to AI providers. Adds timeouts, limited retries, a per-provider rate
 * limit and schema checks. Provider problems come back as `{ ok: false }`, never as a throw, so
 * callers can always fall back. Keys are read from process.env and are never logged.
 */

export type AiResult<T> = { ok: true; data: T; model: string } | { ok: false; reason: string };
export type Provider = 'gemini' | 'groq';

export const DEFAULT_MODELS = {
  gemini: 'gemini-2.5-flash',
  groqText: 'qwen/qwen3.8-27b',
  groqWhisper: 'whisper-large-v3',
} as const;

const GROQ_URL = 'https://api.groq.com/openai/v1';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta';

const BASE_BACKOFF_MS = 500;
const MAX_LIMITER_WAIT_MS = 5_000;

export const geminiModel = () => process.env.GEMINI_MODEL || DEFAULT_MODELS.gemini;
export const groqTextModel = () => process.env.GROQ_TEXT_MODEL || DEFAULT_MODELS.groqText;
export const groqWhisperModel = () => process.env.GROQ_WHISPER_MODEL || DEFAULT_MODELS.groqWhisper;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Rolling one-minute window. `reserve` returns how long to wait before sending, or null when the
 * wait would be too long and the caller should fall back rather than hold up the screen.
 */
export function createRateLimiter(maxPerMinute: number, maxWaitMs: number, now: () => number = Date.now) {
  let slots: number[] = [];
  return {
    reserve(): number | null {
      const time = now();
      slots = slots.filter((slot) => slot > time - 60_000);
      const start = slots.length < maxPerMinute ? time : slots[slots.length - maxPerMinute]! + 60_000;
      const wait = start - time;
      if (wait > maxWaitMs) return null;
      slots.push(start);
      return wait;
    },
    reset() {
      slots = [];
    },
  };
}

const limiters = {
  gemini: createRateLimiter(10, MAX_LIMITER_WAIT_MS),
  groq: createRateLimiter(25, MAX_LIMITER_WAIT_MS),
};

export function resetRateLimiters() {
  limiters.gemini.reset();
  limiters.groq.reset();
}

interface SendOptions {
  /** Limit for one attempt. */
  timeoutMs: number;
  /** Limit across all attempts, including waiting. */
  deadlineMs: number;
  retries: number;
}

type SendResult = { ok: true; body: string } | { ok: false; reason: string };

function retryDelay(response: Response | null, attempt: number) {
  const header = response?.headers.get('retry-after');
  const seconds = header === null || header === undefined ? Number.NaN : Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  return BASE_BACKOFF_MS * 2 ** attempt + Math.random() * 100;
}

async function send(provider: Provider, url: string, init: RequestInit, options: SendOptions): Promise<SendResult> {
  const deadline = Date.now() + options.deadlineMs;
  let reason = 'not_sent';

  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    const wait = limiters[provider].reserve();
    if (wait === null) return { ok: false, reason: 'rate_limited_locally' };
    if (wait > 0) await sleep(wait);

    const remaining = deadline - Date.now();
    if (remaining <= 0) return { ok: false, reason: 'deadline' };

    let response: Response | null = null;
    try {
      const signal = AbortSignal.timeout(Math.min(options.timeoutMs, remaining));
      response = await fetch(url, { ...init, signal });
      const body = await response.text();
      if (response.ok) return { ok: true, body };
      reason = `http_${response.status}`;
      if (response.status !== 429 && response.status < 500) return { ok: false, reason };
    } catch (error) {
      reason = error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'network';
    }

    if (attempt < options.retries) {
      const delay = retryDelay(response, attempt);
      if (Date.now() + delay >= deadline) return { ok: false, reason };
      await sleep(delay);
    }
  }
  return { ok: false, reason };
}

/** Parses model output as JSON and checks it against a schema. Tolerates code fences. */
export function parseModelJson<T>(
  text: string,
  schema: z.ZodType<T>,
): { ok: true; data: T } | { ok: false; reason: string } {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return { ok: false, reason: 'not_json' };
  let value: unknown;
  try {
    value = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { ok: false, reason: 'not_json' };
  }
  const parsed = schema.safeParse(value);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, reason: 'schema_mismatch' };
}

function failed(provider: Provider, operation: string, reason: string): { ok: false; reason: string } {
  console.warn(`[ai] ${provider} ${operation} failed: ${reason}`);
  return { ok: false, reason };
}

const groqChatEnvelope = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullish() }) })).min(1),
});
const groqTranscriptEnvelope = z.object({ text: z.string() });
const geminiEnvelope = z.object({
  candidates: z
    .array(z.object({ content: z.object({ parts: z.array(z.object({ text: z.string().optional() })) }) }))
    .min(1),
});

function readEnvelope<T>(body: string, schema: z.ZodType<T>): T | null {
  try {
    const parsed = schema.safeParse(JSON.parse(body));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export interface TextPrompt {
  system: string;
  user: string;
}

export async function groqJson<T>(prompt: TextPrompt, schema: z.ZodType<T>): Promise<AiResult<T>> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return failed('groq', 'text', 'no_key');
  const model = groqTextModel();

  const sent = await send(
    'groq',
    `${GROQ_URL}/chat/completions`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_completion_tokens: 800,
      }),
    },
    { timeoutMs: 12_000, deadlineMs: 20_000, retries: 1 },
  );
  if (!sent.ok) return failed('groq', 'text', sent.reason);

  const content = readEnvelope(sent.body, groqChatEnvelope)?.choices[0]?.message.content;
  if (!content) return failed('groq', 'text', 'empty_response');
  const parsed = parseModelJson(content, schema);
  return parsed.ok ? { ok: true, data: parsed.data, model } : failed('groq', 'text', parsed.reason);
}

export async function groqTranscribe(audio: Buffer, filename: string, language: string): Promise<AiResult<string>> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return failed('groq', 'transcribe', 'no_key');
  const model = groqWhisperModel();

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)]), filename);
  form.append('model', model);
  form.append('language', language);
  form.append('temperature', '0');
  form.append('response_format', 'json');

  const sent = await send(
    'groq',
    `${GROQ_URL}/audio/transcriptions`,
    { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: form },
    { timeoutMs: 30_000, deadlineMs: 40_000, retries: 1 },
  );
  if (!sent.ok) return failed('groq', 'transcribe', sent.reason);

  const text = readEnvelope(sent.body, groqTranscriptEnvelope)?.text.trim();
  if (!text) return failed('groq', 'transcribe', 'empty_transcript');
  return { ok: true, data: text, model };
}

export interface GeminiImage {
  data: Buffer;
  contentType: string;
}

export async function geminiJson<T>(
  prompt: TextPrompt,
  schema: z.ZodType<T>,
  image?: GeminiImage,
): Promise<AiResult<T>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return failed('gemini', 'generate', 'no_key');
  const model = geminiModel();

  const parts: unknown[] = [{ text: prompt.user }];
  if (image) parts.push({ inline_data: { mime_type: image.contentType, data: image.data.toString('base64') } });

  const sent = await send(
    'gemini',
    `${GEMINI_URL}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      // The key stays in a header so it cannot end up in a logged URL.
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: prompt.system }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    },
    { timeoutMs: 25_000, deadlineMs: 45_000, retries: 2 },
  );
  if (!sent.ok) return failed('gemini', 'generate', sent.reason);

  const text = readEnvelope(sent.body, geminiEnvelope)
    ?.candidates[0]?.content.parts.map((part) => part.text ?? '')
    .join('');
  if (!text) return failed('gemini', 'generate', 'empty_response');
  const parsed = parseModelJson(text, schema);
  return parsed.ok ? { ok: true, data: parsed.data, model } : failed('gemini', 'generate', parsed.reason);
}
