import { useEffect, useRef, useState } from 'react';
import { db } from '../../lib/storage.js';
import { PRODUCT_CATS, acceptedQuoteFor, genId, vendorIdFromPhone } from '../../lib/domain.js';
import { inr, isValidPhone } from '../../lib/utils.js';
import { useToast } from '../ui/Toast.jsx';

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm';
const lbl = 'text-xs font-semibold text-gray-600 mb-1 block';

export default function QuoteModal({ v, requestId, onClose }) {
  const toast = useToast();
  const req = db.requests().find(r => r.id === requestId);
  const prods = db.products().filter(p => p.vendorId === v.id);
  const panels = prods.filter(p => p.category === 'panel'), invs = prods.filter(p => p.category === 'inverter');
  const [f, setF] = useState({ name: v.displayName || '', phone: v.phone || '', price: '', panelBrand: '', panelWatts: '', numPanels: '', inverterBrand: '', inverterType: '', warranty: '', timeline: '', notes: '' });
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

  function pick(id) {
    const p = prods.find(x => x.id === id);
    if (!p) return;
    const name = p.brand + (p.model ? ' ' + p.model : '');
    setF(s => p.category === 'panel'
      ? { ...s, panelBrand: name, panelWatts: p.capacity ?? s.panelWatts, warranty: s.warranty || (p.warranty ?? '') }
      : { ...s, inverterBrand: name, inverterType: p.inverterType || s.inverterType });
  }

  function submit(e) {
    e.preventDefault();
    if (acceptedQuoteFor(requestId)) { toast('This request has already been awarded.', 'info'); return onClose(); }
    const req = ['name', 'phone', 'price', 'panelBrand', 'panelWatts', 'numPanels', 'inverterBrand', 'inverterType', 'warranty', 'timeline'];
    if (req.some(k => String(f[k]).trim() === '')) return toast('Please fill in all required fields.', 'error');
    if (!isValidPhone(f.phone)) return toast('Enter a valid 10-digit mobile number.', 'error');
    const price = parseFloat(f.price), watts = parseFloat(f.panelWatts), n = parseInt(f.numPanels, 10), w = parseInt(f.warranty, 10);
    if (!(price > 0) || !(watts > 0) || !(n > 0) || !(w >= 0)) return toast('Price, wattage, panel count and warranty must be positive numbers.', 'error');
    db.saveQuotes([...db.quotes(), {
      id: genId(), requestId, vendorName: f.name.trim(), vendorPhone: f.phone.trim(), price, panelBrand: f.panelBrand.trim(), panelWatts: watts,
      numPanels: n, inverterBrand: f.inverterBrand.trim(), inverterType: f.inverterType, warranty: w, timeline: f.timeline.trim(), notes: f.notes.trim(),
      createdAt: new Date().toISOString(), vendorId: v.id || vendorIdFromPhone(f.phone), status: 'pending',
    }]);
    toast('✅ Quote submitted successfully!', 'success');
    onClose();
  }

  const opt = p => <option key={p.id} value={p.id}>{p.brand}{p.model ? ' ' + p.model : ''}{p.capacity != null ? ' · ' + p.capacity + PRODUCT_CATS[p.category].unit : ''}</option>;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="qm-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto bounce-in">
        <div style={{ background: 'linear-gradient(135deg,#15803d,#16a34a)' }} className="p-5 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 id="qm-title" className="text-white font-bold text-lg">📝 Submit Your Quote</h2>
            {req && <p className="text-green-100 text-xs mt-0.5">For: {req.address} | Bill: {inr(req.monthlyBill)}/mo</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-white hover:text-green-100 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={submit} noValidate className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="v-name" className={lbl}>Vendor Name *</label><input id="v-name" ref={firstRef} value={f.name} onChange={set('name')} placeholder="Your company name" className={inp} /></div>
            <div><label htmlFor="v-phone" className={lbl}>Phone *</label><input id="v-phone" type="tel" value={f.phone} onChange={set('phone')} placeholder="98XXXXXXXX" className={inp} /></div>
          </div>
          <div>
            <label htmlFor="v-price" className={lbl}>💰 System Price (₹) *</label>
            <input id="v-price" type="number" min="0" value={f.price} onChange={set('price')} placeholder="e.g. 185000" className={inp} />
            <p className="text-xs text-gray-500 mt-1">Total installed price. Subsidy will be deducted separately by Discom.</p>
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
          <div className="grid grid-cols-3 gap-3">
            <div><label htmlFor="v-panel-brand" className={lbl}>Panel Brand *</label><input id="v-panel-brand" value={f.panelBrand} onChange={set('panelBrand')} placeholder="e.g. Waaree" className={inp} /></div>
            <div><label htmlFor="v-panel-watts" className={lbl}>Wattage (W) *</label><input id="v-panel-watts" type="number" value={f.panelWatts} onChange={set('panelWatts')} placeholder="e.g. 540" className={inp} /></div>
            <div><label htmlFor="v-num-panels" className={lbl}>No. of Panels *</label><input id="v-num-panels" type="number" value={f.numPanels} onChange={set('numPanels')} placeholder="e.g. 6" className={inp} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="v-inverter-brand" className={lbl}>Inverter Brand *</label><input id="v-inverter-brand" value={f.inverterBrand} onChange={set('inverterBrand')} placeholder="e.g. SolarEdge" className={inp} /></div>
            <div><label htmlFor="v-inverter-type" className={lbl}>Inverter Type *</label>
              <select id="v-inverter-type" value={f.inverterType} onChange={set('inverterType')} className={`${inp} bg-white`}><option value="">Select...</option><option>On-grid</option><option>Off-grid</option><option>Hybrid</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="v-warranty" className={lbl}>Warranty (years) *</label><input id="v-warranty" type="number" value={f.warranty} onChange={set('warranty')} placeholder="e.g. 25" className={inp} /></div>
            <div><label htmlFor="v-timeline" className={lbl}>Timeline *</label><input id="v-timeline" value={f.timeline} onChange={set('timeline')} placeholder="e.g. 2-3 weeks" className={inp} /></div>
          </div>
          <div><label htmlFor="v-notes" className={lbl}>Additional Notes</label><textarea id="v-notes" rows={2} value={f.notes} onChange={set('notes')} placeholder="Anything else the customer should know..." className={`${inp} resize-none`} /></div>
          <button type="submit" className="cta-primary w-full py-3 rounded-xl font-bold text-white text-base">📤 Submit Quote</button>
        </form>
      </div>
    </div>
  );
}
