import { useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { signIn } from '../../lib/storage.js';
import { EMAIL_RE } from '../../lib/utils.js';
import { useToast } from '../ui/Toast.jsx';
import Landing from './Landing.jsx';
import { HouseholdShowcase, VendorShowcase } from './Showcase.jsx';

function AuthStep({ role, initialName, onBack }) {
  const toast = useToast();
  const isHH = role === 'household';
  const [mode, setMode] = useState('signup');
  const [f, setF] = useState({ name: initialName || '', city: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  const signingUp = mode === 'signup';

  async function submit(e) {
    e.preventDefault();
    const name = f.name.trim(), city = f.city.trim(), email = f.email.trim();
    if (!EMAIL_RE.test(email)) return toast('Enter a valid email address.', 'error');
    if (signingUp) {
      if (!name) return toast(isHH ? 'Please enter your name.' : 'Please enter your company name.', 'error');
      if (!isHH && !city) return toast('Please enter your city.', 'error');
      if (f.password.length < 8) return toast('Use at least 8 characters for your password.', 'error');
    } else if (!f.password) return toast('Please enter your password.', 'error');
    setBusy(true);
    try {
      signIn(signingUp
        ? await api.signup({ role, name, email, password: f.password, ...(isHH ? {} : { city }) })
        : await api.login({ email, password: f.password }));
    } catch (err) {
      if (err.code === 'EMAIL_TAKEN') setMode('login');
      setF(s => ({ ...s, password: '' }));
      toast(err.code === 'EMAIL_TAKEN' ? 'That email already has an account. Please log in.' : err.message, 'error');
    } finally { setBusy(false); }
  }

  const label = `${isHH ? 'text-amber-700' : 'text-green-700'} text-xs font-bold uppercase tracking-widest mb-1.5 block`;
  const field = `w-full text-gray-800 placeholder-gray-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white transition ${isHH ? 'bg-amber-50/60 border border-amber-200' : 'bg-green-50/50 border border-green-200'}`;
  const tab = on => `flex-1 py-2 rounded-lg text-sm font-bold transition ${on ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`;
  return (
    <div className="relative w-full max-w-6xl bounce-in my-auto">
      <div className="grid gap-6 items-start lg:grid-cols-[1.25fr_1fr]">
        <div>{isHH ? <HouseholdShowcase /> : <VendorShowcase />}</div>
        <form onSubmit={submit} className="order-first lg:order-none bg-white border border-amber-100 rounded-3xl p-7 shadow-xl shadow-amber-200/50 lg:sticky lg:top-4" noValidate>
          <div className="flex items-center gap-3 mb-5">
            <button type="button" onClick={onBack} aria-label="Back" className="text-gray-500 hover:text-gray-800 text-2xl leading-none transition">←</button>
            <h2 className="text-gray-800 font-extrabold text-xl">{isHH ? '🏠 Household account' : '🔧 Vendor account'}</h2>
          </div>
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1 mb-5" role="group" aria-label="Log in or sign up">
            <button type="button" onClick={() => setMode('signup')} aria-pressed={signingUp} className={tab(signingUp)}>Sign up</button>
            <button type="button" onClick={() => setMode('login')} aria-pressed={!signingUp} className={tab(!signingUp)}>Log in</button>
          </div>
          <div className="space-y-4">
            {signingUp && (
              <div><label htmlFor="a-name" className={label}>{isHH ? 'Your name' : 'Company name'}</label>
                <input id="a-name" value={f.name} onChange={set('name')} autoComplete={isHH ? 'name' : 'organization'} className={field} /></div>
            )}
            {signingUp && !isHH && (
              <div><label htmlFor="a-city" className={label}>City</label>
                <input id="a-city" value={f.city} onChange={set('city')} autoComplete="address-level2" className={field} /></div>
            )}
            <div><label htmlFor="a-email" className={label}>Email</label>
              <input id="a-email" type="email" value={f.email} onChange={set('email')} autoComplete="email" className={field} /></div>
            <div><label htmlFor="a-password" className={label}>Password</label>
              <input id="a-password" type="password" value={f.password} onChange={set('password')} autoComplete={signingUp ? 'new-password' : 'current-password'} className={field} />
              {signingUp && <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>}</div>
          </div>
          <button type="submit" disabled={busy} className="cta-primary mt-6 w-full py-3.5 rounded-2xl font-extrabold text-white text-base disabled:opacity-60">{busy ? 'Please wait…' : signingUp ? 'Create account →' : 'Log in →'}</button>
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
        ? <AuthStep key={step} role={step} initialName={name} onBack={() => setStep(null)} />
        : <Landing name={name} setName={setName} onPick={setStep} />}
    </div>
  );
}
