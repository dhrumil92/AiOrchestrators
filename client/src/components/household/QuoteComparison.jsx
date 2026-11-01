import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { acceptQuote } from '../../lib/domain.js';
import { inr, years } from '../../lib/utils.js';
import { useToast } from '../ui/Toast.jsx';
import { useConfirm } from '../ui/Confirm.jsx';
import HowCalculated from '../shared/HowCalculated.jsx';
import { CostChart, PaybackChart } from './charts.jsx';
import { SourceTag } from './SolarPlan.jsx';

const blank = v => v === null || v === undefined || v === '';
const show = (v, suffix = '') => (blank(v) ? <span className="text-amber-700 font-semibold">Not given</span> : `${v}${suffix}`);

function SecurityWarning({ flag }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
      <div className="font-semibold">🛡️ Warning: this quote contained hidden instructions. We ignored them.</div>
      <div className="mt-0.5">{flag.reason}</div>
      <button type="button" onClick={() => setOpen(o => !o)} className="mt-1 underline font-semibold">{open ? 'Hide removed text' : 'Show removed text'}</button>
      {open && <p className="mt-1 rounded bg-white border border-red-100 p-2 text-gray-800 break-words">{flag.removedText}</p>}
    </div>
  );
}

function Checks({ q }) {
  const items = [];
  if (q.subsidyAtRisk) items.push('Subsidy at risk: made-in-India panels not confirmed');
  if (q.dcrConfirmed === false) items.push('No subsidy: panels are not made in India');
  q.missingItems.filter(m => !m.includes('made-in-India')).forEach(m => items.push(`Ask about: ${m}`));
  if (!items.length) return <div className="mt-2 text-xs font-semibold text-green-700">✅ Complete</div>;
  return <ul className="mt-2 space-y-1">{items.map(t => <li key={t} className="text-xs font-semibold text-amber-800">⚠️ {t}</li>)}</ul>;
}

function QuoteCard({ q, closed, recommended, onAccept, busy }) {
  const rows = [
    ['Quote price', blank(q.priceRupees) ? show(null) : inr(q.priceRupees)],
    ['Size', `${q.systemKw} kW`],
    ['Panels', <>{show(q.panelBrand)}{q.panelWatts ? `, ${q.panelWatts} W` : ''}</>],
    ['Made in India', q.dcrConfirmed === true ? 'Confirmed' : q.dcrConfirmed === false ? 'No' : show(null)],
    ['Inverter', show(q.inverterBrand)],
    ['Inverter warranty', show(q.inverterWarrantyYears, ' years')],
    ['Panel warranty', show(q.panelWarrantyYears, ' years')],
    ['Install time', show(q.installDays, ' days')],
  ];
  const border = recommended ? 'border-green-500 ring-2 ring-green-100' : 'border-gray-200';
  return (
    <div className={`quote-card bg-white border rounded-xl p-4 flex flex-col ${border}`}>
      <div className="font-bold text-gray-800 text-sm">{q.vendorName}</div>
      {recommended && <div className="text-xs font-bold text-green-700 mt-0.5">★ Our suggestion</div>}
      <div className="mt-2">
        <div className="text-xs text-gray-500">You pay</div>
        <div className="text-2xl font-black text-gray-900">{blank(q.amountYouPayRupees) ? 'Not given' : inr(q.amountYouPayRupees)}</div>
        {q.subsidyAtRisk && q.amountIfSubsidyApprovedRupees !== null && <div className="text-xs text-amber-800">{inr(q.amountIfSubsidyApprovedRupees)} if the subsidy is approved</div>}
        <div className="text-sm text-gray-700 mt-1">Money back: {years(q.paybackYears)}</div>
        {q.subsidyAtRisk && q.paybackIfSubsidyApprovedYears !== null && <div className="text-xs text-amber-800">{years(q.paybackIfSubsidyApprovedYears)} if the subsidy is approved</div>}
      </div>
      <dl className="mt-3 text-xs divide-y divide-gray-100">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3 py-1"><dt className="text-gray-500">{k}</dt><dd className="font-semibold text-gray-800 text-right">{v}</dd></div>)}
      </dl>
      <Checks q={q} />
      {q.securityFlag && <SecurityWarning flag={q.securityFlag} />}
      <div className="mt-2">
        <HowCalculated title={`${q.vendorName}: what you pay`} answer={blank(q.amountYouPayRupees) ? 'Not given' : inr(q.amountYouPayRupees)} ruleIds={['cfa-standard', 'dcr-required', 'tariff-rgp', 'assumption-payback', 'assumption-net-metering']}
          inputs={[['Quote price', blank(q.priceRupees) ? 'Not given' : inr(q.priceRupees)], ['Confirmed subsidy', inr(q.subsidyRupees)], ['Yearly bill saving', inr(q.yearlySavingRupees)], ['Score out of 100', q.score === null ? 'Not scored' : q.score.toFixed(1)]]} />
      </div>
      <div className="mt-auto pt-3">
        {q.status === 'accepted' ? <div className="text-center text-sm font-bold text-green-700">✅ Accepted</div>
          : closed ? <div className="text-center text-xs text-gray-500">Not selected</div>
          : <button disabled={busy} onClick={() => onAccept(q)} className="w-full text-sm bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2 rounded-lg font-semibold transition">Accept this quote</button>}
      </div>
    </div>
  );
}

