import { db, refreshMarket } from './storage.js';
import { DEMO_REQUEST_ID, api } from './api.js';
import { normPhone, GSTIN_RE, EMAIL_RE, cityOf, inr, genId } from './utils.js';

export const INSTALL_STAGES = ['Quote accepted', 'Site survey', 'Design & DISCOM approval', 'Installation', 'Net metering & commissioning', 'Completed'];
export const LAST_STAGE = INSTALL_STAGES.length - 1;

export const PRODUCT_CATS = {
  panel:    { label: 'Solar panel',    icon: '🔆', unit: 'W' },
  inverter: { label: 'Inverter',       icon: '🔌', unit: 'kW' },
  battery:  { label: 'Battery',        icon: '🔋', unit: 'kWh' },
  package:  { label: 'System package', icon: '🏠', unit: 'kW' },
  other:    { label: 'Accessory',      icon: '🧰', unit: '' },
};

// ---------- identity ----------
// The demo has no real login. A household sees the seeded demo request plus any it posted in this
// browser, and a vendor signs in as one of the vendors on the server.
export function currentHousehold(session) {
  if (!session || session.role !== 'household') return null;
  return { id: 'demo-household', name: session.name };
}
export function currentVendor(session) {
  if (!session || session.role !== 'vendor') return null;
  const server = db.vendorList().find(x => x.id === session.vendorId);
  if (!server) return null;
  const v = { id: server.id, phone: '', shop: server.name, contactName: server.name, email: '', gst: '', reg: '', area: server.city, years: '', address: '', about: '', ...(db.vendors()[server.id] || {}) };
  v.displayName = server.name;
  return v;
}

// ---------- ownership ----------
export const isMyQuote = (q, v) => !!v && q.vendorId === v.id;
export const acceptedQuoteFor = (reqId, quotes = db.quotes()) => quotes.find(q => q.requestId === reqId && q.status === 'accepted');
export const myRequests = h => {
  if (!h) return [];
  const mine = new Set([DEMO_REQUEST_ID, ...db.myRequestIds()]);
  return db.requests().filter(r => mine.has(r.id));
};

// ---------- verification ----------
export function verificationChecks(v) {
  return [
    { label: 'Mobile number',                  ok: normPhone(v.phone).length === 10 },
    { label: 'Business email',                 ok: EMAIL_RE.test(v.email || '') },
    { label: 'GSTIN (valid format)',           ok: GSTIN_RE.test((v.gst || '').toUpperCase()) },
    { label: 'DISCOM / MNRE registration no.', ok: (v.reg || '').trim().length >= 4 },
    { label: 'Service area',                   ok: !!(v.area || '').trim() },
    { label: 'Business address',               ok: !!(v.address || '').trim() },
  ];
}

// ---------- vendor stats ----------
export function vendorStats(v) {
  const reqs = db.requests(), all = db.quotes();
  const mine = all.filter(q => isMyQuote(q, v));
  const awardedIds = new Set(all.filter(q => q.status === 'accepted').map(q => q.requestId));
  const openReqs = reqs.filter(r => r.status === 'open');
  const notQuoted = openReqs.filter(r => !mine.some(q => q.requestId === r.id));
  const won = mine.filter(q => q.status === 'accepted');
  const pending = mine.filter(q => q.status !== 'accepted' && !awardedIds.has(q.requestId));
  const decided = mine.filter(q => awardedIds.has(q.requestId));
  const active = won.filter(q => (q.installStage || 0) < LAST_STAGE);
  const done = won.filter(q => (q.installStage || 0) >= LAST_STAGE);
  const revs = db.reviews().filter(r => r.vendorId === v.id);
  const avg = revs.length ? revs.reduce((a, r) => a + r.rating, 0) / revs.length : 0;
  return { reqs, openReqs, notQuoted, mine, won, pending, decided, active, done, revs, avg };
}

// ---------- notifications (derived from real events) ----------
export function buildNotifications(v) {
  const reqs = db.requests(), all = db.quotes(), out = [];
  reqs.forEach(r => out.push({ id: 'r' + r.id, at: r.createdAt, icon: '📥', title: 'New solar enquiry',
    text: `${r.monthlyUnits} units a month in ${cityOf(r.addressText)} · budget ${inr(r.budgetRupees)}`, go: 'enquiries' }));
  all.filter(q => isMyQuote(q, v)).forEach(q => {
    const r = reqs.find(x => x.id === q.requestId);
    const who = r ? r.householdName.split(' ')[0] : 'A household';
    if (q.status === 'accepted') {
      out.push({ id: 'a' + q.id, at: q.createdAt, icon: '🏆', title: 'Quote accepted!', text: `${who} accepted your quote of ${inr(q.priceRupees)}. Schedule the site survey.`, go: 'installations' });
    } else if (q.status === 'not_selected') {
      out.push({ id: 'l' + q.id, at: q.createdAt, icon: 'ℹ️', title: 'Enquiry awarded to another vendor', text: `${who}'s request in ${cityOf(r?.addressText)} chose a different quote.`, go: 'enquiries' });
    }
  });
  db.reviews().filter(x => x.vendorId === v.id).forEach(rv => out.push({ id: 'v' + rv.id, at: rv.createdAt, icon: '⭐', title: `New ${rv.rating}-star review`,
    text: rv.comment ? `“${rv.comment.slice(0, 90)}${rv.comment.length > 90 ? '…' : ''}” — ${rv.reviewerName}` : `From ${rv.reviewerName}`, go: 'reviews' }));
  return out.filter(n => n.at).sort((a, b) => new Date(b.at) - new Date(a.at));
}
export function unreadCount(v) {
  const seen = new Date(db.notifSeen(v.id) || 0);
  return buildNotifications(v).filter(n => new Date(n.at) > seen).length;
}

// ---------- actions ----------
/** Accepts on the server, which closes the request. Throws ApiError if it is already closed. */
export async function acceptQuote(qid) {
  await api.acceptQuote(qid);
  await refreshMarket();
}
export function setStage(qid, stage) {
  const all = db.stages();
  const next = Math.max(0, Math.min(LAST_STAGE, stage));
  all[qid] = { stage: next, log: [...(all[qid]?.log || []), { stage: next, at: new Date().toISOString() }] };
  db.saveStages(all);
}

export { genId };
