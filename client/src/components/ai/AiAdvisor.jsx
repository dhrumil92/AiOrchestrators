import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { api } from '../../lib/api.js';
import { db, refreshMarket, useDB } from '../../lib/storage.js';
import { currentHousehold, myRequests } from '../../lib/domain.js';
import { inr, years } from '../../lib/utils.js';
import { useApp } from '../../AppContext.jsx';
import { useToast } from '../ui/Toast.jsx';
import HowCalculated from '../shared/HowCalculated.jsx';

const BOT_BG = { background: 'linear-gradient(135deg,#16a34a,#ca8a04)' };
const md = text => ({ __html: DOMPurify.sanitize(marked.parse(String(text || ''))) });
const sourceNote = s => (s === 'saved' ? '\n\n*Saved example*' : s === 'template' ? '\n\n*Basic explanation*' : '');

function Bubble({ role, children, html }) {
  const user = role === 'user';
  return (
    <div className={`flex items-start gap-3 fade-in ${user ? 'flex-row-reverse' : ''}`}>
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-base" aria-hidden="true"
        style={user ? { background: 'linear-gradient(135deg,#facc15,#ca8a04)' } : BOT_BG}>{user ? '👤' : '🤖'}</div>
      {html
        ? <div className="bubble-ai text-gray-800 px-4 py-3 max-w-lg min-w-0 text-sm leading-relaxed ai-md" dangerouslySetInnerHTML={html} />
        : <div className={`${user ? 'bubble-user text-white' : 'bubble-ai text-gray-800'} px-4 py-3 max-w-lg min-w-0 text-sm leading-relaxed`}>{children}</div>}
    </div>
  );
}

function Welcome() {
  return (
    <Bubble role="ai">
      <p className="text-gray-800 text-sm font-semibold">Namaste! 🙏 I'm SuryaBot, your AI solar advisor.</p>
      <p className="text-gray-600 text-sm mt-2">Pick a quick action and I will use your saved request:</p>
      <ul className="text-sm text-gray-600 mt-1 space-y-1">
        <li>🔍 Check your terrace photo for obstructions</li>
        <li>📐 Show your suggested size, subsidy and bill saving</li>
        <li>⚖️ Compare vendor quotes and flag missing items</li>
      </ul>
      <p className="text-gray-500 text-xs mt-3">Every number comes from fixed rules with published sources. AI reads the photo and explains the result.</p>
    </Bubble>
  );
}

