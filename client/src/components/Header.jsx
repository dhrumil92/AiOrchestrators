import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { db } from '../lib/storage.js';
import { loadSampleData } from '../lib/domain.js';
import { useApp } from '../AppContext.jsx';
import { useToast } from './ui/Toast.jsx';
import { Icon } from './ui/bits.jsx';

export default function Header({ tab, setTab, settingsOpen, setSettingsOpen }) {
  const { session } = useApp();
  const toast = useToast();
  const ref = useRef(null);
  const panelRef = useRef(null);
  const btnRef = useRef(null);
  const [key, setKey] = useState(db.apiKey());
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

  const saveKey = () => {
    if (!key.trim()) return toast('Please enter an API key', 'error');
    db.saveApiKey(key.trim());
    toast('API key saved!', 'success');
  };
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
            <div className="subsidy-badge hidden md:block text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm">✅ Subsidy up to ₹78,000</div>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-2 pr-3 py-1">
              <span className="text-base" aria-hidden="true">{isVendor ? '🔧' : '🏠'}</span>
              <span className="text-gray-800 text-xs font-semibold max-w-[110px] sm:max-w-[180px] truncate">{session.name}</span>
              <span className="text-gray-500 text-xs hidden sm:inline">({isVendor ? 'Vendor' : 'Household'})</span>
            </div>
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
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">Voice form-filling, terrace photo analysis, quote comparison and SuryaBot use Google Gemini. Paste a free API key. It's stored only in this browser.</p>
            <div className="mt-3 flex gap-2">
              <input autoFocus type="password" value={key} onChange={e => setKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveKey()}
                placeholder="AIza…" aria-label="Gemini API key" className="flex-1 min-w-0 bg-white border border-gray-200 text-gray-800 text-sm px-3 py-2 rounded-lg placeholder-gray-400" />
              <button onClick={saveKey} className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">Save</button>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-green-700 hover:text-green-800 text-xs font-semibold underline">Get a free key →</a>
              {db.apiKey() && <span className="text-xs text-green-700 font-semibold">✅ Active</span>}
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="text-sm font-bold text-gray-800">🎭 Demo data</div>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">Adds sample requests and quotes so you can try the app. For testing only, not real customers.</p>
            <button onClick={() => { loadSampleData(session); setSettingsOpen(false); toast('🎭 Sample data loaded: 2 requests, 3 quotes.', 'success'); }}
              className="mt-2 w-full text-sm font-semibold px-4 py-2 rounded-lg border border-yellow-300 bg-yellow-50 hover:bg-yellow-100 text-yellow-900 transition">Load sample data</button>
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
