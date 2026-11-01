import { useCallback, useEffect, useState } from 'react';
import { db, useDB } from '../../lib/storage.js';
import { LAST_STAGE, currentHousehold, myRequests } from '../../lib/domain.js';
import { VIEWS, summarize, viewFromHash } from '../../lib/householdView.js';
import { useApp } from '../../AppContext.jsx';
import Dashboard from './Dashboard.jsx';
import EligibilityCheck from './EligibilityCheck.jsx';
import MyRequests from './MyRequests.jsx';
import RequestForm from './RequestForm.jsx';
import WhySolar, { SubsidyRef } from './WhySolar.jsx';

const TITLES = {
  home: ['Home', 'Where you are and what to do next.'],
  new: ['New request', 'Check you can get the subsidy, then tell vendors what you need.'],
  requests: ['My requests', 'Your requests, vendor quotes and installation progress.'],
  learn: ['Learn about solar', 'How the subsidy works and why solar pays off.'],
};

function PageHead({ view }) {
  const [title, sub] = TITLES[view];
  return (
    <div className="mb-5">
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">{title}</h2>
      <p className="text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

export default function HouseholdPage({ active }) {
  useDB();
  const { session, goTab } = useApp();
  const household = currentHousehold(session);
  const requests = myRequests(household);
  const sum = summarize(requests, db.quotes(), LAST_STAGE);
  const [view, setView] = useState(() => viewFromHash(window.location.hash));
  const [selectedId, setSelectedId] = useState(null);

  // The address bar follows the view, so the back button and shared links work.
  useEffect(() => {
    if (!active) return;
    const onHash = () => setView(viewFromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [active]);

  const go = useCallback((next, requestId) => {
    if (requestId) setSelectedId(requestId);
    setView(next);
    if (viewFromHash(window.location.hash) !== next) window.location.hash = `/${next}`;
    window.scrollTo({ top: 0 });
  }, []);
  const goAdvisor = useCallback(() => goTab('ai'), [goTab]);

  const badge = id => (id === 'requests' ? sum.toCompare : 0);

  return (
    <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 pb-24 lg:pb-0">
      <aside className="hidden lg:block">
        <nav aria-label="Household sections" className="sticky space-y-1" style={{ top: 'calc(var(--hdr-h) + 24px)' }}>
          {VIEWS.map(([id, label, icon]) => (
            <button key={id} type="button" onClick={() => go(id)} aria-current={view === id ? 'page' : undefined}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-left transition ${view === id ? 'bg-green-600 text-white shadow-md shadow-green-200' : 'text-gray-700 hover:bg-white'}`}>
              <span className="text-lg" aria-hidden="true">{icon}</span>
              <span className="flex-1 whitespace-nowrap">{label}</span>
              {badge(id) > 0
                ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-400 text-gray-900" title="Requests with quotes to compare">{badge(id)} new</span>
                : id === 'requests' && requests.length > 0 && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${view === id ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'}`}>{requests.length}</span>}
            </button>
          ))}
          <button type="button" onClick={goAdvisor} className="mt-4 w-full rounded-2xl p-4 text-left text-white shadow-md hover:-translate-y-0.5 transition" style={{ background: 'linear-gradient(135deg,#15803d,#16a34a 55%,#65a30d)' }}>
            <div className="text-2xl" aria-hidden="true">🤖</div>
            <div className="mt-1 font-bold text-sm">Need help deciding?</div>
            <div className="text-xs text-green-50/90 mt-0.5">Ask the AI Advisor</div>
          </button>
        </nav>
      </aside>

      {active && (
        <nav aria-label="Household sections" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
          {VIEWS.map(([id, label, icon]) => (
            <button key={id} type="button" onClick={() => go(id)} aria-current={view === id ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${view === id ? 'text-green-700' : 'text-gray-500'}`}>
              <span className={`text-xl leading-none px-4 py-1 rounded-full ${view === id ? 'bg-green-100' : ''}`} aria-hidden="true">{icon}</span>
              {label}
              {badge(id) > 0 && <span className="absolute top-1.5 left-1/2 ml-3 min-w-4 h-4 px-1 rounded-full bg-yellow-400 text-gray-900 text-[10px] font-bold flex items-center justify-center">{badge(id)}</span>}
            </button>
          ))}
        </nav>
      )}

      <div className="min-w-0">
        {view !== 'home' && <PageHead view={view} />}
        {view === 'home' && <Dashboard firstName={(session?.name || '').split(' ')[0]} requests={requests} go={go} goAdvisor={goAdvisor} />}
        {view === 'new' && (
          <div className="space-y-6">
            <ol className="flex items-center gap-3 text-sm font-semibold text-gray-600" aria-label="Steps">
              <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">1</span>Check eligibility</li>
              <li className="h-px w-8 bg-gray-300" aria-hidden="true" />
              <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">2</span>Your details</li>
            </ol>
            <EligibilityCheck />
            <RequestForm profile={session?.profile || {}} active={active && view === 'new'} onPosted={id => go('requests', id)} />
          </div>
        )}
        {view === 'requests' && <MyRequests requests={requests} selectedId={selectedId} onSelect={setSelectedId} onNew={() => go('new')} />}
        {view === 'learn' && (
          <div className="space-y-8">
            <SubsidyRef />
            <WhySolar onPost={() => go('new')} />
          </div>
        )}
      </div>
    </div>
  );
}
