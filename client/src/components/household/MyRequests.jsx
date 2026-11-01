import { useState } from 'react';
import { db } from '../../lib/storage.js';
import { genId, inr } from '../../lib/utils.js';
import { INSTALL_STAGES, LAST_STAGE } from '../../lib/domain.js';
import { useToast } from '../ui/Toast.jsx';
import { EmptyState, Stars } from '../ui/bits.jsx';
import SolarPlan from './SolarPlan.jsx';
import QuoteComparison from './QuoteComparison.jsx';

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
function AcceptedPanel({ q, req }) {
  const st = q.installStage || 0, pct = Math.round(st / LAST_STAGE * 100);
  const rv = st >= LAST_STAGE ? db.reviews().find(r => r.quoteId === q.id) : null;
  return (
    <div className="p-5 border-t border-gray-100">
      <h4 className="font-bold text-gray-800">🎉 You accepted {q.vendorName}</h4>
      <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3">
        <div className="flex justify-between text-xs font-semibold text-green-800"><span>{INSTALL_STAGES[st]}</span><span>{pct}%</span></div>
        <div className="mt-2 h-2 rounded-full bg-green-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-green-600" style={{ width: pct + '%' }} /></div>
      </div>
      <ol className="mt-3 grid sm:grid-cols-2 gap-1 text-sm text-gray-700 list-decimal list-inside">
        <li>The vendor contacts you</li><li>Site visit confirms the size</li><li>Apply on the National Portal with your consumer number</li><li>Installation, then subsidy</li>
      </ol>
      <p className="mt-2 text-xs text-gray-500">The scheme guidelines run until 31 March 2027.</p>
      {st >= LAST_STAGE && (rv
        ? <div className="mt-2 text-xs text-gray-600">Your review: <Stars value={rv.rating} className="text-sm" />{rv.comment ? ' — ' + rv.comment : ''}</div>
        : <ReviewForm q={q} req={req} />)}
    </div>
  );
}

export default function MyRequests({ requests }) {
  const quotes = db.quotes();
  return (
    <div id="my-requests-section" data-hhsec>
      <h3 className="font-bold text-gray-800 text-lg mb-3">📬 Your Requests &amp; Quotes</h3>
      <div className="space-y-6">
        {!requests.length && <EmptyState icon="📭" title="You haven't posted a request yet" text='Fill in "Post Your Solar Requirement" above. Vendor quotes will appear here.' />}
        {[...requests].reverse().map(req => {
          const qs = quotes.filter(q => q.requestId === req.id);
          const accepted = qs.find(q => q.status === 'accepted');
          return (
            <div key={req.id} className="bg-white rounded-2xl shadow-md overflow-hidden fade-in">
              <div className="p-5 border-b border-gray-100">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-gray-800">{req.householdName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${qs.length ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {req.status === 'closed' ? 'Closed' : qs.length ? `${qs.length} Quote${qs.length > 1 ? 's' : ''}` : 'Awaiting Quotes'}
                  </span>
                  {req.isSample && <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-600">Sample data</span>}
                </div>
                {req.addressText && <p className="text-sm text-gray-500">📍 {req.addressText}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
                  <span>💡 {req.monthlyUnits} units a month</span><span>💰 Budget: {inr(req.budgetRupees)}</span>
                </div>
              </div>
              <SolarPlan req={req} />
              <QuoteComparison req={req} quotes={qs} />
              {accepted && <AcceptedPanel q={accepted} req={req} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
