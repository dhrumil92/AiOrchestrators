import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

let rulesCache = null;

/** "How was this calculated?" panel: the answer, the inputs, then each rule with its source. */
export default function HowCalculated({ title, answer, inputs = [], ruleIds = [], label = 'How was this calculated?' }) {
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState(rulesCache);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (!rulesCache) api.rules().then(r => { rulesCache = r; setRules(r); }).catch(e => setError(e.message));
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const shown = (rules || []).filter(r => ruleIds.includes(r.id));
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-green-700 hover:text-green-800 underline underline-offset-2">{label}</button>
      {open && (
        <div className="fixed inset-0 z-[1000] bg-black/40 flex justify-end items-end sm:items-stretch" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label={title} className="bg-white w-full sm:w-[420px] max-h-[85vh] sm:max-h-none overflow-y-auto rounded-t-2xl sm:rounded-none p-6 slide-in">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-extrabold text-gray-900 text-lg">{title}</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-gray-500 hover:text-gray-800 text-2xl leading-none">×</button>
            </div>
            {answer && <div className="mt-3 text-2xl font-black text-green-700">{answer}</div>}
            {inputs.length > 0 && (
              <dl className="mt-4 rounded-xl bg-gray-50 p-3 text-sm space-y-1">
                {inputs.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-gray-600">{k}</dt><dd className="font-semibold text-gray-900 text-right">{v}</dd></div>)}
              </dl>
            )}
            {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
            <div className="mt-4 space-y-4">
              {shown.map(r => (
                <section key={r.id} className="border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-800 text-sm">{r.title}</h4>
                    {r.isAssumption && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Assumption</span>}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{r.plainText}</p>
                  {r.formula && <p className="text-xs font-mono text-gray-700 bg-gray-50 rounded-lg p-2 mt-2">{r.formula}</p>}
                  {r.sourceUrl
                    ? <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-green-700 underline mt-2">{r.sourceTitle}{r.sourceSection ? `, ${r.sourceSection}` : ''}</a>
                    : <p className="text-xs text-gray-500 mt-2">No official source. Planning assumption.</p>}
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
