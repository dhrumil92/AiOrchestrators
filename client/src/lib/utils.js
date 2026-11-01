export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const normPhone = p => String(p || '').replace(/\D/g, '').slice(-10);
export const isValidPhone = phone => /^[6-9]\d{9}$/.test(String(phone).replace(/[\s-]/g, '').replace(/^(\+91|0)/, ''));
export const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
export const quoteKw = q => (q.panelWatts * q.numPanels) / 1000 || 0;

export function estimateKw(monthlyBill) {
  const kw = monthlyBill / 8 / 120;      // ₹8/unit, ~120 units per kW per month
  return Math.max(1, Math.min(10, Number(kw.toFixed(1))));
}

/** PM Surya Ghar central subsidy for a system size in kW. */
export function subsidyFor(kw) {
  const k = Math.ceil(kw);
  if (k >= 3) return 78000;
  return k === 2 ? 60000 : 30000;
}

export function timeAgo(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  return d < 30 ? d + 'd ago' : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function cityOf(address) {
  const parts = String(address || '').split(',').map(x => x.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) if (!/\d/.test(parts[i])) return parts[i];
  return parts[0] || 'your area';
}

export const maskName = name => String(name || '').split(' ').map(w => w[0] + '*'.repeat(Math.max(0, w.length - 1))).join(' ');

export async function hashPin(id, pin) {
  const data = new TextEncoder().encode(id + ':' + pin + ':surya-ghar');
  if (window.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 2166136261;
  for (const b of data) { h ^= b; h = Math.imul(h, 16777619) >>> 0; }
  return 'f' + h.toString(16);
}

export const unsplash = (id, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
