import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { db, useDB } from '../../lib/storage.js';
import { currentHousehold, myRequests } from '../../lib/domain.js';
import { inr, quoteKw, subsidyFor } from '../../lib/utils.js';
import { PHOTO_PROMPT, SYSTEM_CONTEXT, comparePrompt, geminiGenerate, quotePrompt, reportPrompt, sizePrompt } from '../../lib/gemini.js';
import { useGemini } from '../../lib/useGemini.js';
import { startSpeech } from '../../lib/speech.js';
import { useApp } from '../../AppContext.jsx';
import { useToast } from '../ui/Toast.jsx';

const BOT_BG = { background: 'linear-gradient(135deg,#16a34a,#ca8a04)' };
const md = text => ({ __html: DOMPurify.sanitize(marked.parse(String(text || ''))) });

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
      <p className="text-gray-600 text-sm mt-2">I can help you:</p>
      <ul className="text-sm text-gray-600 mt-1 space-y-1">
        <li>🔍 Analyze your terrace photo for solar potential</li>
        <li>📐 Estimate the right system size for your home</li>
        <li>⚖️ Compare vendor quotes and flag red flags</li>
        <li>🧮 Calculate your PM Surya Ghar subsidy</li>
        <li>💬 Answer any question about rooftop solar</li>
      </ul>
      <p className="text-gray-500 text-xs mt-3">To switch on AI answers, add your Gemini API key in ⚙️ Settings (top right), then click a Quick Action or ask me anything!</p>
    </Bubble>
  );
}

function Calculator() {
  const [kw, setKw] = useState(3);
  const total = kw * 55000, subsidy = subsidyFor(kw), net = total - subsidy;
  const annual = kw * 4 * 365 * 8;
  const rows = [
    ['Estimated Cost', inr(total), 'bg-gray-50', 'text-gray-600', 'text-gray-800'],
    ['Govt Subsidy 🎉', '−' + inr(subsidy), 'bg-green-50', 'text-green-700', 'text-green-700'],
    ['Net Cost', inr(net), '', 'text-amber-800', 'text-amber-700', { background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }],
    ['Annual Savings', inr(Math.round(annual)), 'bg-green-50', 'text-green-800', 'text-green-800'],
    ['Payback Period', (net / annual).toFixed(1) + ' years', 'bg-yellow-50', 'text-yellow-900', 'text-yellow-900'],
    ['25-yr Savings', '₹' + (annual * 25 / 100000).toFixed(1) + 'L', '', 'text-white', 'text-white', { background: 'linear-gradient(135deg,#065f46,#10b981)' }],
  ];
  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <h3 className="font-bold text-gray-800 mb-4">🧮 Subsidy Calculator</h3>
      <label htmlFor="calc-size" className="text-xs font-bold text-gray-600 mb-1.5 block">System Size</label>
      <select id="calc-size" value={kw} onChange={e => setKw(+e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50">
        {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} kW</option>)}
      </select>
      <div className="space-y-2 mt-3 text-sm" aria-live="polite">
        {rows.map(([k, val, bg, kc, vc, style]) => (
          <div key={k} className={`flex justify-between p-2.5 rounded-xl ${bg} ${k === 'Net Cost' ? 'font-bold' : ''}`} style={style}>
            <span className={kc}>{k}</span><span className={`font-bold ${vc}`}>{val}</span>
          </div>
        ))}
        <p className="text-xs text-gray-500 leading-relaxed pt-1">Estimate assumes ₹55,000/kW installed, 4 units per kW per day and ₹8 per unit. Your tariff and roof will change the result.</p>
      </div>
    </div>
  );
}

