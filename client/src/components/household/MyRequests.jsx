import { useState } from 'react';
import { db } from '../../lib/storage.js';
import { cityOf, genId, inr } from '../../lib/utils.js';
import { INSTALL_STAGES, LAST_STAGE } from '../../lib/domain.js';
import { requestStatus } from '../../lib/householdView.js';
import { useToast } from '../ui/Toast.jsx';
import { EmptyState, Stars } from '../ui/bits.jsx';
import SolarPlan from './SolarPlan.jsx';
import QuoteComparison from './QuoteComparison.jsx';

const TONES = {
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-sky-100 text-sky-800',
  gray: 'bg-gray-100 text-gray-600',
};

export const StatusChip = ({ status }) => (
  <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${TONES[status.tone]}`}>{status.label}</span>
);

function ReviewForm({ q, req }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  function submit() {
    if (!rating) return toast('Please choose a star rating.', 'error');
    const reviews = db.reviews();
    if (reviews.some(r => r.quoteId === q.id)) return;
    db.saveReviews([{ id: genId(), quoteId: q.id, requestId: q.requestId, vendorId: q.vendorId, vendorName: q.vendorName,
      rating, comment: comment.trim(), reviewerName: (req.householdName || 'Customer').split(' ')[0], createdAt: new Date().toISOString() }, ...reviews]);
    toast('⭐ Thanks for your review!', 'success');
  }
  return (
    <div className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
      <div className="text-xs font-semibold text-gray-700">Rate {q.vendorName}</div>
      <div role="radiogroup" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star`} className={`star-btn ${n <= rating ? 'on' : ''}`} onClick={() => setRating(n)}>★</button>
        ))}
      </div>
      <textarea rows={2} maxLength={400} value={comment} onChange={e => setComment(e.target.value)} placeholder="How was the installation?" aria-label="Review comment"
        className="mt-1 w-full border border-yellow-200 rounded-lg px-2 py-1.5 text-xs resize-none bg-white" />
      <button type="button" onClick={submit} className="mt-1 w-full text-xs bg-yellow-400 hover:bg-yellow-300 text-gray-900 py-1.5 rounded-lg font-bold">Submit review</button>
    </div>
  );
}

