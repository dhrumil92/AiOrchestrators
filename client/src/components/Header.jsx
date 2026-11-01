import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { signOut } from '../lib/storage.js';
import { useApp } from '../AppContext.jsx';
import { Icon } from './ui/bits.jsx';
import { useToast } from './ui/Toast.jsx';

/** Logged-in password change. Other devices are logged out; this one stays in. */
function ChangePassword() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!f.current) return toast('Enter your current password.', 'error');
    if (f.next.length < 8) return toast('Use at least 8 characters for your new password.', 'error');
    if (f.next !== f.confirm) return toast('The two new passwords do not match.', 'error');
    setBusy(true);
    try {
      await api.changePassword(f.current, f.next);
      toast('Password changed. Other devices have been logged out.', 'success');
      setF({ current: '', next: '', confirm: '' });
      setOpen(false);
    } catch (err) {
      toast(err.message, 'error');
    } finally { setBusy(false); }
  }

  const field = 'w-full text-gray-800 rounded-lg px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:border-green-400';
  return (
    <div className="mt-4">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="text-sm font-bold text-gray-800 hover:text-green-700">🔒 Change password {open ? '▴' : '▾'}</button>
      {open && (
        <form onSubmit={submit} noValidate className="mt-2 space-y-2">
          <input type="password" aria-label="Current password" placeholder="Current password" value={f.current} onChange={set('current')} autoComplete="current-password" className={field} />
          <input type="password" aria-label="New password" placeholder="New password (at least 8 characters)" value={f.next} onChange={set('next')} autoComplete="new-password" className={field} />
          <input type="password" aria-label="Repeat new password" placeholder="Repeat new password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" className={field} />
          <button type="submit" disabled={busy} className="w-full text-sm font-semibold px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-60">{busy ? 'Please wait…' : 'Save new password'}</button>
        </form>
      )}
    </div>
  );
}

export default function Header({ tab, setTab, settingsOpen, setSettingsOpen }) {
  const { session } = useApp();
  const ref = useRef(null);
  const panelRef = useRef(null);
  const btnRef = useRef(null);
  const [health, setHealth] = useState(null);
  const isVendor = session.role === 'vendor';

  // Publish header height as --hdr-h so sticky elements sit right below it.
  useLayoutEffect(() => {
    const el = ref.current;
    const sync = () => document.documentElement.style.setProperty('--hdr-h', el.offsetHeight + 'px');
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Close settings on outside click / Escape.
  useEffect(() => {
    if (!settingsOpen) return;
    const onDown = e => { if (!panelRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setSettingsOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setSettingsOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [settingsOpen, setSettingsOpen]);

  useEffect(() => {
    if (settingsOpen) api.health().then(setHealth).catch(() => setHealth(null));
  }, [settingsOpen]);

  const logout = () => { setSettingsOpen(false); signOut(); };
  const tabs = [
    !isVendor && { id: 'household', icon: '🏠', label: 'I Need Solar' },
    isVendor && { id: 'vendor', icon: '🔧', label: 'Vendor Dashboard' },
    { id: 'ai', icon: '🤖', label: 'AI Advisor' },
  ].filter(Boolean);

  return (
    <header ref={ref} className="sticky top-0 z-50 bg-white/95 backdrop-blur shadow-sm">
      <div className="flag-strip" />
      <div className="px-4 py-2.5 border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="text-3xl" aria-hidden="true">☀️</div>
            <div className="min-w-0">
              <h1 className="text-gray-900 font-extrabold text-lg leading-tight tracking-tight">PM Surya Ghar</h1>
              <p className="text-green-700 text-xs font-medium truncate">मुफ्त बिजली योजना — Solar Marketplace</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-2 pr-3 py-1">
              <span className="text-base" aria-hidden="true">{isVendor ? '🔧' : '🏠'}</span>
              <span className="text-gray-800 text-xs font-semibold max-w-[110px] sm:max-w-[180px] truncate">{session.name}</span>
            </div>
            <div className="subsidy-badge hidden xl:block text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm">✅ Subsidy up to ₹78,000</div>
            <button ref={btnRef} onClick={() => setSettingsOpen(o => !o)} aria-haspopup="dialog" aria-expanded={settingsOpen} title="Settings" aria-label="Settings"
              className="w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-green-50 hover:border-green-300 text-gray-600 hover:text-green-700 flex items-center justify-center transition">
              <Icon name="gear" size={18} />
            </button>
            <button onClick={logout} className="hidden sm:inline-flex text-sm font-semibold text-gray-600 hover:text-green-700 px-2 py-1 rounded-lg">Logout</button>
          </div>
        </div>
      </div>

      {settingsOpen && (
        <div ref={panelRef} role="dialog" aria-label="Settings"
          className="absolute top-full mt-2 w-[min(360px,calc(100vw-2rem))] bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 fade-in"
          style={{ right: 'max(1rem, calc((100vw - 72rem) / 2 + 1rem))' }}>
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-gray-900">Settings</h2>
            <button onClick={() => setSettingsOpen(false)} className="text-gray-500 hover:text-gray-800 text-xl leading-none" aria-label="Close settings">×</button>
          </div>
          <div className="mt-4">
            <div className="text-sm font-bold text-gray-800">🤖 AI features</div>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">Photo review, voice and explanations run on the server. If AI is unavailable, the app shows a labelled basic explanation and all calculated figures still work.</p>
            <ul className="mt-2 space-y-1 text-xs font-semibold">
              <li className={health?.database === 'ok' ? 'text-green-700' : 'text-red-700'}>{health?.database === 'ok' ? '✅ Database connected' : '⚠️ Database not connected'}</li>
              <li className={health?.ai?.gemini ? 'text-green-700' : 'text-amber-700'}>{health?.ai?.gemini ? '✅ Gemini configured' : '⚠️ Gemini not configured'}</li>
              <li className={health?.ai?.groq ? 'text-green-700' : 'text-amber-700'}>{health?.ai?.groq ? '✅ Groq configured' : '⚠️ Groq not configured'}</li>
            </ul>
          </div>
          <ChangePassword />
          <button onClick={logout} className="mt-4 w-full text-sm font-semibold px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">Logout</button>
        </div>
      )}

      <nav className="bg-white border-b border-gray-100" aria-label="Main">
        <div className="max-w-6xl mx-auto flex">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
              className={`tab-btn flex-1 py-3 text-sm flex items-center justify-center gap-2 text-gray-600 ${tab === t.id ? 'active' : ''}`}>
              <span aria-hidden="true">{t.icon}</span> <span className="font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}
