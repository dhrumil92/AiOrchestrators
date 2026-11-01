import { useState } from 'react';
import { db } from '../../lib/storage.js';
import { INSTALL_STAGES, LAST_STAGE, isMyQuote, setStage } from '../../lib/domain.js';
import { inr, quoteKw, timeAgo } from '../../lib/utils.js';
import { EmptyState } from '../ui/bits.jsx';
import { useConfirm } from '../ui/Confirm.jsx';
import { useToast } from '../ui/Toast.jsx';
import { Chip, SectionHead } from './common.jsx';

function Stepper({ st }) {
  return (
    <div className="mt-5 flex items-start overflow-x-auto pb-1">
      {INSTALL_STAGES.map((name, i) => {
        const done = i < st || st === LAST_STAGE;
        const cls = done ? 'bg-green-600 text-white' : i === st ? 'bg-yellow-400 text-gray-900 ring-4 ring-yellow-100' : 'bg-gray-100 text-gray-500';
        return [
          <div key={name} className="flex flex-col items-center text-center min-w-[78px] flex-1">
            <div className={`stage-dot ${cls}`}>{done ? '✓' : i + 1}</div>
            <div className={`mt-1.5 text-xs leading-tight ${i === st ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{name}</div>
          </div>,
          i < LAST_STAGE && <div key={name + '-l'} className={`h-0.5 flex-1 min-w-[12px] mt-3 ${i < st ? 'bg-green-500' : 'bg-gray-200'}`} />,
        ];
      })}
    </div>
  );
}

export default function Installations({ v, show }) {
  const [filter, setFilter] = useState('active');
  const confirm = useConfirm();
  const toast = useToast();
  const reqs = db.requests();
  const list = db.quotes().filter(q => isMyQuote(q, v) && q.status === 'accepted')
    .filter(q => filter === 'done' ? (q.installStage || 0) >= LAST_STAGE : (q.installStage || 0) < LAST_STAGE)
    .sort((a, b) => new Date(b.acceptedAt || b.createdAt) - new Date(a.acceptedAt || a.createdAt));

  async function move(q, dir) {
    const next = Math.max(0, Math.min(LAST_STAGE, (q.installStage || 0) + dir));
    if (next === LAST_STAGE && dir > 0 && !(await confirm({ title: 'Mark installation as completed?', message: 'The customer will then be able to rate and review your work.', confirmText: 'Mark completed', icon: '🎉' }))) return;
    setStage(q.id, next);
    toast(next === LAST_STAGE ? '🎉 Installation completed!' : `✅ Stage updated: ${INSTALL_STAGES[next]}`, 'success');
  }

  return (
    <section className="vsec space-y-5">
      <SectionHead title="Installation tracking" sub="Jobs appear here when a household accepts your quote. Update the stage as work progresses — the customer sees it live.">
        <div className="flex gap-2" role="group" aria-label="Filter installations">
          <Chip active={filter === 'active'} onClick={() => setFilter('active')}>Active</Chip>
          <Chip active={filter === 'done'} onClick={() => setFilter('done')}>Completed</Chip>
        </div>
      </SectionHead>
      <div className="space-y-4">
        {!list.length && (filter === 'done'
          ? <EmptyState icon="✅" title="No completed installations yet" text="Jobs move here when you mark the final stage as completed." />
          : <EmptyState icon="🛠️" title="No active installations" text="When a household accepts one of your quotes, the job appears here so you can track it stage by stage.">
              <button onClick={() => show('enquiries')} className="mt-4 cta-primary rounded-xl text-white font-bold px-5 py-2.5 text-sm">Browse enquiries →</button>
            </EmptyState>)}
        {list.map(q => {
          const req = reqs.find(r => r.id === q.requestId) || {};
          const st = q.installStage || 0;
          const last = (q.stageLog || []).slice(-1)[0];
          return (
            <div key={q.id} className="vcard bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-gray-900">{req.name || 'Customer'}</div>
                  <div className="text-sm text-gray-500 mt-0.5">📍 {req.address || '—'}</div>
                  {req.phone && <a href={`tel:${req.phone}`} className="text-sm text-green-700 font-semibold">📞 {req.phone}</a>}
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-gray-900">{inr(q.price)}</div>
                  <div className="text-xs text-gray-500">{quoteKw(q).toFixed(1)} kW · {q.panelBrand} · {q.inverterType}</div>
                </div>
              </div>
              <Stepper st={st} />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500">Accepted {timeAgo(q.acceptedAt || q.createdAt)}{last ? ` · last update ${timeAgo(last.at)}` : ''}</div>
                <div className="flex gap-2">
                  {st > 0 && <button onClick={() => move(q, -1)} className="px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600">↩ Step back</button>}
                  {st < LAST_STAGE
                    ? <button onClick={() => move(q, 1)} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700">Mark next: {INSTALL_STAGES[st + 1]} →</button>
                    : <span className="px-3 py-2 rounded-xl text-xs font-bold bg-green-50 text-green-700">🎉 Completed</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