export default function QuoteComparison({ req, quotes }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const closed = req.status === 'closed';
  const key = quotes.map(q => q.id + q.status).join();

  useEffect(() => {
    if (!quotes.length) { setData(null); return; }
    let live = true;
    setError('');
    api.comparison(req.id).then(c => { if (live) setData(c); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [req.id, req.preferredLanguage, key]);

  async function accept(q) {
    const ok = await confirm({ title: `Accept ${q.vendorName}'s quote?`, message: `${inr(q.priceRupees)} for a ${q.systemKw} kW system.\nOther quotes for this request will be closed.`, confirmText: 'Accept quote', icon: '🤝' });
    if (!ok) return;
    setBusy(true);
    try { await acceptQuote(q.quoteId); toast('🎉 Quote accepted! The vendor will start the site survey.', 'success'); }
    catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  }

  if (!quotes.length) return <div className="px-5 py-4 bg-amber-50 text-center"><p className="text-amber-700 text-sm">⏳ Vendors are reviewing your request. Quotes will appear here.</p></div>;
  if (error) return <p className="p-5 text-sm text-red-700">{error}</p>;
  if (!data) return <div className="m-5 h-40 rounded-xl bg-gray-50 animate-pulse" aria-label="Comparing your quotes" />;

  const rec = data.recommendation;
  const recQuote = data.quotes.find(q => q.quoteId === rec.quoteId);
  const acceptedQuote = data.quotes.find(q => q.status === 'accepted');
  return (
    <div className="p-5 space-y-6">
      <h4 className="font-bold text-gray-800">⚖️ Compare your quotes</h4>
      {closed ? (
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-green-800">Your choice</div>
          <div className="text-xl font-extrabold text-gray-900 mt-0.5">{acceptedQuote?.vendorName || 'Quote accepted'}</div>
          <p className="mt-1 text-sm text-gray-700">This request is closed. Other quotes stay here for your records.</p>
        </div>
      ) : recQuote ? (
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-green-800">We suggest</div>
          <div className="text-xl font-extrabold text-gray-900 mt-0.5">{recQuote.vendorName}</div>
          <ul className="mt-2 space-y-1 text-sm text-gray-800 list-disc list-inside">{rec.reasons.map(r => <li key={r}>{r}</li>)}</ul>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SourceTag source={rec.source} />
            <span className="text-xs text-gray-600">Fixed scoring rules choose the vendor. AI only explains the choice.</span>
          </div>
          {recQuote.securityFlag && <p className="mt-2 text-sm font-semibold text-red-800">🛡️ This quote scored best on price, warranty and speed, but it also contained hidden instructions. Be careful with this vendor.</p>}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
          <div className="font-bold text-gray-900">No quote is complete yet</div>
          <ul className="mt-2 space-y-1 text-sm text-gray-800 list-disc list-inside">{rec.reasons.map(r => <li key={r}>{r}</li>)}</ul>
        </div>
      )}
      {quotes.length === 1 && <p className="text-sm text-gray-600">Only one quote so far. Comparison improves as more vendors respond.</p>}
      <CostChart quotes={data.quotes} />
      <PaybackChart quotes={data.quotes} recommendedId={rec.quoteId} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.quotes.map(q => <QuoteCard key={q.quoteId} q={q} closed={closed} recommended={!closed && q.quoteId === rec.quoteId} onAccept={accept} busy={busy} />)}
      </div>
    </div>
  );
}
