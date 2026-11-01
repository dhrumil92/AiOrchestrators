import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, useDB } from './lib/storage.js';
import { AppCtx } from './AppContext.jsx';
import Header from './components/Header.jsx';
import Login from './components/login/Login.jsx';
import HouseholdPage from './components/household/HouseholdPage.jsx';
import VendorDashboard from './components/vendor/VendorDashboard.jsx';
import AiAdvisor from './components/ai/AiAdvisor.jsx';

export default function App() {
  useDB();                                   // re-render on any data change
  const session = db.session();
  const [tab, setTab] = useState(session?.role === 'vendor' ? 'vendor' : 'household');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiCommand, setAiCommand] = useState(null);

  // Land on the right tab whenever someone signs in.
  useEffect(() => { if (session) setTab(session.role === 'vendor' ? 'vendor' : 'household'); }, [session?.role, session?.loginTime]);

  const goTab = useCallback(t => { setTab(t); window.scrollTo({ top: 0 }); }, []);
  const askAi = useCallback(cmd => { setAiCommand({ ...cmd, nonce: Date.now() }); goTab('ai'); }, [goTab]);
  const ctx = useMemo(() => ({ session, openSettings: () => setSettingsOpen(true), goTab, askAi }), [session, goTab, askAi]);

  return (
    <AppCtx.Provider value={ctx}>
      {!session ? (
        <Login />
      ) : (
        <>
          <Header tab={tab} setTab={goTab} settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen} />
          <main className="max-w-6xl mx-auto px-4 py-6">
            {/* Tabs stay mounted so maps and the chat keep their state when switching. */}
            <div hidden={tab !== 'household'}>{session.role === 'household' && <HouseholdPage active={tab === 'household'} />}</div>
            <div hidden={tab !== 'vendor'}>{session.role === 'vendor' && <VendorDashboard active={tab === 'vendor'} />}</div>
            <div hidden={tab !== 'ai'}><AiAdvisor active={tab === 'ai'} command={aiCommand} /></div>
          </main>
        </>
      )}
    </AppCtx.Provider>
  );
}
