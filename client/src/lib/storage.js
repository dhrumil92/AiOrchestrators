// The app's "database" is the browser's localStorage (no backend).
// Same keys as the original single-file app. Every write notifies subscribers
// so React components re-render with fresh data.
import { useSyncExternalStore } from 'react';

export const KEYS = {
  requests: 'solarRequests',
  quotes: 'solarQuotes',
  products: 'solarProducts',
  reviews: 'solarReviews',
  vendors: 'solarVendors',
  accounts: 'solarAccounts',
  session: 'solarSession',
  apiKey: 'geminiApiKey',
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

/** Re-render the calling component whenever stored data changes. */
export function useDB() { return useSyncExternalStore(subscribe, () => version); }

export const db = {
  requests: () => read(KEYS.requests, []),
  saveRequests: v => write(KEYS.requests, v),
  quotes: () => read(KEYS.quotes, []),
  saveQuotes: v => write(KEYS.quotes, v),
  products: () => read(KEYS.products, []),
  saveProducts: v => write(KEYS.products, v),
  reviews: () => read(KEYS.reviews, []),
  saveReviews: v => write(KEYS.reviews, v),
  vendors: () => read(KEYS.vendors, {}),
  saveVendors: v => write(KEYS.vendors, v),
  accounts: () => read(KEYS.accounts, {}),
  saveAccounts: v => write(KEYS.accounts, v),
  session: () => read(KEYS.session, null),
  saveSession: v => write(KEYS.session, v),
  clearSession: () => remove(KEYS.session),
  apiKey: () => { try { return localStorage.getItem(KEYS.apiKey) || ''; } catch { return ''; } },
  saveApiKey: k => { try { localStorage.setItem(KEYS.apiKey, k); } catch {} notify(); },
  notifSeen: vendorId => { try { return localStorage.getItem('vendorNotifSeen_' + vendorId) || ''; } catch { return ''; } },
  markNotifSeen: vendorId => { try { localStorage.setItem('vendorNotifSeen_' + vendorId, new Date().toISOString()); } catch {} notify(); },
};
