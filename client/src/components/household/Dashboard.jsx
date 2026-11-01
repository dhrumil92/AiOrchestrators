import { db } from '../../lib/storage.js';
import { LAST_STAGE } from '../../lib/domain.js';
import { JOURNEY, greeting, nextStep, requestStatus, summarize } from '../../lib/householdView.js';
import { cityOf, inr } from '../../lib/utils.js';
import { StatusChip } from './MyRequests.jsx';

function Tile({ icon, value, label, tone, onClick }) {
  const tones = { green: 'bg-green-50 text-green-700', amber: 'bg-amber-50 text-amber-700', blue: 'bg-sky-50 text-sky-700', gray: 'bg-gray-100 text-gray-600' };
  return (
    <button type="button" onClick={onClick} className="text-left bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${tones[tone]}`} aria-hidden="true">{icon}</span>
      <div className="mt-3 text-3xl font-extrabold text-gray-900 leading-none">{value}</div>
      <div className="mt-1 text-sm text-gray-500">{label}</div>
    </button>
  );
}

/** The five steps from posting a request to installation, with the current one marked. */
function Journey({ step }) {
  return (
    <ol className="mt-5 grid grid-cols-5 gap-1" aria-label="Your progress">
      {JOURNEY.map((label, i) => {
        const done = i < step, now = i === step;
        return (
          <li key={label} className="text-center" aria-current={now ? 'step' : undefined}>
            <div className={`mx-auto w-8 h-8 rounded-full text-sm font-extrabold flex items-center justify-center transition ${done ? 'bg-green-600 text-white' : now ? 'bg-yellow-400 text-gray-900 ring-4 ring-yellow-100' : 'bg-gray-100 text-gray-400'}`}>{done ? '✓' : i + 1}</div>
            <div className={`mt-1.5 text-[11px] sm:text-xs leading-tight ${now ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{label}</div>
          </li>
        );
      })}
    </ol>
  );
}

export default function Dashboard({ firstName, requests, go, goAdvisor }) {
  const quotes = db.quotes();
  const next = nextStep(requests, quotes, LAST_STAGE);
  const sum = summarize(requests, quotes, LAST_STAGE);
  const recent = [...requests].reverse().slice(0, 3);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl p-6 sm:p-8 border border-green-100 shadow-lg shadow-green-100/60" style={{ background: 'linear-gradient(135deg,#f0fdf4 0%,#fefce8 60%,#fff7ed 100%)' }}>
        <p className="text-sm font-semibold text-green-700">{greeting(new Date().getHours())}, {firstName || 'there'} 👋</p>
        <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">{next.title}</h2>
        <p className="mt-2 text-gray-600 max-w-2xl leading-relaxed">{next.text}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => go(next.cta.view, next.cta.requestId)} className="cta-primary px-6 py-3 rounded-2xl font-extrabold text-white">{next.cta.label} <span className="arrow">→</span></button>
          <button type="button" onClick={goAdvisor} className="px-6 py-3 rounded-2xl font-bold bg-white border-2 border-green-200 text-green-800 hover:border-green-500 transition">🤖 Ask the AI Advisor</button>
        </div>
        <Journey step={next.step} />
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Summary">
        <Tile icon="📋" value={sum.requests} label="Requests posted" tone="blue" onClick={() => go('requests')} />
        <Tile icon="💬" value={sum.quotes} label="Quotes received" tone="amber" onClick={() => go('requests')} />
        <Tile icon="🔧" value={sum.installing} label="Installations under way" tone="green" onClick={() => go('requests')} />
        <Tile icon="🏁" value="31 Mar 2027" label="Scheme period ends" tone="gray" onClick={() => go('learn')} />
      </section>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-extrabold text-gray-900">Recent requests</h3>
            {requests.length > 0 && <button type="button" onClick={() => go('requests')} className="text-sm font-semibold text-green-700 hover:underline">View all</button>}
          </div>
          {recent.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl" aria-hidden="true">📭</div>
              <p className="mt-2 font-semibold text-gray-800">No requests yet</p>
              <p className="text-sm text-gray-500 mt-1">Your requests and the quotes on them will show up here.</p>
              <button type="button" onClick={() => go('new')} className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-xl transition">Post a request</button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent.map(req => {
                const status = requestStatus(req, quotes.filter(q => q.requestId === req.id), LAST_STAGE);
                return (
                  <li key={req.id}>
                    <button type="button" onClick={() => go('requests', req.id)} className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-green-50/40 transition">
                      <span className="w-11 h-11 shrink-0 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl" aria-hidden="true">🏠</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-gray-900 truncate">{cityOf(req.addressText)}</span>
                        <span className="block text-xs text-gray-500 mt-0.5">{req.monthlyUnits} units a month · Budget {inr(req.budgetRupees)}</span>
                      </span>
                      <StatusChip status={status} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="font-extrabold text-gray-900">Helpful for you</h3>
          {[
            ['✅', 'Can you get the subsidy?', 'Answer four quick questions.', () => go('new')],
            ['📘', 'How the subsidy works', 'Up to ₹78,000 for a home system.', () => go('learn')],
            ['🤖', 'Ask the AI Advisor', 'Plain answers about solar and quotes.', goAdvisor],
          ].map(([icon, title, text, onClick]) => (
            <button key={title} type="button" onClick={onClick} className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-green-50 flex items-center justify-center text-xl" aria-hidden="true">{icon}</span>
              <span><span className="block font-bold text-gray-900 text-sm">{title}</span><span className="block text-xs text-gray-500">{text}</span></span>
              <span className="ml-auto text-gray-400" aria-hidden="true">→</span>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}
