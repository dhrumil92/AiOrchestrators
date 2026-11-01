import { INSTALL_STAGES, buildNotifications } from '../../lib/domain.js';
import { inr, quoteKw } from '../../lib/utils.js';
import { Badge, NotifItem } from './common.jsx';

function HouseArt() {
  return (
    <svg viewBox="0 0 220 160" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="vpanel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2563eb" /><stop offset="1" stopColor="#1e3a8a" /></linearGradient>
        <linearGradient id="vsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fefce8" /><stop offset="1" stopColor="#ecfdf5" /></linearGradient>
      </defs>
      <rect x="0" y="0" width="220" height="160" rx="18" fill="url(#vsky)" />
      <g className="sun-spin" style={{ transformOrigin: '178px 34px' }}>
        <g stroke="#facc15" strokeWidth="3" strokeLinecap="round"><line x1="178" y1="6" x2="178" y2="14" /><line x1="178" y1="54" x2="178" y2="62" /><line x1="150" y1="34" x2="158" y2="34" /><line x1="198" y1="34" x2="206" y2="34" /><line x1="158" y1="14" x2="164" y2="20" /><line x1="192" y1="48" x2="198" y2="54" /><line x1="158" y1="54" x2="164" y2="48" /><line x1="192" y1="20" x2="198" y2="14" /></g>
      </g>
      <circle cx="178" cy="34" r="14" fill="#facc15" />
      <path d="M150 50 L132 70" stroke="#fde047" strokeWidth="2" strokeDasharray="3 4" />
      <rect x="0" y="138" width="220" height="22" fill="#bbf7d0" /><rect x="0" y="138" width="220" height="4" fill="#86efac" />
      <rect x="44" y="86" width="112" height="54" fill="#ffffff" stroke="#d1d5db" />
      <polygon points="30,88 62,48 138,48 170,88" fill="#e5e7eb" stroke="#9ca3af" />
      <polygon points="52,82 74,54 126,54 148,82" fill="url(#vpanel)" stroke="#1e3a8a" />
      <g stroke="#93c5fd" strokeWidth="1" opacity=".8"><line x1="87" y1="54" x2="76" y2="82" /><line x1="100" y1="54" x2="100" y2="82" /><line x1="113" y1="54" x2="124" y2="82" /><line x1="63" y1="68" x2="137" y2="68" /></g>
      <rect x="90" y="108" width="20" height="32" rx="2" fill="#16a34a" />
      <rect x="56" y="98" width="22" height="18" rx="2" fill="#fef9c3" stroke="#eab308" /><rect x="122" y="98" width="22" height="18" rx="2" fill="#fef9c3" stroke="#eab308" />
      <rect x="22" y="112" width="4" height="26" fill="#a16207" />
      <circle cx="24" cy="106" r="12" fill="#22c55e" /><circle cx="16" cy="114" r="8" fill="#16a34a" />
      <path d="M188 104 l-8 14 h7 l-3 12 l10 -16 h-7 z" fill="#eab308" />
    </svg>
  );
}

function Stat({ icon, yellow, value, label, sub, onClick }) {
  return (
    <button onClick={onClick} className="vstat vcard text-left bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${yellow ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`} aria-hidden="true">{icon}</div>
      <div className="mt-4 text-3xl font-extrabold text-gray-900 tabular-nums">{value}</div>
      <div className="text-sm font-semibold text-gray-700 mt-1">{label}</div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
    </button>
  );
}

