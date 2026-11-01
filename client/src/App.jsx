import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, refreshMarket, restoreSession, useDB } from './lib/storage.js';
import { AppCtx } from './AppContext.jsx';
import Header from './components/Header.jsx';
import Login from './components/login/Login.jsx';
import HouseholdPage from './components/household/HouseholdPage.jsx';
import VendorDashboard from './components/vendor/VendorDashboard.jsx';
import AiAdvisor from './components/ai/AiAdvisor.jsx';

const REFRESH_MS = 5000;

export default function App() {
  useDB();                                   // re-render on any data change
  const session = db.session();
  const [tab, setTab] = useState(session?.role === 'vendor' ? 'vendor' : 'household');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => { restoreSession(); }, []);

  // Keep data fresh so a quote sent in another tab appears without a reload.
  useEffect(() => {
    if (!session) return;
    refreshMarket();
    const t = setInterval(refreshMarket, REFRESH_MS);
    return () => clearInterval(t);
  }, [session?.loginTime]);

  // Land on the right tab whenever someone signs in.
  useEffect(() => { if (session) setTab(session.role === 'vendor' ? 'vendor' : 'household'); }, [session?.role, session?.loginTime]);

  const goTab = useCallback(t => { setTab(t); window.scrollTo({ top: 0 }); }, []);
  const ctx = useMemo(() => ({ session, goTab }), [session, goTab]);
  const serverError = db.serverError();
  if (!db.authReady()) return <p className="text-center text-gray-500 py-16">Loading…</p>;

  return (
    <AppCtx.Provider value={ctx}>
      {serverError && <div role="alert" className="relative z-[10000] bg-red-600 text-white text-sm font-semibold text-center px-4 py-2">{serverError}</div>}
      {!session ? (
        <Login />
      ) : (
        <>
          <Header tab={tab} setTab={goTab} settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen} />
          <main className="max-w-6xl mx-auto px-4 py-6">
            {!db.loaded() ? <p className="text-center text-gray-500 py-16">Loading…</p> : (
              <>
                {/* Tabs stay mounted so maps and the advisor keep their state when switching. */}
                <div hidden={tab !== 'household'}>{session.role === 'household' && <HouseholdPage key={session.email} active={tab === 'household'} />}</div>
                <div hidden={tab !== 'vendor'}>{session.role === 'vendor' && <VendorDashboard key={session.vendorId} active={tab === 'vendor'} />}</div>
                <div hidden={tab !== 'ai'}><AiAdvisor key={session.email} /></div>
              </>
            )}
          </main>
        </>
      )}
    </AppCtx.Provider>
  );
}
