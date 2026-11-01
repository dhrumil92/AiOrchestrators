import { useMemo, useState } from 'react';
import { db } from '../../lib/storage.js';
import { normPhone, isValidPhone, EMAIL_RE, hashPin } from '../../lib/utils.js';
import { vendorIdFromPhone } from '../../lib/domain.js';
import { useToast } from '../ui/Toast.jsx';
import Landing from './Landing.jsx';
import { HouseholdShowcase, VendorShowcase } from './Showcase.jsx';

const field = 'w-full text-gray-800 placeholder-gray-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white transition';
const THEME = {
  household: { label: 'text-amber-700', input: 'bg-amber-50/60 border border-amber-200' },
  vendor:    { label: 'text-green-700', input: 'bg-green-50/50 border border-green-200' },
};

function Field({ role, id, label, hint, as = 'input', ...props }) {
  const t = THEME[role];
  const Tag = as;
  return (
    <div>
      <label htmlFor={id} className={`${t.label} text-xs font-bold uppercase tracking-widest mb-1.5 block`}>{label}</label>
      <Tag id={id} className={`${field} ${t.input} ${as === 'textarea' ? 'resize-none py-3' : ''}`} {...props} />
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function ProfileStep({ role, initialName, onBack }) {
  const toast = useToast();
  const [f, setF] = useState(role === 'household'
    ? { name: initialName, phone: '', email: '', address: '', pin: '' }
    : { shop: '', name: initialName, phone: '', pin: '' });
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  const isHH = role === 'household';

  async function submit(e) {
    e.preventDefault();
    const name = f.name.trim(), phone = f.phone.trim();
    if (isHH) {
      if (!name || !phone || !f.email.trim() || !f.address.trim()) return toast('Please fill in all required fields.', 'error');
      if (!EMAIL_RE.test(f.email.trim())) return toast('Enter a valid email address.', 'error');
    } else if (!name || !phone) return toast('Please enter your name and phone number.', 'error');
    if (!isValidPhone(phone)) return toast('Enter a valid 10-digit mobile number.', 'error');
    if (!/^\d{4}$/.test(f.pin)) return toast('Please enter a 4-digit PIN.', 'error');

    // PIN: first sign-in with a number creates it; later sign-ins must match.
    setBusy(true);
    const accId = (isHH ? 'h_' : 'v_') + normPhone(phone);
    const accounts = db.accounts();
    const pinHash = await hashPin(accId, f.pin);
    setBusy(false);
    if (accounts[accId] && accounts[accId].pinHash !== pinHash) { setF(s => ({ ...s, pin: '' })); return toast('Incorrect PIN for this phone number.', 'error'); }
    if (!accounts[accId]) {
      db.saveAccounts({ ...accounts, [accId]: { pinHash, createdAt: new Date().toISOString() } });
      toast('🔒 Account created. Remember your PIN for next time.', 'info');
    }

    let profile;
    if (isHH) profile = { name, phone, email: f.email.trim(), address: f.address.trim() };
    else {
      const shop = f.shop.trim();
      profile = { name: shop || name, shop, contactName: name, phone };
      const vendors = db.vendors(), vid = vendorIdFromPhone(phone);
      db.saveVendors({ ...vendors, [vid]: { ...(vendors[vid] || {}), shop, contactName: name, phone } });
    }
    db.saveSession({ role, name: profile.name, profile, loginTime: new Date().toISOString() });
  }

  return (
    <div className="relative w-full max-w-6xl bounce-in my-auto">
      <div className="grid gap-6 items-start lg:grid-cols-[1.25fr_1fr]">
        <div>{isHH ? <HouseholdShowcase /> : <VendorShowcase />}</div>
        <form onSubmit={submit} className="order-first lg:order-none bg-white border border-amber-100 rounded-3xl p-7 shadow-xl shadow-amber-200/50 lg:sticky lg:top-4" noValidate>
          <div className="flex items-center gap-3 mb-6">
            <button type="button" onClick={onBack} aria-label="Back" className="text-gray-500 hover:text-gray-800 text-2xl leading-none transition">←</button>
            <div>
              <h2 className="text-gray-800 font-extrabold text-xl">{isHH ? '🏠 Household Profile' : '🔧 Vendor Sign-in'}</h2>
              <p className="text-gray-500 text-xs mt-0.5">{isHH ? 'Tell us a bit more so vendors can reach you' : 'Join as a solar partner. Your details appear on every quote'}</p>
            </div>
          </div>
          <div className="space-y-4">
            {isHH ? (<>
              <Field role={role} id="p-name" label="👤 Full Name *" value={f.name} onChange={set('name')} placeholder="e.g. Ravi Kumar" autoComplete="name" />
              <Field role={role} id="p-phone" label="📱 Contact Number *" value={f.phone} onChange={set('phone')} type="tel" inputMode="numeric" maxLength={10} placeholder="e.g. 9876543210" autoComplete="tel" />
              <Field role={role} id="p-pin" label="🔒 4-digit PIN *" value={f.pin} onChange={set('pin')} type="password" inputMode="numeric" maxLength={4} placeholder="••••" hint="First time? This creates your PIN. Returning? Enter the PIN you set." />
              <Field role={role} id="p-email" label="📧 Email Address *" value={f.email} onChange={set('email')} type="email" placeholder="e.g. ravi@email.com" autoComplete="email" />
              <Field role={role} id="p-address" label="🏠 Complete Address *" as="textarea" rows={3} value={f.address} onChange={set('address')} placeholder="House no., Street, Area, City, State, PIN code" autoComplete="street-address" />
            </>) : (<>
              <Field role={role} id="p-shop" label="🏪 Shop / Company Name (if any)" value={f.shop} onChange={set('shop')} placeholder="Leave blank if you work independently" autoComplete="organization" />
              <Field role={role} id="p-name" label="👤 Owner / Contact Name *" value={f.name} onChange={set('name')} placeholder="e.g. Suresh Mehta" autoComplete="name" />
              <Field role={role} id="p-phone" label="📱 Phone Number *" value={f.phone} onChange={set('phone')} type="tel" inputMode="numeric" maxLength={10} placeholder="e.g. 9876543210" autoComplete="tel" />
              <Field role={role} id="p-pin" label="🔒 4-digit PIN *" value={f.pin} onChange={set('pin')} type="password" inputMode="numeric" maxLength={4} placeholder="••••" hint="First time? This creates your PIN. Returning? Enter the PIN you set." />
            </>)}
          </div>
          <button type="submit" disabled={busy} className="cta-primary mt-6 w-full py-3.5 rounded-2xl font-extrabold text-white text-base disabled:opacity-60">Enter the App →</button>
        </form>
      </div>
    </div>
  );
}

export default function Login() {
  const [step, setStep] = useState(null);       // null | 'household' | 'vendor'
  const [name, setName] = useState('');
  const stars = useMemo(() => Array.from({ length: 80 }, (_, i) => {
    const size = Math.random() * 6 + 2;
    return { i, size, top: Math.random() * 100, left: Math.random() * 100, o: Math.random() * 0.35 + 0.1, d: Math.random() * 3 + 2, delay: Math.random() * 3 };
  }), []);
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-start px-4 py-8 overflow-y-auto"
      style={{ background: 'linear-gradient(160deg,#fffbeb 0%,#fff7ed 45%,#ecfdf5 100%)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {stars.map(s => (
          <div key={s.i} style={{ position: 'absolute', width: s.size, height: s.size, borderRadius: '50%', top: s.top + '%', left: s.left + '%',
            background: `rgba(245,158,11,${s.o})`, animation: `twinkle ${s.d}s ease-in-out ${s.delay}s infinite` }} />
        ))}
      </div>
      {step
        ? <ProfileStep key={step} role={step} initialName={name} onBack={() => setStep(null)} />
        : <Landing name={name} setName={setName} onPick={setStep} />}
    </div>
  );
}
