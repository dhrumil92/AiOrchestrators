import { INSTALL_STAGES, buildNotifications, unreadCount, verificationChecks } from '../../lib/domain.js';
import { attentionItems, winRate } from '../../lib/vendorView.js';
import { inr, quoteKw } from '../../lib/utils.js';
import { Badge, NotifItem } from './common.jsx';

const TONES = {
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-sky-100 text-sky-700',
  gray: 'bg-gray-100 text-gray-600',
};

function Stat({ icon, tone, value, label, sub, onClick }) {
  return (
    <button type="button" onClick={onClick} className="vstat text-left bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${TONES[tone]}`} aria-hidden="true">{icon}</div>
      <div className="mt-3 text-3xl font-extrabold text-gray-900 tabular-nums leading-none">{value}</div>
      <div className="text-sm font-semibold text-gray-700 mt-1.5">{label}</div>
      <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
    </button>
  );
}

export default function Overview({ v, st, show, addProduct }) {
  const wonValue = st.won.reduce((a, q) => a + (q.priceRupees || 0), 0);
  const kw = st.done.reduce((a, q) => a + quoteKw(q), 0);
  const notifs = buildNotifications(v).slice(0, 5);
  const counts = INSTALL_STAGES.map((_, i) => st.won.filter(q => (q.installStage || 0) === i).length);
  const max = Math.max(1, ...counts);
  const checks = verificationChecks(v);
  const todo = attentionItems({
    notQuoted: st.notQuoted.length,
    active: st.active.length,
    profileMissing: checks.filter(c => !c.ok).map(c => c.label),
    unread: unreadCount(v),
  });
  const rate = winRate(st.won.length, st.decided.length);

  return (
    <section className="vsec space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-widest text-green-700">Vendor dashboard</span><Badge v={v} /></div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Welcome back, <span className="grad-text">{(v.contactName || v.displayName).split(' ')[0]}</span> 👋</h2>
          {(v.shop || v.area) && <p className="mt-1 text-sm text-gray-500 font-medium">{v.shop ? '🏪 ' + v.shop : ''}{v.shop && v.area ? ' · ' : ''}{v.area ? '📍 ' + v.area : ''}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => show('enquiries')} className="cta-primary whitespace-nowrap rounded-xl text-white font-bold px-5 py-2.5 text-sm">View enquiries <span className="arrow">→</span></button>
          <button type="button" onClick={addProduct} className="whitespace-nowrap rounded-xl font-bold px-5 py-2.5 text-sm bg-yellow-400 hover:bg-yellow-300 text-gray-900 shadow-sm transition">＋ Add product</button>
        </div>
      </header>

      <section aria-label="Needs your attention" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-extrabold text-gray-900">Needs your attention</h3>
          {todo.length > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">{todo.length} to do</span>}
        </div>
        {todo.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl" aria-hidden="true">✅</div>
            <p className="mt-2 font-semibold text-gray-800">You are all caught up</p>
            <p className="text-sm text-gray-500 mt-1">New household enquiries will show up here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {todo.map(item => (
              <li key={item.id} className="px-5 py-4 flex items-center gap-4">
                <span className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-xl ${TONES[item.tone]}`} aria-hidden="true">{item.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-gray-900 text-sm sm:text-base">{item.title}</span>
                  <span className="block text-xs sm:text-sm text-gray-500 mt-0.5">{item.text}</span>
                </span>
                <button type="button" onClick={() => show(item.view)} className="shrink-0 text-sm font-bold px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white transition">{item.action}</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Summary" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon="📥" tone="green" value={st.openReqs.length} label="Open enquiries" onClick={() => show('enquiries')} sub={st.notQuoted.length ? `${st.notQuoted.length} not quoted by you yet` : 'All quoted by you'} />
        <Stat icon="📝" tone="amber" value={st.mine.length} label="Quotes sent" onClick={() => show('enquiries')} sub={st.pending.length ? `${st.pending.length} awaiting a decision` : 'None awaiting a decision'} />
        <Stat icon="🏆" tone="green" value={st.won.length} label="Jobs won" onClick={() => show('installations')} sub={rate === null ? 'No customer decisions yet' : `${inr(wonValue)} · ${rate}% win rate`} />
        <Stat icon="⭐" tone="amber" value={st.revs.length ? st.avg.toFixed(1) : '—'} label="Average rating" onClick={() => show('reviews')} sub={st.revs.length ? `from ${st.revs.length} review${st.revs.length > 1 ? 's' : ''}` : 'No reviews yet'} />
      </section>
      <p className="-mt-2 text-sm text-gray-500">
        <strong className="text-gray-800">{st.active.length}</strong> installation{st.active.length === 1 ? '' : 's'} in progress · <strong className="text-gray-800">{st.done.length}</strong> completed{st.done.length ? ` (${kw.toFixed(1)} kW installed)` : ''}
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-900">🔔 Recent activity</h3><button type="button" onClick={() => show('notifications')} className="text-sm font-semibold text-green-700 hover:text-green-800">View all →</button></div>
          <div className="space-y-3">
            {notifs.length ? notifs.map(n => <NotifItem key={n.id} n={n} compact onGo={show} />) : <p className="text-sm text-gray-500 py-6 text-center">No activity yet.</p>}
          </div>
        </div>
        <div className="min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-900">🛠️ Installation pipeline</h3><button type="button" onClick={() => show('installations')} className="text-sm font-semibold text-green-700 hover:text-green-800">Manage →</button></div>
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
