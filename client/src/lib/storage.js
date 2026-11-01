// Two kinds of data live here:
// - The session and marketplace data (requests, quotes) come from the server and stay in memory.
//   The session itself is an HttpOnly cookie, which page scripts cannot read.
// - Prototype extras (catalogue, reviews, install stages, vendor profile) stay in localStorage,
//   because the server has no tables for them. They are not part of the core demo flow.
// Every change notifies subscribers so React components re-render with fresh data.
import { useSyncExternalStore } from 'react';
import { api } from './api.js';

export const KEYS = {
  products: 'solarProducts',
  reviews: 'solarReviews',
  vendors: 'solarVendors',
  stages: 'solarInstallStages',
};

let version = 0;
const listeners = new Set();
function notify() { version++; listeners.forEach(fn => fn()); }
function subscribe(fn) {
  listeners.add(fn);
  const onStorage = () => notify();          // changes from another tab
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(fn); window.removeEventListener('storage', onStorage); };
}

export function read(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
export function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error('Storage write failed', e); }
  notify();
}
export function remove(key) { try { localStorage.removeItem(key); } catch {} notify(); }

/** Re-render the calling component whenever data changes. Returns a version number. */
export function useDB() { return useSyncExternalStore(subscribe, () => version); }

// ---------- server data ----------
const market = { requests: [], quotes: [], loaded: false, error: null };
let latestRefresh = 0;
let session = null;
let authReady = false;

function setSession(user) {
  latestRefresh++;                           // drop any reply meant for the previous account
  Object.assign(market, { requests: [], quotes: [], loaded: false, error: null });
  session = user && { role: user.role, name: user.name, email: user.email, vendorId: user.vendorId, profile: { name: user.name }, loginTime: new Date().toISOString() };
  authReady = true;
  notify();
}

/** Restores the login from the cookie when the app opens. */
export async function restoreSession() {
  try { setSession(await api.me()); }
  catch { setSession(null); }
}
export const signIn = setSession;
export async function signOut() {
  try { await api.logout(); } finally { setSession(null); }
}

/** Reloads requests and quotes. Only notifies when something actually changed. */
export async function refreshMarket() {
  if (!session) return;
  const id = ++latestRefresh;
  try {
    const requests = await api.requests();
    const quotes = (await Promise.all(requests.map(r => api.quotes(r.id)))).flat();
    if (id !== latestRefresh) return;
    const changed = !market.loaded || market.error
      || JSON.stringify([requests, quotes]) !== JSON.stringify([market.requests, market.quotes]);
    Object.assign(market, { requests, quotes, loaded: true, error: null });
    if (changed) notify();
  } catch (err) {
    if (id !== latestRefresh) return;
    if (err.status === 401) return setSession(null);   // session expired
    const changed = market.error !== err.message;
    market.error = err.message;
    if (changed) notify();
  }
}

export const db = {
  loaded: () => market.loaded,
  serverError: () => market.error,
  requests: () => market.requests,
  quotes: () => {
    const stages = read(KEYS.stages, {});
    return market.quotes.map(q => ({ ...q, installStage: stages[q.id]?.stage ?? 0, stageLog: stages[q.id]?.log ?? [] }));
  },
  stages: () => read(KEYS.stages, {}),
  saveStages: v => write(KEYS.stages, v),
  products: () => read(KEYS.products, []),
  saveProducts: v => write(KEYS.products, v),
  reviews: () => read(KEYS.reviews, []),
  saveReviews: v => write(KEYS.reviews, v),
  vendors: () => read(KEYS.vendors, {}),
  saveVendors: v => write(KEYS.vendors, v),
  authReady: () => authReady,
  session: () => session,
  saveSession: v => { session = v; notify(); },
  notifSeen: vendorId => { try { return localStorage.getItem('vendorNotifSeen_' + vendorId) || ''; } catch { return ''; } },
  markNotifSeen: vendorId => { try { localStorage.setItem('vendorNotifSeen_' + vendorId, new Date().toISOString()); } catch {} notify(); },
};
