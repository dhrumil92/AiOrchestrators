import { useState } from 'react';
import { db } from '../../lib/storage.js';
import { genId, inr, quoteKw, subsidyFor } from '../../lib/utils.js';
import { INSTALL_STAGES, LAST_STAGE, acceptQuote, acceptedQuoteFor, isMyRequest, quoteVendorId } from '../../lib/domain.js';
import { useApp } from '../../AppContext.jsx';
import { useToast } from '../ui/Toast.jsx';
import { useConfirm } from '../ui/Confirm.jsx';
import { EmptyState, Stars } from '../ui/bits.jsx';

function ReviewForm({ q, req, household }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  function submit() {
    if (!rating) return toast('Please choose a star rating.', 'error');
    const reviews = db.reviews();
    if (reviews.some(r => r.quoteId === q.id)) return;
    if (!isMyRequest(req, household)) return toast('You can only review your own installations.', 'error');
    db.saveReviews([{ id: genId(), quoteId: q.id, requestId: q.requestId, vendorId: quoteVendorId(q), vendorName: q.vendorName,
      rating, comment: comment.trim(), reviewerName: (req.name || 'Customer').split(' ')[0], createdAt: new Date().toISOString() }, ...reviews]);
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

function QuoteActions({ q, req, household, accepted }) {
  const toast = useToast();
  const confirm = useConfirm();
  async function accept() {
    if (!isMyRequest(req, household)) return toast('You can only accept quotes on your own requests.', 'error');
    if (acceptedQuoteFor(req.id)) return toast('A quote has already been accepted for this request.', 'info');
    const ok = await confirm({ title: `Accept ${q.vendorName}'s quote?`, message: `${inr(q.price)} for a ${quoteKw(q).toFixed(1)} kW system.\nOther quotes for this request will be closed.`, confirmText: 'Accept quote', icon: '🤝' });
    if (ok && acceptQuote(q.id)) toast('🎉 Quote accepted! The vendor will start the site survey.', 'success');
  }
  if (!accepted) return <button onClick={accept} className="mt-2 w-full text-xs bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition">✅ Accept this quote</button>;
  if (accepted.id !== q.id) return <div className="mt-2 text-center text-xs text-gray-500">Not selected</div>;
  const st = q.installStage || 0, pct = Math.round(st / LAST_STAGE * 100);
  const rv = st >= LAST_STAGE ? db.reviews().find(r => r.quoteId === q.id) : null;
  return (
    <>
      <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3">
        <div className="flex justify-between text-xs font-semibold text-green-800"><span>✅ Accepted · {INSTALL_STAGES[st]}</span><span>{pct}%</span></div>
        <div className="mt-2 h-2 rounded-full bg-green-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-green-600" style={{ width: pct + '%' }} /></div>
      </div>
      {st >= LAST_STAGE && (rv
        ? <div className="mt-2 text-xs text-gray-600">Your review: <Stars value={rv.rating} className="text-sm" />{rv.comment ? ' — ' + rv.comment : ''}</div>
        : <ReviewForm q={q} req={req} household={household} />)}
    </>
  );
}

function QuoteCard({ q, req, household, accepted }) {
  const { askAi } = useApp();
  const kw = quoteKw(q);
  const net = Math.max(0, q.price - subsidyFor(kw));
  const cells = [['Panel', `${q.panelBrand} ${q.panelWatts}W`], ['Panels', `${q.numPanels} × ${q.panelWatts}W = ${kw.toFixed(1)}kW`], ['Inverter', q.inverterBrand],
    ['Type', q.inverterType], ['Warranty', `${q.warranty} yrs`], ['Timeline', q.timeline]];
  return (
    <div className="quote-card bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0"><div className="font-bold text-gray-800 text-sm truncate">{q.vendorName}</div><div className="text-xs text-gray-500">{q.vendorPhone}</div></div>
        <div className="text-right"><div className="text-lg font-black text-green-600">{inr(q.price)}</div><div className="text-xs text-green-600">Net after subsidy: {inr(net)}</div></div>
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 mt-3">
        {cells.map(([k, v]) => <div key={k} className="bg-gray-50 rounded-lg p-2"><span className="font-semibold">{k}:</span> {v}</div>)}
      </div>
      {q.notes && <p className="text-xs text-gray-500 mt-2 italic">{q.notes}</p>}
      <button onClick={() => askAi({ type: 'quote', quoteId: q.id, requestId: req.id })} className="mt-3 w-full text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 py-2 rounded-lg font-semibold transition">🤖 Ask AI About This Quote</button>
      <QuoteActions q={q} req={req} household={household} accepted={accepted} />
    </div>
  );
}

export default function MyRequests({ requests, household }) {
  const quotes = db.quotes();
  return (
    <div id="my-requests-section" data-hhsec>
      <h3 className="font-bold text-gray-800 text-lg mb-3">📬 Your Requests &amp; Quotes</h3>
      <div className="space-y-4">
        {!requests.length && <EmptyState icon="📭" title="You haven't posted a request yet" text='Fill in "Post Your Solar Requirement" above. Vendor quotes will appear here.' />}
        {[...requests].reverse().map(req => {
          const qs = quotes.filter(q => q.requestId === req.id);
          const accepted = qs.find(q => q.status === 'accepted');
          return (
            <div key={req.id} className="bg-white rounded-2xl shadow-md overflow-hidden fade-in">
              <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-gray-800">{req.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${qs.length ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {qs.length ? `${qs.length} Quote${qs.length > 1 ? 's' : ''}` : 'Awaiting Quotes'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">📍 {req.address}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
                    <span>💡 {inr(req.monthlyBill)}/mo bill</span><span>💰 Budget: {inr(req.budget)}</span>{req.roofArea ? <span>🏠 {req.roofArea} sq ft</span> : null}
                  </div>
                </div>
                {req.photo && <img src={`data:image/jpeg;base64,${req.photo}`} alt="Rooftop" className="w-20 h-16 shrink-0 object-cover rounded-xl border-2 border-amber-200" />}
              </div>
              {qs.length ? (
                <div className="p-5">
                  <h4 className="font-bold text-gray-700 mb-3 text-sm">Vendor Quotes:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {qs.map(q => <QuoteCard key={q.id} q={q} req={req} household={household} accepted={accepted} />)}
                  </div>
                </div>
              ) : (
                <div className="px-5 py-4 bg-amber-50 text-center"><p className="text-amber-700 text-sm">⏳ Waiting for vendor quotes... Check back soon!</p></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
