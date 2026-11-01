import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { db, refreshMarket } from '../../lib/storage.js';
import { missingDetails } from '../../lib/chartData.js';
import { PRODUCT_CATS } from '../../lib/domain.js';
import { inr } from '../../lib/utils.js';
import { useToast } from '../ui/Toast.jsx';

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm';
const lbl = 'text-xs font-semibold text-gray-600 mb-1 block';
const num = v => (v === '' ? null : Number(v));

export default function QuoteModal({ v, requestId, onClose }) {
  const toast = useToast();
  const req = db.requests().find(r => r.id === requestId);
  const prods = db.products().filter(p => p.vendorId === v.id);
  const panels = prods.filter(p => p.category === 'panel'), invs = prods.filter(p => p.category === 'inverter');
  const [f, setF] = useState({ systemKw: '', price: '', panelBrand: '', panelWatts: '', dcr: '', inverterBrand: '', inverterKw: '', inverterWarranty: '', panelWarranty: '', days: '', notes: '' });
  const [suggested, setSuggested] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  const firstRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    firstRef.current?.focus();
    const onKey = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && dialogRef.current) {           // keep focus inside the dialog
        const els = dialogRef.current.querySelectorAll('button,input,select,textarea');
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);

  // Show the household's suggested size and start the form from it.
  useEffect(() => {
    let live = true;
    api.estimate(requestId).then(e => {
      if (!live) return;
      setSuggested(e.suggestedKw);
      if (e.suggestedKw > 0) setF(s => (s.systemKw === '' ? { ...s, systemKw: String(e.suggestedKw) } : s));
    }).catch(() => {});
    return () => { live = false; };
  }, [requestId]);

  function pick(id) {
    const p = prods.find(x => x.id === id);
    if (!p) return;
    const name = p.brand + (p.model ? ' ' + p.model : '');
    setF(s => p.category === 'panel'
      ? { ...s, panelBrand: name, panelWatts: p.capacity ?? s.panelWatts, panelWarranty: s.panelWarranty || (p.warranty ?? '') }
      : { ...s, inverterBrand: name });
  }

  const missing = missingDetails({
    priceRupees: f.price, panelBrand: f.panelBrand.trim(), panelWatts: f.panelWatts, dcrConfirmed: f.dcr,
    inverterBrand: f.inverterBrand.trim(), inverterWarrantyYears: f.inverterWarranty, panelWarrantyYears: f.panelWarranty, installDays: f.days,
  });

  async function submit(e) {
    e.preventDefault();
    if (!(Number(f.systemKw) > 0)) return toast('Enter the system size in kW.', 'error');
    const positive = [f.price, f.panelWatts, f.inverterKw, f.days].filter(x => x !== '');
    if (positive.some(x => !(Number(x) > 0))) return toast('Price, watts, inverter kW and install days must be above 0.', 'error');
    setBusy(true);
    try {
      const quote = await api.createQuote(requestId, {
        vendorId: v.id, systemKw: Number(f.systemKw), priceRupees: num(f.price), panelBrand: f.panelBrand.trim() || null, panelWatts: num(f.panelWatts),
        dcrConfirmed: f.dcr === '' ? null : f.dcr === 'yes', inverterBrand: f.inverterBrand.trim() || null, inverterKw: num(f.inverterKw),
        inverterWarrantyYears: num(f.inverterWarranty), panelWarrantyYears: num(f.panelWarranty), installDays: num(f.days), notes: f.notes.trim() || null,
      });
      await refreshMarket();
      toast(quote.injectionFlagged ? 'Quote sent, but your notes were removed because they looked like instructions.' : '✅ Quote submitted successfully!', quote.injectionFlagged ? 'info' : 'success');
      onClose();
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  }

  const opt = p => <option key={p.id} value={p.id}>{p.brand}{p.model ? ' ' + p.model : ''}{p.capacity != null ? ' · ' + p.capacity + PRODUCT_CATS[p.category].unit : ''}</option>;
  const done = 8 - missing.length;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="qm-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto bounce-in">
        <div style={{ background: 'linear-gradient(135deg,#15803d,#16a34a)' }} className="p-5 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 id="qm-title" className="text-white font-bold text-lg">📝 Submit Your Quote</h2>
            {req && <p className="text-green-100 text-xs mt-0.5">For: {req.addressText || 'Household'} | {req.monthlyUnits} units a month | Budget {inr(req.budgetRupees)}</p>}
            {suggested > 0 && <p className="text-green-100 text-xs mt-0.5">Suggested size: {suggested} kW</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-white hover:text-green-100 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={submit} noValidate className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="v-kw" className={lbl}>System Size (kW) *</label><input id="v-kw" ref={firstRef} type="number" step="0.1" min="0" value={f.systemKw} onChange={set('systemKw')} placeholder="e.g. 2.5" className={inp} /></div>
            <div><label htmlFor="v-price" className={lbl}>💰 Total Price (₹)</label><input id="v-price" type="number" min="0" value={f.price} onChange={set('price')} placeholder="e.g. 145000" className={inp} /></div>
          </div>
          {(panels.length > 0 || invs.length > 0) && (
            <div className="grid grid-cols-2 gap-3 bg-green-50 border border-green-100 rounded-xl p-3">
              <div><label htmlFor="v-pick-panel" className="text-xs font-semibold text-green-800 mb-1 block">📦 Panel from my catalogue</label>
                <select id="v-pick-panel" defaultValue="" onChange={e => pick(e.target.value)} className="w-full border border-green-200 rounded-lg px-2 py-2 text-sm bg-white">
                  <option value="">{panels.length ? 'Choose…' : 'No panels in catalogue'}</option>{panels.map(opt)}</select></div>
              <div><label htmlFor="v-pick-inverter" className="text-xs font-semibold text-green-800 mb-1 block">📦 Inverter from my catalogue</label>
                <select id="v-pick-inverter" defaultValue="" onChange={e => pick(e.target.value)} className="w-full border border-green-200 rounded-lg px-2 py-2 text-sm bg-white">
                  <option value="">{invs.length ? 'Choose…' : 'No inverters in catalogue'}</option>{invs.map(opt)}</select></div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="v-panel-brand" className={lbl}>Panel Brand</label><input id="v-panel-brand" value={f.panelBrand} onChange={set('panelBrand')} className={inp} /></div>
            <div><label htmlFor="v-panel-watts" className={lbl}>Panel Watts (W)</label><input id="v-panel-watts" type="number" min="0" value={f.panelWatts} onChange={set('panelWatts')} placeholder="e.g. 540" className={inp} /></div>
          </div>
          <div>
            <label htmlFor="v-dcr" className={lbl}>Made-in-India panels with Indian cells (needed for subsidy)</label>
            <select id="v-dcr" value={f.dcr} onChange={set('dcr')} className={`${inp} bg-white`}><option value="">Not stated</option><option value="yes">Yes, confirmed</option><option value="no">No</option></select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="v-inverter-brand" className={lbl}>Inverter Brand</label><input id="v-inverter-brand" value={f.inverterBrand} onChange={set('inverterBrand')} className={inp} /></div>
            <div><label htmlFor="v-inverter-kw" className={lbl}>Inverter Size (kW)</label><input id="v-inverter-kw" type="number" step="0.1" min="0" value={f.inverterKw} onChange={set('inverterKw')} placeholder="e.g. 3" className={inp} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label htmlFor="v-inv-warranty" className={lbl}>Inverter Warranty (yrs)</label><input id="v-inv-warranty" type="number" min="0" value={f.inverterWarranty} onChange={set('inverterWarranty')} placeholder="e.g. 8" className={inp} /></div>
            <div><label htmlFor="v-panel-warranty" className={lbl}>Panel Warranty (yrs)</label><input id="v-panel-warranty" type="number" min="0" value={f.panelWarranty} onChange={set('panelWarranty')} placeholder="e.g. 25" className={inp} /></div>
            <div><label htmlFor="v-days" className={lbl}>Install Time (days)</label><input id="v-days" type="number" min="1" value={f.days} onChange={set('days')} placeholder="e.g. 21" className={inp} /></div>
          </div>
          <div><label htmlFor="v-notes" className={lbl}>Additional Notes</label><textarea id="v-notes" rows={2} value={f.notes} onChange={set('notes')} placeholder="Anything else the customer should know..." className={`${inp} resize-none`} /></div>
          <div className="rounded-xl bg-gray-50 p-3">
            <div className="flex justify-between text-xs font-semibold text-gray-700"><span>Quote details complete</span><span>{done} of 8</span></div>
            <div className="mt-1 h-2 rounded-full bg-gray-200 overflow-hidden"><div className="h-full rounded-full bg-green-600 transition-all" style={{ width: done / 8 * 100 + '%' }} /></div>
            {missing.length > 0 && <p className="text-xs text-amber-800 mt-1">Incomplete quotes cannot be recommended. Missing: {missing.join(', ')}.</p>}
          </div>
          <button type="submit" disabled={busy} className="cta-primary w-full py-3 rounded-xl font-bold text-white text-base disabled:opacity-60">{busy ? 'Sending…' : '📤 Submit Quote'}</button>
        </form>
      </div>
    </div>
  );
}
