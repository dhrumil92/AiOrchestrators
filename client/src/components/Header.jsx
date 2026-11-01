import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { db } from '../lib/storage.js';
import { useApp } from '../AppContext.jsx';
import { Icon } from './ui/bits.jsx';

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

  const vendors = db.vendorList();
  const asVendor = vendorId => {
    const v = vendors.find(x => x.id === vendorId);
    if (v) db.saveSession({ role: 'vendor', name: v.name, vendorId: v.id, profile: {}, loginTime: new Date().toISOString() });
  };
  const asHousehold = () => db.saveSession({ role: 'household', name: 'Meena Patel', profile: { name: 'Meena Patel' }, loginTime: new Date().toISOString() });
  const logout = () => { setSettingsOpen(false); db.clearSession(); };
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
            <div className="flex rounded-full border border-gray-200 bg-gray-50 p-0.5 text-xs font-semibold" role="group" aria-label="Demo role">
              <button onClick={asHousehold} aria-pressed={!isVendor} className={`px-3 py-1 rounded-full ${!isVendor ? 'bg-green-600 text-white' : 'text-gray-600'}`}>Household</button>
              <button onClick={() => asVendor(session.vendorId || vendors[0]?.id)} aria-pressed={isVendor} className={`px-3 py-1 rounded-full ${isVendor ? 'bg-green-600 text-white' : 'text-gray-600'}`}>Vendor</button>
            </div>
            {isVendor && (
              <select value={session.vendorId} onChange={e => asVendor(e.target.value)} aria-label="Vendor" className="hidden sm:block max-w-[170px] border border-gray-200 rounded-full px-2 py-1 text-xs bg-white">
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            )}
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
