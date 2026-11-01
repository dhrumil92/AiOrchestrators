import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { refreshMarket } from '../../lib/storage.js';
import { inr } from '../../lib/utils.js';
import { useToast } from '../ui/Toast.jsx';
import HowCalculated from '../shared/HowCalculated.jsx';
import { UsageBars } from './charts.jsx';

export const LANGUAGES = [['en', 'English'], ['hi', 'हिन्दी'], ['gu', 'ગુજરાતી']];

export const SourceTag = ({ source }) => {
  if (source === 'saved') return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Saved example</span>;
  if (source === 'template') return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Basic explanation</span>;
  return null;
};

function TerraceReview({ req }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [area, setArea] = useState(req.usableAreaSqm ?? '');
  const a = req.assessment;
  useEffect(() => { setArea(req.usableAreaSqm ?? ''); }, [req.usableAreaSqm]);

  async function review() {
    setBusy(true);
    try { await api.assessPhoto(req.id); await refreshMarket(); }
    catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  }
  async function saveArea(e) {
    e.preventDefault();
    const value = Number(area);
    if (area === '' || !(value >= 0)) return toast('Enter your usable terrace area in square metres.', 'error');
    try { await api.updateRequest(req.id, { usableAreaSqm: value }); await refreshMarket(); toast('Terrace area saved.', 'success'); }
    catch (err) { toast(err.message, 'error'); }
  }

  return (
    <div>
      <h5 className="font-bold text-gray-800 text-sm">Your terrace</h5>
      <div className="mt-2 grid sm:grid-cols-[200px_1fr] gap-4">
        {req.photoUrl
          ? <img src={req.photoUrl} alt="Your terrace" className="w-full h-40 object-cover rounded-xl border-2 border-amber-200" />
          : <div className="h-40 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-sm text-gray-500 text-center p-3">No terrace photo added</div>}
        <div className="min-w-0">
          {a ? (
            <>
              <div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-semibold text-gray-800">What we found</span><SourceTag source={a.source} /></div>
              {a.obstructions.length
                ? <ul className="mt-1 space-y-1 text-sm text-gray-700">{a.obstructions.map(o => <li key={o.name}>⚠️ <strong>{o.name}</strong>{o.note ? `: ${o.note}` : ''}</li>)}</ul>
                : <p className="mt-1 text-sm text-gray-600">{a.summary}</p>}
              <p className="mt-2 text-xs text-gray-500">AI estimate. A site visit is still needed.</p>
            </>
          ) : req.photoUrl ? (
            <button onClick={review} disabled={busy} className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-lg transition">{busy ? 'Checking your terrace…' : '🔍 Check my terrace'}</button>
          ) : <p className="text-sm text-gray-600">Add a photo when you post a request so we can check for water tanks and staircase rooms.</p>}
          <form onSubmit={saveArea} className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor={`area-${req.id}`} className="text-xs font-bold text-gray-600 block mb-1">Clear terrace area (square metres)</label>
              <input id={`area-${req.id}`} type="number" min="0" value={area} onChange={e => setArea(e.target.value)} className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50" />
            </div>
            <button type="submit" className="text-sm font-semibold px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800">Confirm</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SolarPlan({ req }) {
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    let live = true;
    setError('');
    api.estimate(req.id).then(e => { if (live) setEstimate(e); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [req.id, req.monthlyUnits, req.usableAreaSqm, req.preferredLanguage]);

  async function setLanguage(language) {
    try { await api.updateRequest(req.id, { preferredLanguage: language }); await refreshMarket(); }
    catch (err) { toast(err.message, 'error'); }
  }

  const e = estimate;
  return (
    <div className="p-5 border-b border-gray-100 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-bold text-gray-800">☀️ Your solar plan</h4>
        <label className="text-xs font-semibold text-gray-600 flex items-center gap-2">Explain in
          <select value={req.preferredLanguage} onChange={ev => setLanguage(ev.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-gray-50">
            {LANGUAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {!e && !error && <div className="h-28 rounded-xl bg-gray-50 animate-pulse" aria-label="Working out your plan" />}
      {e && (
        <>
          <div className="rounded-xl p-4 border border-green-100" style={{ background: 'linear-gradient(135deg,#f0fdf4,#fefce8)' }}>
            {e.suggestedKw > 0
              ? <p className="text-lg font-bold text-gray-900">A {e.suggestedKw} kW system could make about {e.monthlyGenerationUnits} units a month.</p>
              : <p className="text-lg font-bold text-gray-900">Your confirmed terrace area looks too small for a system.</p>}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><div className="text-xs text-gray-600">Government subsidy, with made-in-India panels</div><div className="text-2xl font-black text-green-700">{inr(e.subsidyRupees)}</div></div>
              <div><div className="text-xs text-gray-600">Estimated yearly bill saving</div><div className="text-2xl font-black text-green-700">{inr(e.yearlySavingRupees)}</div></div>
            </div>
            {e.limitedByRoof && <p className="mt-2 text-sm text-amber-800">⚠️ Limited by your terrace area. Your usage alone would suit {e.energySizedKw} kW.</p>}
            <p className="mt-3 text-sm text-gray-700 leading-relaxed">{e.explanation} <SourceTag source={e.explanationSource} /></p>
            <div className="mt-3">
              <HowCalculated title="Your solar plan" answer={`${e.suggestedKw} kW`} ruleIds={[...e.rulesUsed, 'dcr-required', 'state-subsidy', 'scheme-end', 'assumption-generation', 'assumption-area', 'assumption-net-metering']}
                inputs={[['Units used a month', req.monthlyUnits], ['Confirmed terrace area', req.usableAreaSqm === null ? 'Not confirmed' : `${req.usableAreaSqm} sq m`], ['Scheme guidance', e.schemeBand], ['Subsidy', inr(e.subsidyRupees)], ['Yearly saving', inr(e.yearlySavingRupees)]]} />
            </div>
          </div>
          <div>
            <h5 className="font-bold text-gray-800 text-sm mb-2">Units used and solar units</h5>
            <UsageBars usedUnits={req.monthlyUnits} generatedUnits={e.monthlyGenerationUnits} />
            <p className="text-xs text-gray-500 mt-2">Average estimate. Real output changes with the season. A unit (kWh) is what your bill shows.</p>
          </div>
        </>
      )}
      <TerraceReview req={req} />
    </div>
  );
}