export default function Overview({ v, st, show, addProduct }) {
  const wonValue = st.won.reduce((a, q) => a + (q.price || 0), 0);
  const kw = st.done.reduce((a, q) => a + quoteKw(q), 0);
  const notifs = buildNotifications(v).slice(0, 5);
  const counts = INSTALL_STAGES.map((_, i) => st.won.filter(q => (q.installStage || 0) === i).length);
  const max = Math.max(1, ...counts);
  const parts = [];
  if (st.notQuoted.length) parts.push(<span key="a"><strong className="text-green-700">{st.notQuoted.length}</strong> new enquir{st.notQuoted.length > 1 ? 'ies' : 'y'} waiting for your quote</span>);
  if (st.active.length) parts.push(<span key="b"><strong className="text-green-700">{st.active.length}</strong> installation{st.active.length > 1 ? 's' : ''} in progress</span>);

  return (
    <section className="vsec space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-green-100 shadow-sm" style={{ background: 'radial-gradient(circle at 10% 10%,rgba(250,204,21,.18),transparent 45%),linear-gradient(135deg,#ffffff,#f0fdf4 60%,#fefce8)' }}>
        <div className="grid md:grid-cols-[1fr_260px] gap-6 p-6 sm:p-8 items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-widest text-green-700">Vendor dashboard</span><Badge v={v} /></div>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Welcome back, <span className="grad-text">{(v.contactName || v.displayName).split(' ')[0]}</span> 👋</h2>
            <p className="mt-1 text-gray-600 font-medium">{v.shop ? '🏪 ' + v.shop + (v.area ? ' · ' + v.area : '') : (v.area ? '📍 ' + v.area : '')}</p>
            <p className="mt-3 text-gray-600 max-w-xl">
              {parts.length ? <>You have {parts.length === 2 ? <>{parts[0]} and {parts[1]}</> : parts[0]}.</> : 'You are all caught up. New household enquiries will show up here.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => show('enquiries')} className="cta-primary whitespace-nowrap rounded-xl text-white font-bold px-6 py-3">View enquiries <span className="arrow">→</span></button>
              <button onClick={addProduct} className="whitespace-nowrap rounded-xl font-bold px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-900 shadow-sm transition hover:-translate-y-0.5">＋ Add product</button>
            </div>
          </div>
          <div className="hidden md:block h-48"><HouseArt /></div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <Stat icon="📥" value={st.openReqs.length} label="Open enquiries" onClick={() => show('enquiries')} sub={st.notQuoted.length ? `${st.notQuoted.length} not quoted by you yet` : 'You have quoted on all open requests'} />
        <Stat icon="📝" yellow value={st.mine.length} label="Quotes sent" onClick={() => show('enquiries')} sub={st.pending.length ? `${st.pending.length} awaiting customer decision` : 'None awaiting a decision'} />
        <Stat icon="🏆" value={st.won.length} label="Jobs won" onClick={() => show('installations')} sub={st.decided.length ? `${inr(wonValue)} · ${Math.round(st.won.length / st.decided.length * 100)}% win rate` : 'No customer decisions yet'} />
        <Stat icon="🛠️" yellow value={st.active.length} label="Active installations" onClick={() => show('installations')} sub={st.active.length ? 'Currently in progress' : 'No jobs in progress'} />
        <Stat icon="✅" value={st.done.length} label="Completed installs" onClick={() => show('installations')} sub={st.done.length ? `${kw.toFixed(1)} kW installed in total` : 'None completed yet'} />
        <Stat icon="⭐" yellow value={st.revs.length ? st.avg.toFixed(1) : '—'} label="Average rating" onClick={() => show('reviews')} sub={st.revs.length ? `from ${st.revs.length} review${st.revs.length > 1 ? 's' : ''}` : 'No reviews yet'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-900">🔔 Recent activity</h3><button onClick={() => show('notifications')} className="text-sm font-semibold text-green-700 hover:text-green-800">View all →</button></div>
          <div className="space-y-3">
            {notifs.length ? notifs.map(n => <NotifItem key={n.id} n={n} compact onGo={show} />) : <p className="text-sm text-gray-500 py-6 text-center">No activity yet.</p>}
          </div>
        </div>
        <div className="min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-900">🛠️ Installation pipeline</h3><button onClick={() => show('installations')} className="text-sm font-semibold text-green-700 hover:text-green-800">Manage →</button></div>
          <div className="space-y-3">
            {st.won.length ? INSTALL_STAGES.map((name, i) => (
              <div key={name} className="grid grid-cols-[minmax(0,150px)_1fr_28px] items-center gap-3 text-sm" title={`${name}: ${counts[i]} job${counts[i] !== 1 ? 's' : ''}`}>
                <span className="text-gray-600 truncate">{name}</span>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-green-600 transition-all duration-700" style={{ width: counts[i] / max * 100 + '%' }} /></div>
                <span className="text-right font-semibold text-gray-800 tabular-nums">{counts[i]}</span>
              </div>
            )) : <p className="text-sm text-gray-500 py-6 text-center">No accepted jobs yet. Installations show up here once a household accepts your quote.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
