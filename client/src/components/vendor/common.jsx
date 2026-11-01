import { verificationChecks } from '../../lib/domain.js';
import { timeAgo } from '../../lib/utils.js';

export function Badge({ v }) {
  const checks = verificationChecks(v), done = checks.filter(c => c.ok).length;
  if (done === checks.length) {
    return (
      <span className="vbadge-verified inline-flex items-center gap-1 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm" title="All business details are filled in and correctly formatted. Registration numbers are self-declared and not checked against government records.">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>Profile complete
      </span>
    );
  }
  return <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 border border-yellow-200 text-xs font-bold px-2.5 py-1 rounded-full" title="Fill in your business profile to earn the Profile complete badge">⏳ Profile {done}/{checks.length}</span>;
}

export function NotifItem({ n, unread, compact, onGo }) {
  return (
    <button onClick={() => onGo(n.go)} className={`w-full text-left flex items-start gap-3 ${compact ? 'p-2 rounded-xl hover:bg-gray-50' : 'p-4 hover:bg-green-50/50'} transition ${unread ? 'bg-green-50/60' : ''}`}>
      <div className="w-9 h-9 shrink-0 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center" aria-hidden="true">{n.icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><span className="font-semibold text-gray-900 text-sm">{n.title}</span>{unread && <span className="w-2 h-2 rounded-full bg-green-600" aria-label="unread" />}</div>
        <div className={`text-xs text-gray-600 mt-0.5 ${compact ? 'truncate' : ''}`}>{n.text}</div>
      </div>
      <div className="text-xs text-gray-500 shrink-0">{timeAgo(n.at)}</div>
    </button>
  );
}

export const SectionHead = ({ title, sub, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div><h2 className="text-2xl font-extrabold text-gray-900">{title}</h2><p className="text-gray-500 text-sm mt-1">{sub}</p></div>
    {children}
  </div>
);

export const Chip = ({ active, onClick, children }) => (
  <button onClick={onClick} aria-pressed={active} className={`vchip text-xs font-semibold px-3.5 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 ${active ? 'active' : ''}`}>{children}</button>
);