function Calculator() {
  const toast = useToast();
  const [kw, setKw] = useState(3);
  const [units, setUnits] = useState(300);
  const [r, setR] = useState(null);

  useEffect(() => {
    if (!(Number(units) > 0)) { setR(null); return; }
    let live = true;
    const t = setTimeout(() => {
      api.calculator(kw, Math.round(Number(units))).then(x => { if (live) setR(x); }).catch(e => toast(e.message, 'error'));
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [kw, units, toast]);

  const rows = r ? [
    ['Example cost', inr(r.benchmarkRupees), 'bg-gray-50', 'text-gray-600', 'text-gray-800'],
    ['Government subsidy', '−' + inr(r.subsidyRupees), 'bg-green-50', 'text-green-700', 'text-green-700'],
    ['You pay', inr(r.amountYouPayRupees), '', 'text-amber-800', 'text-amber-700', { background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }],
    ['Yearly bill saving', inr(r.yearlySavingRupees), 'bg-green-50', 'text-green-800', 'text-green-800'],
    ['Money back', years(r.paybackYears), 'bg-yellow-50', 'text-yellow-900', 'text-yellow-900'],
  ] : [];
  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <h3 className="font-bold text-gray-800 mb-4">🧮 Subsidy Calculator</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="calc-size" className="text-xs font-bold text-gray-600 mb-1.5 block">System size</label>
          <select id="calc-size" value={kw} onChange={e => setKw(+e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50">
            {[1, 1.5, 2, 2.5, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} kW</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="calc-units" className="text-xs font-bold text-gray-600 mb-1.5 block">Units a month</label>
          <input id="calc-units" type="number" min="1" value={units} onChange={e => setUnits(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50" />
        </div>
      </div>
      <div className="space-y-2 mt-3 text-sm" aria-live="polite">
        {rows.map(([k, val, bg, kc, vc, style]) => (
          <div key={k} className={`flex justify-between p-2.5 rounded-xl ${bg} ${k === 'You pay' ? 'font-bold' : ''}`} style={style}>
            <span className={kc}>{k}</span><span className={`font-bold ${vc}`}>{val}</span>
          </div>
        ))}
        <p className="text-xs text-gray-500 leading-relaxed pt-1">Example only. It uses the scheme's 2024 benchmark cost, which is not a market price, with Gujarat rates and made-in-India panels.</p>
        <HowCalculated title="Subsidy calculator" ruleIds={['cfa-standard', 'dcr-required', 'tariff-rgp', 'assumption-generation', 'assumption-net-metering', 'assumption-payback']} />
      </div>
    </div>
  );
}

function photoReply(a) {
  const found = a.obstructions.length ? a.obstructions.map(o => `- **${o.name}**${o.note ? `: ${o.note}` : ''}`).join('\n') : a.summary;
  return `**Terrace check** (${a.confidence} confidence)\n\n${found}\n\nAI estimate. A site visit is still needed.${sourceNote(a.source)}`;
}
function sizeReply(e) {
  return `**Your solar plan**\n\n- System size: **${e.suggestedKw} kW**\n- Scheme guidance: ${e.schemeBand}\n- Estimated solar units: **${e.monthlyGenerationUnits} a month**\n- Government subsidy: **${inr(e.subsidyRupees)}**\n- Yearly bill saving: **${inr(e.yearlySavingRupees)}**\n\n${e.explanation}${sourceNote(e.explanationSource)}`;
}
function compareReply(c) {
  const rec = c.quotes.find(q => q.quoteId === c.recommendation.quoteId);
  const lines = c.quotes.map(q => {
    const notes = [...q.missingItems.map(m => `missing ${m}`), q.securityFlag && 'hidden instructions ignored'].filter(Boolean);
    return `- **${q.vendorName}**: you pay ${q.amountYouPayRupees === null ? 'not given' : inr(q.amountYouPayRupees)}, money back ${years(q.paybackYears).toLowerCase()}${notes.length ? ` (${notes.join('; ')})` : ''}`;
  });
  const head = rec ? `**We suggest ${rec.vendorName}**` : '**No quote is complete yet**';
  return `${head}\n\n${c.recommendation.reasons.map(r => `- ${r}`).join('\n')}\n\n**All quotes**\n\n${lines.join('\n')}${sourceNote(c.recommendation.source)}`;
}

export default function AiAdvisor() {
  useDB();
  const { session } = useApp();
  const toast = useToast();
  const household = currentHousehold(session);
  const requests = household ? myRequests(household) : [];
  const [selected, setSelected] = useState('');
  const [msgs, setMsgs] = useState([]);              // { id, role, text }
  const [typing, setTyping] = useState(0);
  const scroller = useRef(null);

  const add = (role, text) => setMsgs(m => [...m, { id: Math.random().toString(36).slice(2), role, text }]);
  useEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, typing]);

  async function reply(work) {
    setTyping(t => t + 1);
    try { add('ai', await work()); }
    catch (err) { add('ai', `**Sorry.** ${err.message}`); }
    finally { setTyping(t => t - 1); }
  }

  function quickAction(type) {
    const req = requests.find(r => r.id === selected) || requests[0];
    if (!req) return toast('Please post a request from the I Need Solar tab first.', 'error');
    if (type === 'photo') {
      add('user', '🔍 Please check my terrace photo');
      if (!req.photoUrl) return add('ai', '**No photo found** for this request. Add a terrace photo when you post a request.');
      return reply(async () => {
        const a = req.assessment || await api.assessPhoto(req.id);
        await refreshMarket();
        return photoReply(a);
      });
    }
    if (type === 'size') { add('user', '📐 What size should I install, and what will I save?'); return reply(async () => sizeReply(await api.estimate(req.id))); }
    add('user', '⚖️ Compare all my quotes');
    if (!db.quotes().some(q => q.requestId === req.id)) return add('ai', '**No quotes yet.** Vendors see your request on their dashboard, and quotes will appear here.');
    return reply(async () => compareReply(await api.comparison(req.id)));
  }

  const qa = 'w-full bg-white border border-green-200 hover:bg-green-50 hover:border-green-400 text-gray-800 text-sm px-4 py-3 rounded-xl font-semibold transition flex items-center gap-3 disabled:opacity-50 disabled:pointer-events-none';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h3 className="font-bold text-gray-800 mb-4">⚡ Quick Actions</h3>
          {!household && <p className="text-xs text-gray-500 -mt-2 mb-3">Quick actions use a household's own requests. As a vendor you can still use the calculator.</p>}
          <div className="space-y-2">
            <button disabled={!household} onClick={() => quickAction('photo')} className={qa}><span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center" aria-hidden="true">🔍</span>Check Terrace Photo</button>
            <button disabled={!household} onClick={() => quickAction('size')} className={qa}><span className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center" aria-hidden="true">📐</span>System Size &amp; Subsidy</button>
            <button disabled={!household} onClick={() => quickAction('compare')} className={qa}><span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center" aria-hidden="true">⚖️</span>Compare All Quotes</button>
          </div>
          <div className="mt-4">
            <label htmlFor="ai-request-select" className="text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wide">For which request?</label>
            <select id="ai-request-select" value={selected} onChange={e => setSelected(e.target.value)} disabled={!household} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 disabled:text-gray-400">
              <option value="">{!household ? 'Quick actions are for households' : requests.length ? 'Latest request' : 'No requests yet'}</option>
              {requests.map(r => <option key={r.id} value={r.id}>{(r.addressText || r.householdName).slice(0, 40)} · {r.monthlyUnits} units</option>)}
            </select>
          </div>
        </div>
        <Calculator />
        <div className="rounded-2xl border border-green-100 p-5" style={{ background: 'linear-gradient(135deg,#f0fdf4,#fefce8)' }}>
          <h3 className="font-bold text-green-900 mb-3">ℹ️ About the Scheme</h3>
          <ul className="space-y-2 text-xs text-green-900">
            <li>✅ Target: rooftop solar on 1 crore homes</li><li>✅ Subsidy up to ₹78,000 for homes</li>
            <li>✅ Panels must be made in India to qualify</li><li>✅ Apply through the National Portal</li>
            <li>✅ Guidelines run until 31 March 2027</li>
          </ul>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl shadow-md flex flex-col h-[600px] lg:h-[680px]">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={BOT_BG} aria-hidden="true">🤖</div>
          <div>
            <div className="font-bold text-gray-800">SuryaBot</div>
            <div className="text-xs text-green-600 flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full inline-block" /> AI Solar Advisor</div>
          </div>
        </div>
        <div ref={scroller} className="flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite">
          <Welcome />
          {msgs.map(m => m.role === 'ai' ? <Bubble key={m.id} role="ai" html={md(m.text)} /> : <Bubble key={m.id} role="user">{m.text}</Bubble>)}
          {typing > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-base" style={BOT_BG} aria-hidden="true">🤖</div>
              <div className="bubble-ai px-4 py-3 flex items-center gap-2">
                <span className="text-gray-500 text-xs">SuryaBot is thinking</span>
                <div className="flex gap-1">{[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-amber-400 rounded-full" style={{ animation: `bounce 1.2s ease ${i * 0.15}s infinite` }} />)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