/** Next steps after accepting, with the vendor's install progress. */
function Progress({ q, req }) {
  const st = q.installStage || 0, pct = Math.round(st / LAST_STAGE * 100);
  const rv = st >= LAST_STAGE ? db.reviews().find(r => r.quoteId === q.id) : null;
  return (
    <div className="p-5">
      <h4 className="font-bold text-gray-800">🎉 You accepted {q.vendorName}</h4>
      <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3">
        <div className="flex justify-between text-xs font-semibold text-green-800"><span>{INSTALL_STAGES[st]}</span><span>{pct}%</span></div>
        <div className="mt-2 h-2 rounded-full bg-green-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-green-600" style={{ width: pct + '%' }} /></div>
      </div>
      <ol className="mt-4 space-y-2">
        {INSTALL_STAGES.map((label, i) => (
          <li key={label} className={`flex items-center gap-3 text-sm ${i <= st ? 'text-gray-900' : 'text-gray-400'}`} aria-current={i === st ? 'step' : undefined}>
            <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${i < st || st >= LAST_STAGE ? 'bg-green-600 text-white' : i === st ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100'}`}>{i < st || st >= LAST_STAGE ? '✓' : i + 1}</span>
            <span className={i === st ? 'font-bold' : ''}>{label}</span>
          </li>
        ))}
      </ol>
      <h5 className="mt-5 text-sm font-bold text-gray-800">What happens next</h5>
      <ol className="mt-1 grid sm:grid-cols-2 gap-1 text-sm text-gray-700 list-decimal list-inside">
        <li>The vendor contacts you</li><li>Site visit confirms the size</li><li>Apply on the National Portal with your consumer number</li><li>Installation, then subsidy</li>
      </ol>
      <p className="mt-2 text-xs text-gray-500">The scheme guidelines run until 31 March 2027.</p>
      {st >= LAST_STAGE && (rv
        ? <div className="mt-3 text-xs text-gray-600">Your review: <Stars value={rv.rating} className="text-sm" />{rv.comment ? ' — ' + rv.comment : ''}</div>
        : <ReviewForm q={q} req={req} />)}
    </div>
  );
}

function RequestDetail({ req, quotes, status, accepted }) {
  // The tab that matters most right now. The household can still switch.
  const [tab, setTab] = useState(accepted ? 'progress' : quotes.length ? 'quotes' : 'plan');
  const tabs = [['plan', '☀️ Solar plan'], ['quotes', `💬 Quotes${quotes.length ? ` (${quotes.length})` : ''}`], ...(accepted ? [['progress', '🔧 Progress']] : [])];
  return (
    <article className="bg-white rounded-2xl shadow-md overflow-hidden fade-in">
      <header className="p-5 border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-extrabold text-gray-900 text-lg">{req.householdName}</h3>
          <StatusChip status={status} />
          {req.isSample && <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-600">Sample data</span>}
        </div>
        {req.addressText && <p className="text-sm text-gray-500 mt-1">📍 {req.addressText}</p>}
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-gray-600">
          <span>💡 {req.monthlyUnits} units a month</span><span>💰 Budget: {inr(req.budgetRupees)}</span>
          {req.createdAt && <span>🗓️ Posted {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
        </div>
      </header>
      <div role="tablist" aria-label="Request details" className="flex gap-1 px-3 pt-2 border-b border-gray-100 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${tab === id ? 'border-green-600 text-green-800' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{label}</button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'plan' && <SolarPlan req={req} />}
        {tab === 'quotes' && <QuoteComparison req={req} quotes={quotes} />}
        {tab === 'progress' && accepted && <Progress q={accepted} req={req} />}
      </div>
    </article>
  );
}

export default function MyRequests({ requests, selectedId, onSelect, onNew }) {
  const all = db.quotes();
  if (!requests.length) {
    return (
      <EmptyState icon="📭" title="You haven't posted a request yet" text="Post your first request and vendors near you will send quotes. They will appear here.">
        <button type="button" onClick={onNew} className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-xl transition">Post a request</button>
      </EmptyState>
    );
  }
  const list = [...requests].reverse();
  const req = list.find(r => r.id === selectedId) || list[0];
  const rows = list.map(r => {
    const qs = all.filter(q => q.requestId === r.id);
    return { r, qs, status: requestStatus(r, qs, LAST_STAGE), accepted: qs.find(q => q.status === 'accepted') };
  });
  const current = rows.find(x => x.r.id === req.id);

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-5 items-start">
      <nav aria-label="Your requests" className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 lg:sticky" style={{ top: 'calc(var(--hdr-h) + 16px)' }}>
        {rows.map(({ r, status }) => {
          const on = r.id === req.id;
          return (
            <button key={r.id} type="button" onClick={() => onSelect(r.id)} aria-current={on ? 'true' : undefined}
              className={`shrink-0 w-64 lg:w-auto text-left rounded-2xl border p-4 transition ${on ? 'bg-white border-green-500 ring-2 ring-green-100 shadow-md' : 'bg-white/70 border-gray-200 hover:border-green-300'}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-gray-900 truncate">{cityOf(r.addressText)}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">{r.monthlyUnits} units · {inr(r.budgetRupees)}</div>
              <div className="mt-2"><StatusChip status={status} /></div>
            </button>
          );
        })}
        <button type="button" onClick={onNew} className="shrink-0 w-44 lg:w-auto rounded-2xl border-2 border-dashed border-gray-300 p-4 text-sm font-bold text-gray-600 hover:border-green-400 hover:text-green-700 transition">➕ New request</button>
      </nav>
      <RequestDetail key={req.id} req={req} quotes={current.qs} status={current.status} accepted={current.accepted} />
    </div>
  );
}
