import { useCallback, useEffect, useRef, useState } from 'react';
import { db, useDB } from '../../lib/storage.js';
import { currentVendor, isMyQuote, unreadCount, vendorStats } from '../../lib/domain.js';
import { PRIMARY_VIEWS, VENDOR_VIEWS, viewFromHash } from '../../lib/vendorView.js';
import { useApp } from '../../AppContext.jsx';
import { useToast } from '../ui/Toast.jsx';
import { Badge } from './common.jsx';
import Overview from './Overview.jsx';
import Enquiries from './Enquiries.jsx';
import Installations from './Installations.jsx';
import Products from './Products.jsx';
import Reviews from './Reviews.jsx';
import Notifications from './Notifications.jsx';
import Profile from './Profile.jsx';
import QuoteModal from './QuoteModal.jsx';

const PRIMARY = VENDOR_VIEWS.filter(([id]) => PRIMARY_VIEWS.includes(id));
const MORE = VENDOR_VIEWS.filter(([id]) => !PRIMARY_VIEWS.includes(id));
const PHONE_LABEL = { overview: 'Home', installations: 'Jobs' };

export default function VendorDashboard({ active }) {
  useDB();
  const { session } = useApp();
  const toast = useToast();
  const v = currentVendor(session);
  const [sec, setSec] = useState(() => viewFromHash(window.location.hash));
  const [quoteFor, setQuoteFor] = useState(null);
  const [productForm, setProductForm] = useState(null);
  const [seenAt, setSeenAt] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const current = useRef(sec);

  // Opening Notifications highlights what is new, then marks everything as read.
  const apply = useCallback(name => {
    if (name === 'notifications' && current.current !== 'notifications' && v) { setSeenAt(db.notifSeen(v.id)); db.markNotifSeen(v.id); }
    current.current = name;
    setSec(name);
    setMoreOpen(false);
  }, [v?.id]);

  // The address bar follows the section, so the back button and shared links work.
  useEffect(() => {
    if (!active) return;
    const onHash = () => apply(viewFromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [active, apply]);
  useEffect(() => { if (sec === 'notifications' && v && !seenAt) { setSeenAt(db.notifSeen(v.id)); db.markNotifSeen(v.id); } }, [v?.id]);   // opened straight from a link

  const show = useCallback(name => {
    if (viewFromHash(window.location.hash) !== name) window.location.hash = `/${name}`;
    apply(name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [apply]);

  // Close the "More" sheet on Escape or a click outside it.
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = e => { if (!moreRef.current?.contains(e.target)) setMoreOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [moreOpen]);

  const openQuote = useCallback(reqId => {
    if (db.requests().find(r => r.id === reqId)?.status === 'closed') return toast('This request has already been awarded.', 'info');
    if (db.quotes().some(q => q.requestId === reqId && isMyQuote(q, v))) return toast('You have already sent a quote for this request.', 'info');
    setQuoteFor(reqId);
  }, [toast, v?.id]);
  const closeQuote = useCallback(() => setQuoteFor(null), []);

  if (!v) return null;
  const st = vendorStats(v);
  const counts = { enquiries: st.notQuoted.length, installations: st.active.length, products: db.products().filter(p => p.vendorId === v.id).length,
    reviews: st.revs.length, notifications: unreadCount(v) };
  const initials = v.displayName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'V';
  const moreActive = MORE.some(([id]) => id === sec);
  const moreAlert = counts.notifications > 0;

  return (
    <div className="lg:grid lg:grid-cols-[230px_1fr] gap-6 items-start pb-24 lg:pb-0">
      <aside className="hidden lg:block lg:sticky lg:top-[calc(var(--hdr-h)+16px)]">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-col items-center text-center pb-4 mb-3 border-b border-gray-100">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold" style={{ background: 'linear-gradient(135deg,#16a34a,#ca8a04)' }} aria-hidden="true">{initials}</div>
            <div className="mt-2 font-bold text-gray-900 text-sm leading-tight">{v.displayName}</div>
            <div className="mt-2"><Badge v={v} /></div>
          </div>
          <nav aria-label="Vendor dashboard" className="flex flex-col gap-1">
            {VENDOR_VIEWS.map(([id, icon, label]) => (
              <button key={id} type="button" onClick={() => show(id)} aria-current={sec === id ? 'page' : undefined}
                className={`vnav-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 whitespace-nowrap ${sec === id ? 'active' : ''}`}>
                <span className="text-lg" aria-hidden="true">{icon}</span><span>{label}</span>
                {counts[id] > 0 && <span className={`vnav-count ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${id === 'notifications' ? 'bg-yellow-400 text-gray-900' : 'bg-green-100 text-green-800'}`}>{counts[id]}</span>}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {active && (
        <div ref={moreRef} className="lg:hidden">
          {moreOpen && (
            <div role="menu" aria-label="More sections" className="fixed bottom-[4.5rem] inset-x-3 z-50 bg-white rounded-2xl border border-gray-200 shadow-2xl p-2 fade-in" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
              {MORE.map(([id, icon, label]) => (
                <button key={id} type="button" role="menuitem" onClick={() => show(id)} aria-current={sec === id ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-left ${sec === id ? 'bg-green-50 text-green-800' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <span className="text-lg" aria-hidden="true">{icon}</span><span className="flex-1">{label}</span>
                  {counts[id] > 0 && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${id === 'notifications' ? 'bg-yellow-400 text-gray-900' : 'bg-green-100 text-green-800'}`}>{counts[id]}</span>}
                </button>
              ))}
            </div>
          )}
          <nav aria-label="Vendor dashboard" className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
            {PRIMARY.map(([id, icon, label]) => (
              <button key={id} type="button" onClick={() => show(id)} aria-current={sec === id ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${sec === id ? 'text-green-700' : 'text-gray-500'}`}>
                <span className={`text-xl leading-none px-4 py-1 rounded-full ${sec === id ? 'bg-green-100' : ''}`} aria-hidden="true">{icon}</span>
                {PHONE_LABEL[id] || label}
                {counts[id] > 0 && <span className="absolute top-1.5 left-1/2 ml-3 min-w-4 h-4 px-1 rounded-full bg-yellow-400 text-gray-900 text-[10px] font-bold flex items-center justify-center">{counts[id]}</span>}
              </button>
            ))}
            <button type="button" onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen} aria-haspopup="menu"
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${moreActive || moreOpen ? 'text-green-700' : 'text-gray-500'}`}>
              <span className={`text-xl leading-none px-4 py-1 rounded-full ${moreActive || moreOpen ? 'bg-green-100' : ''}`} aria-hidden="true">⋯</span>
              More
              {moreAlert && <span className="absolute top-2 left-1/2 ml-3 w-2.5 h-2.5 rounded-full bg-yellow-400 ring-2 ring-white" aria-label="Unread notifications" />}
            </button>
          </nav>
        </div>
      )}

      <div className="min-w-0">
        {sec === 'overview' && <Overview v={v} st={st} show={show} addProduct={() => { setProductForm({ nonce: Date.now() }); show('products'); }} />}
        {sec === 'enquiries' && <Enquiries v={v} active={active} onQuote={openQuote} show={show} />}
        {sec === 'installations' && <Installations v={v} show={show} />}
        {sec === 'products' && <Products v={v} form={productForm} setForm={setProductForm} />}
        {sec === 'reviews' && <Reviews v={v} />}
        {sec === 'notifications' && <Notifications v={v} seenAt={seenAt} show={show}
          markAll={() => { db.markNotifSeen(v.id); setSeenAt(db.notifSeen(v.id)); toast('All notifications marked as read', 'info'); }} />}
        {sec === 'profile' && <Profile key={v.id} v={v} />}
      </div>

      {quoteFor && <QuoteModal v={v} requestId={quoteFor} onClose={closeQuote} />}
    </div>
  );
}
