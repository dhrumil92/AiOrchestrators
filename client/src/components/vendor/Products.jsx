import { useEffect, useRef, useState } from 'react';
import { db } from '../../lib/storage.js';
import { PRODUCT_CATS, genId } from '../../lib/domain.js';
import { inr } from '../../lib/utils.js';
import { EmptyState } from '../ui/bits.jsx';
import { useConfirm } from '../ui/Confirm.jsx';
import { useToast } from '../ui/Toast.jsx';
import { SectionHead } from './common.jsx';

const EMPTY = { id: '', category: 'panel', brand: '', model: '', capacity: '', inverterType: 'On-grid', price: '', warranty: '', stock: 'In stock', dcr: false };
const STOCK_CLS = { 'In stock': 'bg-green-50 text-green-700 border-green-200', 'Made to order': 'bg-yellow-50 text-yellow-800 border-yellow-200', 'Out of stock': 'bg-gray-100 text-gray-500 border-gray-200' };
const lbl = 'text-xs font-semibold text-gray-600 mb-1 block';

function ProductForm({ v, initial, onClose }) {
  const toast = useToast();
  const [f, setF] = useState(initial);
  const ref = useRef(null);
  const brandRef = useRef(null);
  const set = k => e => setF(s => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  useEffect(() => { setTimeout(() => { ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); brandRef.current?.focus({ preventScroll: true }); }, 50); }, []);

  function save(e) {
    e.preventDefault();
    const num = x => (x === '' || x == null ? null : parseFloat(x));
    const data = { category: f.category, brand: (f.brand || '').trim(), model: (f.model || '').trim(), capacity: num(f.capacity),
      inverterType: f.category === 'inverter' ? f.inverterType : null, price: num(f.price), warranty: num(f.warranty), stock: f.stock, dcr: !!f.dcr };
    if (!data.brand) return toast('Please enter the brand.', 'error');
    const all = db.products();
    if (f.id) {
      const p = all.find(x => x.id === f.id && x.vendorId === v.id);
      if (p) Object.assign(p, data, { updatedAt: new Date().toISOString() });
    } else all.unshift({ id: genId(), vendorId: v.id, createdAt: new Date().toISOString(), ...data });
    db.saveProducts(all);
    toast(f.id ? '✅ Product updated' : '✅ Product added to catalogue', 'success');
    onClose();
  }

  return (
    <form ref={ref} onSubmit={save} noValidate className="bg-white rounded-2xl border border-green-200 shadow-sm p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between">
        <h3 className="font-bold text-gray-900">{f.id ? 'Edit product' : 'Add product'}</h3>
        <button type="button" onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-700 text-xl leading-none">×</button>
      </div>
      <div><label htmlFor="vp-cat" className={lbl}>Category *</label>
        <select id="vp-cat" value={f.category} onChange={set('category')} className="vfield">
          <option value="panel">Solar panel</option><option value="inverter">Inverter</option><option value="battery">Battery</option><option value="package">Complete system package</option><option value="other">Other / accessory</option>
        </select></div>
      <div><label htmlFor="vp-brand" className={lbl}>Brand *</label><input id="vp-brand" ref={brandRef} value={f.brand} onChange={set('brand')} className="vfield" placeholder="Brand name" /></div>
      <div><label htmlFor="vp-model" className={lbl}>Model</label><input id="vp-model" value={f.model} onChange={set('model')} className="vfield" placeholder="Model / series" /></div>
      <div><label htmlFor="vp-cap" className={lbl}>Capacity ({PRODUCT_CATS[f.category].unit || 'units'})</label><input id="vp-cap" type="number" min="0" step="any" value={f.capacity ?? ''} onChange={set('capacity')} className="vfield" /></div>
      {f.category === 'inverter' && (
        <div><label htmlFor="vp-invtype" className={lbl}>Inverter type</label>
          <select id="vp-invtype" value={f.inverterType || 'On-grid'} onChange={set('inverterType')} className="vfield"><option>On-grid</option><option>Off-grid</option><option>Hybrid</option></select></div>
      )}
      <div><label htmlFor="vp-price" className={lbl}>Price (₹)</label><input id="vp-price" type="number" min="0" value={f.price ?? ''} onChange={set('price')} className="vfield" /></div>
      <div><label htmlFor="vp-warranty" className={lbl}>Warranty (years)</label><input id="vp-warranty" type="number" min="0" value={f.warranty ?? ''} onChange={set('warranty')} className="vfield" /></div>
      <div><label htmlFor="vp-stock" className={lbl}>Availability</label>
        <select id="vp-stock" value={f.stock} onChange={set('stock')} className="vfield"><option>In stock</option><option>Made to order</option><option>Out of stock</option></select></div>
      <label className="flex items-center gap-2 text-sm text-gray-700 self-end pb-2"><input type="checkbox" checked={!!f.dcr} onChange={set('dcr')} className="w-4 h-4 accent-green-600" /> DCR compliant (made in India cells)</label>
      <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</button>
        <button type="submit" className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700">Save product</button>
      </div>
    </form>
  );
}

