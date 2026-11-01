import { useState } from 'react';
import { db } from '../../lib/storage.js';
import { verificationChecks } from '../../lib/domain.js';
import { EMAIL_RE, GSTIN_RE } from '../../lib/utils.js';
import { useToast } from '../ui/Toast.jsx';
import { Badge, SectionHead } from './common.jsx';

const lbl = 'text-xs font-semibold text-gray-600 mb-1 block';
const FIELDS = ['shop', 'contactName', 'phone', 'email', 'gst', 'reg', 'area', 'years', 'address', 'about'];

export function VerifyCard({ v }) {
  const checks = verificationChecks(v), done = checks.filter(c => c.ok).length;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:sticky lg:top-[calc(var(--hdr-h)+16px)]">
      <div className="flex items-center justify-between gap-2"><h3 className="font-bold text-gray-900">Profile checklist</h3><Badge v={v} /></div>
      <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full bg-green-600 transition-all duration-700" style={{ width: done / checks.length * 100 + '%' }} /></div>
      <div className="mt-1 text-xs text-gray-500">{done} of {checks.length} completed</div>
      <ul className="mt-4 space-y-2">
        {checks.map(c => (
          <li key={c.label} className={`flex items-center gap-2 text-sm ${c.ok ? 'text-gray-800' : 'text-gray-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${c.ok ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`} aria-hidden="true">{c.ok ? '✓' : ''}</span>
            {c.label}<span className="sr-only">{c.ok ? ' (done)' : ' (missing)'}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-gray-500 leading-relaxed">The badge confirms your details are complete and correctly formatted. Registration numbers are self-declared and not checked against government records.</p>
    </div>
  );
}

export default function Profile({ v }) {
  const toast = useToast();
  const [f, setF] = useState(() => Object.fromEntries(FIELDS.map(k => [k, v[k] ?? ''])));
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));

  function save(e) {
    e.preventDefault();
    const t = k => String(f[k] ?? '').trim();
    const contactName = t('contactName'), email = t('email'), gst = t('gst').toUpperCase(), shop = t('shop');
    if (!contactName) return toast('Contact name is required.', 'error');
    if (email && !EMAIL_RE.test(email)) return toast('Please enter a valid email address.', 'error');
    if (gst && !GSTIN_RE.test(gst)) return toast('GSTIN format looks incorrect (15 characters, e.g. 22AAAAA0000A1Z5).', 'error');
    const vendors = db.vendors();
    vendors[v.id] = { ...(vendors[v.id] || {}), shop, contactName, phone: t('phone'), email, gst, reg: t('reg'), area: t('area'), years: t('years'),
      address: t('address'), about: t('about'), updatedAt: new Date().toISOString() };
    db.saveVendors(vendors);
    const s = db.session();
    db.saveSession({ ...s, name: shop || contactName, profile: { ...s.profile, name: shop || contactName, shop, contactName } });
    setF(x => ({ ...x, gst }));
    document.activeElement?.blur();
    toast('✅ Profile saved', 'success');
  }

  const inp = (k, label, props = {}) => (
    <div className={props.wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={'vpf-' + k} className={lbl}>{label}</label>
      {props.rows
        ? <textarea id={'vpf-' + k} rows={props.rows} value={f[k]} onChange={set(k)} className="vfield resize-none" />
        : <input id={'vpf-' + k} value={f[k]} onChange={set(k)} type={props.type} min={props.min} maxLength={props.maxLength} placeholder={props.placeholder}
            readOnly={props.readOnly} className={`vfield ${props.className || ''}`} />}
    </div>
  );

  return (
    <section className="vsec space-y-5">
      <SectionHead title="Business profile" sub="Your details appear on every quote you send." />
      <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">
        <form onSubmit={save} noValidate className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 grid sm:grid-cols-2 gap-4">
          {inp('shop', 'Shop / company name', { placeholder: 'Leave blank if independent' })}
          {inp('contactName', 'Contact name *')}
          {inp('phone', 'Phone')}
          {inp('email', 'Business email', { type: 'email' })}
          {inp('gst', 'GSTIN', { maxLength: 15, placeholder: '15-character GSTIN', className: 'uppercase' })}
          {inp('reg', 'DISCOM / MNRE registration no.')}
          {inp('area', 'Service area (cities / districts)')}
          {inp('years', 'Years in business', { type: 'number', min: 0 })}
          {inp('address', 'Business address', { rows: 2, wide: true })}
          {inp('about', 'About your business', { rows: 3, wide: true })}
          <div className="sm:col-span-2 flex justify-end"><button type="submit" className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700">Save profile</button></div>
        </form>
        <VerifyCard v={v} />
      </div>
    </section>
  );
}
