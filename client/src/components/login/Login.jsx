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
  const [resetSent, setResetSent] = useState(false);
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  const signingUp = mode === 'signup';
  const forgot = mode === 'forgot';
  const switchMode = m => { setMode(m); setResetSent(false); };

  async function submit(e) {
    e.preventDefault();
    const name = f.name.trim(), city = f.city.trim(), email = f.email.trim();
    if (!EMAIL_RE.test(email)) return toast('Enter a valid email address.', 'error');
    if (forgot) {
      setBusy(true);
      try { await api.forgotPassword(email); setResetSent(true); }
      catch (err) { toast(err.message, 'error'); }
      finally { setBusy(false); }
      return;
    }
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
      if (err.code === 'EMAIL_TAKEN') switchMode('login');
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
          {forgot ? (
            <div className="mb-5">
              <h3 className="text-gray-800 font-bold">Forgot your password?</h3>
              <p className="text-sm text-gray-600 mt-1">Enter your account email. We will send you a link to choose a new password.</p>
            </div>
          ) : (
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1 mb-5" role="group" aria-label="Log in or sign up">
              <button type="button" onClick={() => switchMode('signup')} aria-pressed={signingUp} className={tab(signingUp)}>Sign up</button>
              <button type="button" onClick={() => switchMode('login')} aria-pressed={!signingUp} className={tab(!signingUp)}>Log in</button>
            </div>
          )}
          {forgot && resetSent ? (
            <div role="status" className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
              If <b>{f.email.trim()}</b> has an account, a reset link is on its way. It works for 1 hour. Check your spam folder too.
            </div>
          ) : (
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
            {!forgot && (
              <div><label htmlFor="a-password" className={label}>Password</label>
                <input id="a-password" type="password" value={f.password} onChange={set('password')} autoComplete={signingUp ? 'new-password' : 'current-password'} className={field} />
                {signingUp && <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>}
                {mode === 'login' && <button type="button" onClick={() => switchMode('forgot')} className="text-xs font-semibold text-gray-600 hover:text-gray-900 underline mt-1.5">Forgot password?</button>}</div>
            )}
          </div>
          )}
          {!(forgot && resetSent) && (
            <button type="submit" disabled={busy} className="cta-primary mt-6 w-full py-3.5 rounded-2xl font-extrabold text-white text-base disabled:opacity-60">{busy ? 'Please wait…' : forgot ? 'Send reset link →' : signingUp ? 'Create account →' : 'Log in →'}</button>
          )}
          {forgot && <button type="button" onClick={() => switchMode('login')} className="mt-4 w-full text-sm font-semibold text-gray-600 hover:text-gray-900">← Back to log in</button>}
        </form>
      </div>
    </div>
  );
}

/** Opened from the emailed link (?reset=token). Success logs the user in. */
function ResetStep({ token, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (f.password.length < 8) return toast('Use at least 8 characters for your password.', 'error');
    if (f.password !== f.confirm) return toast('The two passwords do not match.', 'error');
    setBusy(true);
    try {
      const user = await api.resetPassword(token, f.password);
      toast('Your password has been changed.', 'success');
      onDone(user);
    } catch (err) {
      if (err.code === 'INVALID_RESET_LINK') setInvalid(true);
      else toast(err.message, 'error');
      setBusy(false);
    }
  }

  const label = 'text-green-700 text-xs font-bold uppercase tracking-widest mb-1.5 block';
  const field = 'w-full text-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white transition bg-green-50/50 border border-green-200';
  return (
    <form onSubmit={submit} noValidate className="relative w-full max-w-md bounce-in my-auto bg-white border border-amber-100 rounded-3xl p-7 shadow-xl shadow-amber-200/50">
      <h2 className="text-gray-800 font-extrabold text-xl mb-1">🔒 Choose a new password</h2>
      {invalid ? (
        <>
          <p role="alert" className="mt-3 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">This reset link is invalid or has expired. Links work once, for 1 hour.</p>
          <button type="button" onClick={() => onDone(null)} className="cta-primary mt-6 w-full py-3.5 rounded-2xl font-extrabold text-white text-base">Ask for a new link →</button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-5">After this you will be logged out on other devices.</p>
          <div className="space-y-4">
            <div><label htmlFor="r-password" className={label}>New password</label>
              <input id="r-password" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" className={field} />
              <p className="text-xs text-gray-500 mt-1">At least 8 characters</p></div>
            <div><label htmlFor="r-confirm" className={label}>Repeat new password</label>
              <input id="r-confirm" type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" className={field} /></div>
          </div>
          <button type="submit" disabled={busy} className="cta-primary mt-6 w-full py-3.5 rounded-2xl font-extrabold text-white text-base disabled:opacity-60">{busy ? 'Please wait…' : 'Save new password →'}</button>
          <button type="button" onClick={() => onDone(null)} className="mt-4 w-full text-sm font-semibold text-gray-600 hover:text-gray-900">Cancel</button>
        </>
      )}
    </form>
  );
}

export default function Login({ resetToken, onResetDone }) {
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
      {resetToken
        ? <ResetStep token={resetToken} onDone={onResetDone} />
        : step
        ? <AuthStep key={step} role={step} initialName={name} onBack={() => setStep(null)} />
        : <Landing name={name} setName={setName} onPick={setStep} />}
    </div>
  );
}