/** form: null (closed) | { id?: string } ; setForm opens/closes it. */
export default function Products({ v, form, setForm }) {
  const confirm = useConfirm();
  const toast = useToast();
  const list = db.products().filter(p => p.vendorId === v.id);
  const initial = form ? { ...EMPTY, ...(form.id ? list.find(p => p.id === form.id) : {}) } : null;

  async function remove(id) {
    if (!(await confirm({ title: 'Delete this product?', message: 'It will be removed from your catalogue. Quotes you already sent are not affected.', confirmText: 'Delete', icon: '🗑️', danger: true }))) return;
    db.saveProducts(db.products().filter(p => p.id !== id));
    if (form?.id === id) setForm(null);
    toast('Product deleted', 'info');
  }

  return (
    <section className="vsec space-y-5">
      <SectionHead title="Product catalogue" sub="Panels, inverters and packages you supply. Use them to fill quotes in one click.">
        <button onClick={() => setForm({ nonce: Date.now() })} className="cta-primary whitespace-nowrap rounded-xl text-white font-bold px-5 py-2.5 text-sm">＋ Add product</button>
      </SectionHead>
      {initial && <ProductForm key={form.id || form.nonce} v={v} initial={initial} onClose={() => setForm(null)} />}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {!list.length && (
          <EmptyState icon="📦" title="Your catalogue is empty" text="Add the panels, inverters and packages you install. You can pick them while writing a quote.">
            <button onClick={() => setForm({ nonce: Date.now() })} className="mt-4 cta-primary rounded-xl text-white font-bold px-5 py-2.5 text-sm">＋ Add your first product</button>
          </EmptyState>
        )}
        {list.map(p => {
          const c = PRODUCT_CATS[p.category] || PRODUCT_CATS.other;
          return (
            <div key={p.id} className="vcard bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#f0fdf4,#fefce8)' }} aria-hidden="true">{c.icon}</div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STOCK_CLS[p.stock] || STOCK_CLS['In stock']}`}>{p.stock}</span>
              </div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-green-700">{c.label}</div>
              <div className="font-bold text-gray-900 text-lg leading-tight">{p.brand}{p.model && <span className="font-medium text-gray-500"> {p.model}</span>}</div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                {p.capacity != null && <span className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">⚡ {p.capacity} {c.unit}</span>}
                {p.inverterType && <span className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">{p.inverterType}</span>}
                {p.warranty != null && <span className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">🛡️ {p.warranty} yr warranty</span>}
                {p.dcr && <span className="bg-green-50 text-green-700 border border-green-100 rounded-lg px-2 py-1">🇮🇳 DCR</span>}
              </div>
              <div className="mt-auto pt-4 flex items-center justify-between">
                <div className="text-lg font-extrabold text-gray-900">{p.price != null ? inr(p.price) : <span className="text-sm font-medium text-gray-500">Price on request</span>}</div>
                <div className="flex gap-1">
                  <button onClick={() => setForm({ id: p.id })} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-green-100 hover:text-green-800 text-gray-600 transition">Edit</button>
                  <button onClick={() => remove(p.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-red-100 hover:text-red-700 text-gray-600 transition">Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