export default function AiAdvisor({ active, command }) {
  useDB();
  const { session, openSettings } = useApp();
  const toast = useToast();
  const callGemini = useGemini();
  const household = currentHousehold(session);
  const requests = household ? myRequests(household) : [];
  const [selected, setSelected] = useState('');
  const [msgs, setMsgs] = useState([]);              // { id, role, text }
  const [typing, setTyping] = useState(0);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const history = useRef([]);
  const scroller = useRef(null);
  const recRef = useRef(null);
  const handled = useRef(null);

  const add = (role, text) => setMsgs(m => [...m, { id: Math.random().toString(36).slice(2), role, text }]);
  useEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, typing]);

  async function ask(prompt, image) {
    setTyping(t => t + 1);
    const res = await callGemini(prompt, image);
    setTyping(t => t - 1);
    if (res) add('ai', res);
  }

  async function quickAction(type) {
    const req = selected ? requests.find(r => r.id === selected) : requests[0];
    if (!req) {
      toast('Please select a request first, or submit one from the Household tab.', 'error');
      if (!requests.length) add('ai', '**No requests found.** Please go to the **🏠 I Need Solar** tab and post a solar requirement first. Then come back here to use AI analysis!');
      return;
    }
    const quotes = db.quotes().filter(q => q.requestId === req.id);
    if (type === 'photo') {
      if (!req.photo) {
        add('user', '🔍 Analyze terrace photo for: ' + req.address);
        return add('ai', '**No photo found** for this request. Please upload a terrace photo when posting your solar requirement. The photo helps me identify:\n- Available clear area for panels\n- Obstructions (water tanks, staircase rooms, AC units)\n- Roof orientation and shadow risks\n- Overall solar potential rating');
      }
      add('user', '🔍 Please analyze the terrace photo for my home at: ' + req.address);
      return ask(PHOTO_PROMPT, req.photo);
    }
    if (type === 'size') { add('user', `📐 Estimate solar system size for monthly bill of ${inr(req.monthlyBill)} with budget ${inr(req.budget)}`); return ask(sizePrompt(req)); }
    if (type === 'compare') {
      if (!quotes.length) { add('user', '⚖️ Compare quotes for my solar request'); return add('ai', "**No quotes yet** for this request. Vendors see your request in their dashboard. Once quotes arrive, I'll compare them for you!"); }
      add('user', `⚖️ Compare all ${quotes.length} quotes for my solar request`);
      return ask(comparePrompt(req, quotes));
    }
    add('user', '📊 Generate complete solar advisory report for my home');
    return ask(reportPrompt(req, quotes));
  }

  // "Ask AI about this quote" from a household quote card.
  useEffect(() => {
    if (!command || handled.current === command.nonce) return;
    handled.current = command.nonce;
    if (command.type !== 'quote') return;
    const req = db.requests().find(r => r.id === command.requestId);
    const q = db.quotes().find(x => x.id === command.quoteId);
    if (!req || !q) return;
    setSelected(req.id);
    add('user', `🤖 Tell me about the quote from ${q.vendorName} for ${inr(q.price)}`);
    ask(quotePrompt(req, q, subsidyFor(quoteKw(q))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command]);

  async function send(text = input) {
    const msg = text.trim();
    if (!msg) return;
    setInput('');
    add('user', msg);
    const key = db.apiKey();
    if (!key) {
      add('ai', '**API key required.** Open **⚙️ Settings** (top right) and paste your Gemini API key. You can get a free key at [aistudio.google.com](https://aistudio.google.com/app/apikey).');
      return openSettings();
    }
    history.current.push({ role: 'user', parts: [{ text: msg }] });
    setTyping(t => t + 1);
    try {
      const reply = await geminiGenerate(key, [
        { role: 'user', parts: [{ text: SYSTEM_CONTEXT + '\n\nNow answer the following question from a household user:' }] },
        { role: 'model', parts: [{ text: "Understood! I'm SuryaBot, ready to help with PM Surya Ghar scheme. What would you like to know?" }] },
        ...history.current,
      ]);
      history.current.push({ role: 'model', parts: [{ text: reply }] });
      add('ai', reply);
    } catch (err) {
      history.current.pop();
      add('ai', '**Error:** ' + err.message);
    } finally { setTyping(t => t - 1); }
  }

  function toggleVoice() {
    if (recRef.current) { try { recRef.current.stop(); } catch {} return; }
    const rec = startSpeech({
      onResult: t => { setInput(t); send(t); },
      onEnd: () => { recRef.current = null; setListening(false); },
      onError: e => { recRef.current = null; setListening(false); if (e === 'unsupported') toast('Voice requires Chrome/Edge', 'error'); },
    });
    if (rec) { recRef.current = rec; setListening(true); }
  }

  const qa = 'w-full bg-white border border-green-200 hover:bg-green-50 hover:border-green-400 text-gray-800 text-sm px-4 py-3 rounded-xl font-semibold transition flex items-center gap-3 disabled:opacity-50 disabled:pointer-events-none';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h3 className="font-bold text-gray-800 mb-4">⚡ Quick Actions</h3>
          {!household && <p className="text-xs text-gray-500 -mt-2 mb-3">Quick actions analyse a household's own requests. As a vendor you can still use the chat and calculator.</p>}
          <div className="space-y-2">
            <button disabled={!household} onClick={() => quickAction('photo')} className={qa}><span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center" aria-hidden="true">🔍</span>Analyze Terrace Photo</button>
            <button disabled={!household} onClick={() => quickAction('size')} className={qa}><span className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center" aria-hidden="true">📐</span>Estimate System Size &amp; Subsidy</button>
            <button disabled={!household} onClick={() => quickAction('compare')} className={qa}><span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center" aria-hidden="true">⚖️</span>Compare All Quotes</button>
            <button disabled={!household} onClick={() => quickAction('report')} className="cta-primary w-full text-white text-sm px-4 py-3 rounded-xl font-bold flex items-center gap-3 disabled:opacity-50 disabled:pointer-events-none"><span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center" aria-hidden="true">📊</span>Full AI Report</button>
          </div>
          <div className="mt-4">
            <label htmlFor="ai-request-select" className="text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wide">For which request?</label>
            <select id="ai-request-select" value={selected} onChange={e => setSelected(e.target.value)} disabled={!household} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 disabled:text-gray-400">
              <option value="">{!household ? 'Quick actions are for households' : requests.length ? 'Select a request…' : 'No requests yet'}</option>
              {requests.map(r => <option key={r.id} value={r.id}>{r.address.slice(0, 48)} · {inr(r.monthlyBill)}/mo</option>)}
            </select>
          </div>
        </div>
        <Calculator />
        <div className="rounded-2xl border border-green-100 p-5" style={{ background: 'linear-gradient(135deg,#f0fdf4,#fefce8)' }}>
          <h3 className="font-bold text-green-900 mb-3">ℹ️ About the Scheme</h3>
          <ul className="space-y-2 text-xs text-green-900">
            <li>✅ Free rooftop solar for 1 crore households</li><li>✅ Subsidy directly credited to bank account</li>
            <li>✅ Net metering: sell surplus power to grid</li><li>✅ 25-year panel life with 5-year warranty on inverter</li>
            <li>✅ Apply at pmsuryaghar.gov.in</li>
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
        <form className="p-4 border-t border-gray-100" onSubmit={e => { e.preventDefault(); send(); }}>
          <div className="flex gap-2">
            <button type="button" onClick={toggleVoice} title="Speak your question" aria-label="Speak your question" className="flex-shrink-0 bg-green-50 hover:bg-green-100 text-green-700 p-3 rounded-xl transition">{listening ? '🔴' : '🎤'}</button>
            <input id="chat-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything about solar, subsidies, quotes..." aria-label="Message SuryaBot"
              className="flex-1 min-w-0 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white transition" />
            <button type="submit" className="cta-primary flex-shrink-0 text-white px-5 py-3 rounded-xl font-bold text-sm">Send ➤</button>
          </div>
        </form>
      </div>
    </div>
  );
}
