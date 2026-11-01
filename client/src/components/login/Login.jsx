import { useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { signIn } from '../../lib/storage.js';
import { EMAIL_RE } from '../../lib/utils.js';
import { useToast } from '../ui/Toast.jsx';
import Landing from './Landing.jsx';
import { HouseholdShowcase, VendorShowcase } from './Showcase.jsx';

const PATHS = {
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 21v-5h4v5" /></>,
  pin: <><path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
};

/** A labelled input with a leading icon and an inline error. */
function Field({ id, label, icon, error, tint, right, ...input }) {
  const ring = error ? 'border-red-400 bg-red-50/40 focus:ring-red-100' : tint;
  return (
    <div>
      <label htmlFor={id} className="text-gray-700 text-sm font-semibold mb-1.5 block">{label}</label>
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PATHS[icon]}</svg>
        <input id={id} {...input} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined}
          className={`w-full text-gray-900 placeholder-gray-400 rounded-xl pl-11 ${right ? 'pr-16' : 'pr-4'} py-3 text-sm border focus:outline-none focus:bg-white focus:ring-4 transition ${ring}`} />
        {right}
      </div>
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}

/** A hint while choosing a password. The server only requires 8 characters. */
function strength(pw) {
  if (pw.length < 8) return 0;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(pw)).length;
  return pw.length >= 12 && kinds >= 3 ? 3 : kinds >= 2 ? 2 : 1;
}
const STRENGTH = [['Too short', 'bg-red-400', 'text-red-600'], ['Okay', 'bg-amber-400', 'text-amber-700'], ['Good', 'bg-lime-500', 'text-lime-700'], ['Strong', 'bg-green-600', 'text-green-700']];

