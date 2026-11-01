// All server calls. Types for every request and response are in shared/api.ts.
export { DEMO_REQUEST_ID } from '../../../shared/api.ts';

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function call(path, options) {
  let res;
  try {
    res = await fetch('/api' + path, options);
  } catch {
    throw new ApiError('Cannot reach the server. Is it running on port 4000?', 'NETWORK', 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body?.error?.message || `Server error (${res.status})`, body?.error?.code || 'SERVER', res.status);
  return body;
}

const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const form = fields => {
  const data = new FormData();
  Object.entries(fields).forEach(([k, v]) => (Array.isArray(v) ? data.append(k, ...v) : data.append(k, v)));
  return { method: 'POST', body: data };
};

export const api = {
  health: () => call('/health'),
  rules: () => call('/rules'),
  calculator: (kw, monthlyUnits) => call(`/calculator?kw=${kw}&monthlyUnits=${monthlyUnits}`),
  vendors: () => call('/vendors'),
  requests: () => call('/requests'),
  request: id => call(`/requests/${id}`),
  createRequest: body => call('/requests', json('POST', body)),
  updateRequest: (id, body) => call(`/requests/${id}`, json('PATCH', body)),
  uploadPhoto: (id, file) => call(`/requests/${id}/photo`, form({ photo: file })),
  assessPhoto: id => call(`/requests/${id}/assessment`, { method: 'POST' }),
  estimate: id => call(`/requests/${id}/estimate`),
  quotes: id => call(`/requests/${id}/quotes`),
  createQuote: (id, body) => call(`/requests/${id}/quotes`, json('POST', body)),
  comparison: id => call(`/requests/${id}/comparison`),
  acceptQuote: id => call(`/quotes/${id}/accept`, { method: 'POST' }),
  transcribe: (blob, language) => call('/voice/transcribe', form({ language, audio: [blob, blob.type.includes('mp4') ? 'voice.mp4' : 'voice.webm'] })),
};
