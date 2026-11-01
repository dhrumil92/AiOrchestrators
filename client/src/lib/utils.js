export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const normPhone = p => String(p || '').replace(/\D/g, '').slice(-10);
export const isValidPhone = phone => /^[6-9]\d{9}$/.test(String(phone).replace(/[\s-]/g, '').replace(/^(\+91|0)/, ''));
export const inr = n => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
export const years = n => (n === null || n === undefined ? 'Not available' : `About ${Number(n).toFixed(1)} years`);
export const quoteKw = q => q.systemKw || 0;

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

export const unsplash = (id, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
