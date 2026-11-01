import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useToast } from '../ui/Toast.jsx';

const QUESTIONS = [
  { key: 'isIndianCitizen', text: 'Are you an Indian citizen?', options: [[true, 'Yes'], [false, 'No']] },
  {
    key: 'connection', text: 'What kind of electricity connection does your home have?',
    options: [['residential', 'Home (residential)'], ['commercial', 'Shop or office'], ['industrial', 'Factory'], ['none', 'I do not have one']],
  },
  { key: 'gridConnected', text: 'Will your solar system be connected to the electricity grid?', hint: 'Almost all rooftop systems are. Systems with batteries that run alone are not.', options: [[true, 'Yes'], [false, 'No']] },
  { key: 'receivedSubsidyBefore', text: 'Has this home already received the central solar subsidy?', options: [[false, 'No'], [true, 'Yes']] },
];

export default function EligibilityCheck() {
  const toast = useToast();
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const complete = QUESTIONS.every(q => answers[q.key] !== undefined);

  const choose = (key, value) => { setAnswers(a => ({ ...a, [key]: value })); setResult(null); };

  async function check(e) {
    e.preventDefault();
    if (!complete || busy) return;
    setBusy(true);
    try { setResult(await api.checkEligibility(answers)); }
    catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  }

  return (
    <div id="eligibility-card" data-hhsec className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-amber-100">
        <h3 className="font-bold text-gray-800 text-lg">✅ Can you get the subsidy?</h3>
        <p className="text-sm text-gray-500 mt-0.5">Four quick questions. This is a guide: the official portal and your electricity company make the final decision.</p>
      </div>
      <form onSubmit={check} className="p-6 space-y-5">
        {QUESTIONS.map(q => (
          <fieldset key={q.key}>
            <legend className="text-sm font-semibold text-gray-800">{q.text}</legend>
            {q.hint && <p className="text-xs text-gray-500 mt-0.5">{q.hint}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {q.options.map(([value, label]) => {
                const on = answers[q.key] === value;
                return (
                  <label key={String(value)} className={`cursor-pointer select-none rounded-xl border px-4 py-2 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-green-300 ${on ? 'border-green-600 bg-green-50 text-green-800' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-green-300'}`}>
                    <input type="radio" name={q.key} checked={on} onChange={() => choose(q.key, value)} className="sr-only" />
                    {on && <span aria-hidden="true">✓ </span>}{label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
        <button type="submit" disabled={!complete || busy} className="cta-primary px-6 py-3 rounded-xl font-extrabold text-white disabled:opacity-50">{busy ? 'Checking…' : 'Check my eligibility'}</button>

        {result?.status === 'likely_eligible' && (
          <div role="status" className="rounded-xl bg-green-50 border border-green-200 p-4">
            <div className="font-bold text-green-800">✅ You are likely eligible for the central subsidy</div>
            <p className="text-sm text-green-900 mt-1">Here is what happens next on the official process:</p>
            <ol className="mt-2 space-y-1.5 text-sm text-green-900 list-decimal list-inside">
              {result.nextSteps.map(s => <li key={s}>{s}</li>)}
            </ol>
            <p className="mt-3 text-xs text-green-800">We cannot confirm that a vendor is registered on the portal. Ask each vendor for their registration details and check them there.</p>
          </div>
        )}
        {result?.status === 'not_eligible' && (
          <div role="status" className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <div className="font-bold text-amber-900">⚠️ You may not get the central subsidy</div>
            <ul className="mt-2 space-y-1 text-sm text-amber-900 list-disc list-inside">
              {result.reasons.map(r => <li key={r}>{r}</li>)}
            </ul>
            <p className="mt-3 text-xs text-amber-800">You can still post a request and get quotes, but the subsidy amounts shown on quotes assume you are eligible, so do not count on them. If an answer is wrong, change it above and check again.</p>
          </div>
        )}
      </form>
    </div>
  );
}
