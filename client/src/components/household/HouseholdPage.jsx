import { useCallback, useEffect, useState } from 'react';
import { useDB } from '../../lib/storage.js';
import { currentHousehold, myRequests } from '../../lib/domain.js';
import { useApp } from '../../AppContext.jsx';
import Hero from './Hero.jsx';
import WhySolar, { SubsidyRef } from './WhySolar.jsx';
import EligibilityCheck from './EligibilityCheck.jsx';
import RequestForm from './RequestForm.jsx';
import MyRequests from './MyRequests.jsx';

const SECTIONS = [['hh-overview', 'Overview'], ['why-solar', 'Benefits'], ['eligibility-card', 'Eligibility'], ['request-form-card', 'Post request'], ['subsidy-ref', 'Subsidy'], ['my-requests-section', 'My requests']];

export default function HouseholdPage({ active }) {
  useDB();
  const { session } = useApp();
  const household = currentHousehold(session);
  const requests = myRequests(household);
  const [current, setCurrent] = useState(SECTIONS[0][0]);

  const go = useCallback(id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), []);

  // Highlight the section currently on screen.
  useEffect(() => {
    if (!active) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const line = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')) || 112) + 90;
      let cur = SECTIONS[0][0];
      SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= line) cur = id; });
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = SECTIONS[SECTIONS.length - 1][0];
      setCurrent(cur);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [active]);

  // Keep the active pill visible in the horizontally scrolling menu.
  useEffect(() => {
    const b = document.querySelector(`[data-hh="${current}"]`);
    const nav = b?.parentElement;
    if (nav && (b.offsetLeft < nav.scrollLeft || b.offsetLeft + b.offsetWidth > nav.scrollLeft + nav.clientWidth)) nav.scrollLeft = b.offsetLeft - 16;
  }, [current]);

  return (
    <div className="space-y-6">
      <nav aria-label="Page sections" className="hh-subnav sticky z-40 -mx-4 px-4 py-2.5 bg-amber-50/90 backdrop-blur flex gap-2 overflow-x-auto" style={{ top: 'var(--hdr-h)' }}>
        {SECTIONS.map(([id, label]) => (
          <button key={id} data-hh={id} onClick={() => go(id)} aria-current={current === id ? 'true' : undefined}
            className={`hh-pill shrink-0 text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 ${current === id ? 'active' : ''}`}>
            {label}
            {id === 'my-requests-section' && requests.length > 0 && <span className="ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-yellow-400 text-gray-900">{requests.length}</span>}
          </button>
        ))}
      </nav>
      <Hero firstName={(session?.name || '').split(' ')[0]} go={go} />
      <WhySolar go={go} />
      <EligibilityCheck />
      <RequestForm profile={session?.profile || {}} active={active} onPosted={() => setTimeout(() => go('my-requests-section'), 50)} />
      <SubsidyRef />
      <MyRequests requests={requests} />
    </div>
  );
}
