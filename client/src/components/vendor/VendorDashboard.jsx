import { useCallback, useState } from 'react';
import { db, useDB } from '../../lib/storage.js';
import { currentVendor, isMyQuote, unreadCount, vendorStats } from '../../lib/domain.js';
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

const NAV = [['overview', '📊', 'Dashboard'], ['enquiries', '📥', 'Enquiries'], ['installations', '🛠️', 'Installations'], ['products', '📦', 'Products'],
  ['reviews', '⭐', 'Reviews'], ['notifications', '🔔', 'Notifications'], ['profile', '🏢', 'Profile']];

export default function VendorDashboard({ active }) {
  useDB();
  const { session } = useApp();
  const toast = useToast();
  const v = currentVendor(session);
  const [sec, setSec] = useState('overview');
  const [quoteFor, setQuoteFor] = useState(null);
  const [productForm, setProductForm] = useState(null);
  const [seenAt, setSeenAt] = useState('');

  const show = useCallback(name => {
    if (name === 'notifications' && v) { setSeenAt(db.notifSeen(v.id)); db.markNotifSeen(v.id); }   // highlight now, then mark seen
    setSec(name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [v?.id]);

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

  return (
    <div className="lg:grid lg:grid-cols-[230px_1fr] gap-6 items-start">
      <aside className="lg:sticky lg:top-[calc(var(--hdr-h)+16px)] mb-5 lg:mb-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 lg:p-4">
          <div className="hidden lg:flex flex-col items-center text-center pb-4 mb-3 border-b border-gray-100">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold" style={{ background: 'linear-gradient(135deg,#16a34a,#ca8a04)' }} aria-hidden="true">{initials}</div>
            <div className="mt-2 font-bold text-gray-900 text-sm leading-tight">{v.displayName}</div>
            <div className="mt-2"><Badge v={v} /></div>
          </div>
          <nav aria-label="Vendor dashboard" className="vsidebar-scroll flex lg:flex-col gap-1 overflow-x-auto">
            {NAV.map(([id, icon, label]) => (
              <button key={id} onClick={() => show(id)} aria-current={sec === id ? 'page' : undefined}
                className={`vnav-btn shrink-0 lg:w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 whitespace-nowrap ${sec === id ? 'active' : ''}`}>
                <span className="text-lg" aria-hidden="true">{icon}</span><span>{label}</span>
                {counts[id] > 0 && <span className={`vnav-count ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${id === 'notifications' ? 'bg-yellow-400 text-gray-900' : 'bg-green-100 text-green-800'}`}>{counts[id]}</span>}
              </button>
            ))}
          </nav>
          <div className="hidden lg:block mt-4 rounded-xl p-3 text-xs text-green-900 border border-green-100" style={{ background: 'linear-gradient(135deg,#f0fdf4,#fefce8)' }}>
            <div className="font-bold mb-1">☀️ Tip</div>Quote quickly — households compare offers side by side with AI.
          </div>
        </div>
      </aside>

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