function AuthStep({ role, initialMode, onBack, onSwitchRole }) {
  const toast = useToast();
  const isHH = role === 'household';
  const [mode, setMode] = useState(initialMode);
  const [f, setF] = useState({ name: '', city: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const set = k => e => { setF(s => ({ ...s, [k]: e.target.value })); setErrors(s => ({ ...s, [k]: undefined })); };
  const signingUp = mode === 'signup';
  const forgot = mode === 'forgot';
  const switchMode = m => { setMode(m); setResetSent(false); setErrors({}); };
  const otherRole = isHH ? 'vendor' : 'household';

  async function submit(e) {
    e.preventDefault();
    const name = f.name.trim(), city = f.city.trim(), email = f.email.trim();
    const bad = {};
    if (!EMAIL_RE.test(email)) bad.email = 'Enter a valid email address.';
    if (signingUp) {
      if (!name) bad.name = isHH ? 'Please enter your name.' : 'Please enter your company name.';
      if (!isHH && !city) bad.city = 'Please enter your city.';
      if (f.password.length < 8) bad.password = 'Use at least 8 characters.';
    } else if (!forgot && !f.password) bad.password = 'Please enter your password.';
    setErrors(bad);
    if (Object.keys(bad).length) return;
    setBusy(true);
    try {
      if (forgot) { await api.forgotPassword(email); setResetSent(true); return; }
      signIn(signingUp
        ? await api.signup({ role, name, email, password: f.password, ...(isHH ? {} : { city }) })
        : await api.login({ email, password: f.password }));
    } catch (err) {
      if (err.code === 'EMAIL_TAKEN') switchMode('login');
      if (!forgot) setF(s => ({ ...s, password: '' }));
      toast(err.code === 'EMAIL_TAKEN' ? 'That email already has an account. Please log in.' : err.message, 'error');
    } finally { setBusy(false); }
  }

  const tint = isHH ? 'bg-amber-50/50 border-amber-200 focus:border-amber-500 focus:ring-amber-100' : 'bg-green-50/40 border-green-200 focus:border-green-600 focus:ring-green-100';
  const tab = on => `flex-1 py-2 rounded-lg text-sm font-bold transition ${on ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`;
  const roleTab = on => `flex-1 py-1.5 rounded-lg text-xs font-bold transition ${on ? (isHH ? 'bg-amber-400 text-gray-900' : 'bg-green-600 text-white') : 'text-gray-500 hover:text-gray-800'}`;
  const level = strength(f.password);
  const title = forgot ? 'Reset your password' : signingUp ? (isHH ? 'Create your household account' : 'Create your vendor account') : 'Welcome back';
  const sub = forgot ? 'We will email you a link to choose a new password.'
    : signingUp ? (isHH ? 'Post your need and get quotes from local installers.' : 'Quote on real enquiries and track every installation.')
    : 'Log in to see your requests and quotes.';
  return (
    <div className="relative w-full max-w-6xl bounce-in my-auto">
      <div className="flex items-center justify-between mb-5">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition">
          <span aria-hidden="true">←</span> Back to home
        </button>
        <div className="flex items-center gap-2 text-gray-900 font-extrabold"><span className="text-2xl" aria-hidden="true">☀️</span> PM Surya Ghar</div>
      </div>
      <div className="grid gap-6 items-start lg:grid-cols-[1.25fr_1fr]">
        <div>{isHH ? <HouseholdShowcase /> : <VendorShowcase />}</div>
        <form onSubmit={submit} className={`order-first lg:order-none bg-white border rounded-3xl p-6 sm:p-8 shadow-xl lg:sticky lg:top-4 ${isHH ? 'border-amber-100 shadow-amber-200/50' : 'border-green-100 shadow-green-200/50'}`} noValidate>
          {!forgot && (
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1 mb-6" role="group" aria-label="Account type">
              <button type="button" onClick={() => !isHH && onSwitchRole('household', mode)} aria-pressed={isHH} className={roleTab(isHH)}>🏠 Household</button>
              <button type="button" onClick={() => isHH && onSwitchRole('vendor', mode)} aria-pressed={!isHH} className={roleTab(!isHH)}>🔧 Vendor</button>
            </div>
          )}
          <h2 className="text-gray-900 font-extrabold text-2xl tracking-tight">{title}</h2>
          <p className="text-sm text-gray-500 mt-1 mb-6">{sub}</p>

          {!forgot && (
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
              {signingUp && <Field id="a-name" label={isHH ? 'Your name' : 'Company name'} icon={isHH ? 'user' : 'building'} tint={tint} error={errors.name} value={f.name} onChange={set('name')} autoFocus
                placeholder={isHH ? 'e.g. Ravi Kumar' : 'e.g. SunPower Solutions'} autoComplete={isHH ? 'name' : 'organization'} />}
              {signingUp && !isHH && <Field id="a-city" label="City" icon="pin" tint={tint} error={errors.city} value={f.city} onChange={set('city')}
                placeholder="e.g. Vadodara" autoComplete="address-level2" />}
              <Field id="a-email" label="Email" icon="mail" tint={tint} error={errors.email} type="email" value={f.email} onChange={set('email')} autoFocus={!signingUp}
                placeholder="you@example.com" autoComplete="email" />
              {!forgot && (
                <div>
                  <Field id="a-password" label="Password" icon="lock" tint={tint} error={errors.password} type={show ? 'text' : 'password'} value={f.password} onChange={set('password')}
                    placeholder={signingUp ? 'At least 8 characters' : 'Your password'} autoComplete={signingUp ? 'new-password' : 'current-password'}
                    right={<button type="button" onClick={() => setShow(s => !s)} aria-pressed={show} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 hover:text-gray-900 px-1">{show ? 'Hide' : 'Show'}</button>} />
                  {signingUp && f.password && (
                    <div className="mt-2" aria-live="polite">
                      <div className="flex gap-1">{[0, 1, 2, 3].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= level && (level > 0 || i === 0) ? STRENGTH[level][1] : 'bg-gray-200'}`} />)}</div>
                      <p className={`mt-1 text-xs font-semibold ${STRENGTH[level][2]}`}>{STRENGTH[level][0]}</p>
                    </div>
                  )}
                  {!signingUp && <button type="button" onClick={() => switchMode('forgot')} className="text-xs font-semibold text-gray-600 hover:text-gray-900 underline mt-2">Forgot password?</button>}
                </div>
              )}
            </div>
          )}

          {!(forgot && resetSent) && (
            <button type="submit" disabled={busy} className="cta-primary mt-6 w-full py-3.5 rounded-2xl font-extrabold text-white text-base disabled:opacity-60">{busy ? 'Please wait…' : forgot ? 'Send reset link →' : signingUp ? 'Create account →' : 'Log in →'}</button>
          )}
          {forgot && <button type="button" onClick={() => switchMode('login')} className="mt-4 w-full text-sm font-semibold text-gray-600 hover:text-gray-900">← Back to log in</button>}

          {!forgot && (
            <p className="mt-5 text-center text-sm text-gray-500">
              {signingUp ? 'Already have an account?' : 'New here?'}{' '}
              <button type="button" onClick={() => switchMode(signingUp ? 'login' : 'signup')} className="font-bold text-green-700 hover:underline">{signingUp ? 'Log in' : 'Create an account'}</button>
            </p>
          )}
          <ul className="mt-6 pt-5 border-t border-gray-100 space-y-2 text-xs text-gray-500">
            <li className="flex gap-2"><span aria-hidden="true">🔒</span>Your password is stored encrypted, never as plain text.</li>
            <li className="flex gap-2"><span aria-hidden="true">{isHH ? '🛡️' : '⚖️'}</span>{isHH ? 'Vendors see your city, not your phone or address, until you accept a quote.' : 'Quotes are ranked by fixed rules. Notes never affect the ranking.'}</li>
          </ul>
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
  const [step, setStep] = useState(null);       // null | { role: 'household' | 'vendor', mode: 'signup' | 'login' }
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
        ? <AuthStep key={step.role + step.mode} role={step.role} initialMode={step.mode} onBack={() => setStep(null)} onSwitchRole={(role, mode) => setStep({ role, mode })} />
        : <Landing onPick={(role, mode) => setStep({ role, mode })} />}
    </div>
  );
}
