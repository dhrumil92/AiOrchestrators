import { db } from './storage.js';
import { normPhone, GSTIN_RE, EMAIL_RE, estimateKw, cityOf, inr, genId } from './utils.js';

export const INSTALL_STAGES = ['Quote accepted', 'Site survey', 'Design & DISCOM approval', 'Installation', 'Net metering & commissioning', 'Completed'];
export const LAST_STAGE = INSTALL_STAGES.length - 1;

export const PRODUCT_CATS = {
  panel:    { label: 'Solar panel',    icon: '🔆', unit: 'W' },
  inverter: { label: 'Inverter',       icon: '🔌', unit: 'kW' },
  battery:  { label: 'Battery',        icon: '🔋', unit: 'kWh' },
  package:  { label: 'System package', icon: '🏠', unit: 'kW' },
  other:    { label: 'Accessory',      icon: '🧰', unit: '' },
};

export const vendorIdFromPhone = p => 'v_' + normPhone(p);
export const householdIdFromPhone = p => 'h_' + normPhone(p);

// ---------- identity ----------
export function currentHousehold(session) {
  if (!session || session.role !== 'household') return null;
  const phone = session.profile?.phone || '';
  return { id: householdIdFromPhone(phone), phone, name: session.name };
}
export function currentVendor(session) {
  if (!session || session.role !== 'vendor') return null;
  const p = session.profile || {};
  const id = vendorIdFromPhone(p.phone);
  const v = { id, phone: p.phone || '', shop: p.shop || '', contactName: p.contactName || session.name || '',
    email: '', gst: '', reg: '', area: '', years: '', address: '', about: '', ...(db.vendors()[id] || {}) };
  v.displayName = v.shop || v.contactName || 'Vendor';
  return v;
}

// ---------- ownership ----------
export const quoteVendorId = q => q.vendorId || vendorIdFromPhone(q.vendorPhone);
export const isMyQuote = (q, v) => !!v && quoteVendorId(q) === v.id;
export const acceptedQuoteFor = (reqId, quotes = db.quotes()) => quotes.find(q => q.requestId === reqId && q.status === 'accepted');
export function isMyRequest(req, h) {
  if (!h || !req) return false;
  return req.householdId ? req.householdId === h.id : normPhone(req.phone) === normPhone(h.phone);
}
export const myRequests = h => (h ? db.requests().filter(r => isMyRequest(r, h)) : []);

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
  const openReqs = reqs.filter(r => !awardedIds.has(r.id));
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
    text: `~${estimateKw(r.monthlyBill)} kW system in ${cityOf(r.address)} · bill ${inr(r.monthlyBill)}/mo`, go: 'enquiries' }));
  all.filter(q => isMyQuote(q, v)).forEach(q => {
    const r = reqs.find(x => x.id === q.requestId);
    const who = r ? r.name.split(' ')[0] : 'A household';
    if (q.status === 'accepted' && q.acceptedAt) {
      out.push({ id: 'a' + q.id, at: q.acceptedAt, icon: '🏆', title: 'Quote accepted!', text: `${who} accepted your quote of ${inr(q.price)}. Schedule the site survey.`, go: 'installations' });
    } else {
      const acc = all.find(x => x.requestId === q.requestId && x.status === 'accepted');
      if (acc?.acceptedAt) out.push({ id: 'l' + q.id, at: acc.acceptedAt, icon: 'ℹ️', title: 'Enquiry awarded to another vendor', text: `${who}'s request in ${cityOf(r?.address)} chose a different quote.`, go: 'enquiries' });
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
export function acceptQuote(qid) {
  const all = db.quotes();
  const q = all.find(x => x.id === qid);
  if (!q || all.some(x => x.requestId === q.requestId && x.status === 'accepted')) return false;
  const now = new Date().toISOString();
  Object.assign(q, { status: 'accepted', acceptedAt: now, installStage: 0, stageLog: [{ stage: 0, at: now }] });
  all.forEach(x => { if (x.requestId === q.requestId && x.id !== q.id) x.status = 'declined'; });
  db.saveQuotes(all);
  const reqs = db.requests();
  const r = reqs.find(x => x.id === q.requestId);
  if (r) { r.status = 'awarded'; r.acceptedQuoteId = q.id; db.saveRequests(reqs); }
  return true;
}
export function setStage(qid, stage) {
  const all = db.quotes();
  const q = all.find(x => x.id === qid);
  if (!q) return;
  q.installStage = Math.max(0, Math.min(LAST_STAGE, stage));
  q.stageLog = (q.stageLog || []).concat({ stage: q.installStage, at: new Date().toISOString() });
  db.saveQuotes(all);
}

// ---------- demo data (testing only) ----------
export function loadSampleData(session) {
  const hh = currentHousehold(session);
  const day = 86400000;
  const req1 = { id: 'demo001', name: 'Rajesh Sharma', phone: '9876543210', address: '12 MG Road, Koramangala, Bangalore, Karnataka 560034',
    lat: 12.9352, lng: 77.6245, monthlyBill: 3200, budget: 250000, roofArea: 600, photo: null, createdAt: new Date(Date.now() - day * 2).toISOString(), status: 'open' };
  const req2 = { id: 'demo002', name: 'Priya Patel', phone: '9123456789', address: '45 Satellite Road, Ahmedabad, Gujarat 380015',
    lat: 23.0225, lng: 72.5714, monthlyBill: 1800, budget: 150000, roofArea: 350, photo: null, createdAt: new Date(Date.now() - day).toISOString(), status: 'open' };
  if (hh) { req1.householdId = hh.id; req2.householdId = hh.id; }   // a household sees the samples as its own
  const q = (id, requestId, vendorName, vendorPhone, price, panelBrand, panelWatts, numPanels, inverterBrand, timeline, notes, ago) =>
    ({ id, requestId, vendorName, vendorPhone, price, panelBrand, panelWatts, numPanels, inverterBrand, inverterType: 'On-grid', warranty: 25, timeline, notes, createdAt: new Date(Date.now() - ago).toISOString() });
  const quotes = [
    q('q001', 'demo001', 'SunPower Solutions', '9900112233', 210000, 'Waaree', 540, 6, 'Havells', '3 weeks', 'DCR compliant panels. Includes net metering paperwork assistance.', 43200000),
    q('q002', 'demo001', 'GreenEarth Solar', '9811223344', 185000, 'Adani Solar', 500, 6, 'Growatt', '2 weeks', 'Budget-friendly option. Same quality output.', 21600000),
    q('q003', 'demo002', 'Solar India Pvt Ltd', '9988776655', 125000, 'Vikram Solar', 440, 4, 'Solis', '10 days', 'Fast installation. State-authorized installer.', 7200000),
  ];
  const reqs = db.requests(), qs = db.quotes();
  if (!reqs.find(r => r.id === 'demo001')) db.saveRequests([...reqs, req1, req2]);
  if (!qs.find(x => x.id === 'q001')) db.saveQuotes([...qs, ...quotes]);
}

export { genId };
