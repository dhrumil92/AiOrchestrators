import { useState } from 'react';
import { Photo } from '../ui/bits.jsx';
import { unsplash } from '../../lib/utils.js';

const GUIDELINES_URL = 'https://solar.delhi.gov.in/public/assets/solar/PMSG_Guidelines_for_Residential_CFA_Capex_Mode.pdf';

const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

const STEPS = {
  household: [
    ['📝', 'Post your need', 'Tell us your monthly units, budget and roof area. Speak in Hindi or Gujarati if you prefer.'],
    ['📸', 'Add a terrace photo', 'AI reviews shade and obstructions and tells you what it could not be sure about.'],
    ['⚖️', 'Compare quotes', 'Vendors send quotes. You see price, subsidy, payback and warranty side by side.'],
    ['✅', 'Accept one', 'Pick the quote you trust. The vendor then gets your full details to start the work.'],
  ],
  vendor: [
    ['🔍', 'See nearby requests', 'Browse open household requests with a masked name and an approximate location.'],
    ['💬', 'Send a quote', 'Give system size, price, panel and inverter details and warranties in one form.'],
    ['🏆', 'Get ranked fairly', 'Quotes are scored by fixed rules on price, warranty, subsidy eligibility and install time.'],
    ['🔧', 'Win and install', 'When a household accepts, you receive their details and can track the installation.'],
  ],
};

const FEATURES = [
  ['⚖️', 'Side-by-side quotes', 'Every vendor answers the same questions, so quotes are easy to compare.'],
  ['🧮', 'Official subsidy rules', 'Subsidy, savings and payback come from the scheme rules in code, never from an AI guess.'],
  ['🤖', 'AI that explains', 'The assistant puts the comparison in plain words. It never invents a number.'],
  ['🗣️', 'Your language', 'Use English, हिन्दी or ગુજરાતી, by typing or by voice.'],
  ['📷', 'Terrace photo review', 'Spot shade and obstructions early, with a clear note when the AI is unsure.'],
  ['🛡️', 'Privacy by default', 'Vendors see your city and a rounded location. Your name and phone stay private until you accept.'],
];

const SUBSIDY = [
  ['1 kW', '₹30,000', 33],
  ['2 kW', '₹60,000', 77],
  ['3 kW or more', '₹78,000', 100],
];

const FAQ = [
  ['How much subsidy can I get?', 'For a home system under the scheme, the central subsidy is ₹30,000 per kW for the first 2 kW and ₹18,000 for the third kW, up to ₹78,000. Nothing is added beyond 3 kW. Special category states get slightly higher rates.'],
  ['What is a DCR panel?', 'DCR means panels made in India. The subsidy applies only if the system uses eligible DCR panels, so every quote on this site says whether its panels qualify.'],
  ['Does the AI decide the price or the winner?', 'No. Cost, subsidy, payback and ranking are worked out by fixed rules that follow the scheme guidelines. The AI only explains the result in plain language and always shows when its answer is a saved or basic one.'],
  ['Who can see my address and phone number?', 'Only you, until you accept a quote. Vendors see a masked name, your city and a location rounded to about 1 km. After you accept, the winning vendor gets your full details.'],
  ['Are these figures exact?', 'They are estimates to help you decide. Eligibility and the final subsidy are confirmed through the official PM Surya Ghar process.'],
];

function RoleCard({ role, img, grad, icon, title, sub, points, yellow, onPick }) {
  const pick = () => onPick(role, 'signup');
  return (
    <div className="role-card rc group bg-white rounded-2xl overflow-hidden flex flex-col" role="button" tabIndex={0} aria-label={`${title}: ${sub}`}
      onClick={pick} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }}>
      <div className="relative h-36 overflow-hidden" style={{ background: grad }}>
        <div className="absolute inset-0 flex items-center justify-center text-5xl" aria-hidden="true">{icon}</div>
        <img src={unsplash(img, 700)} alt="" loading="lazy" className="relative w-full h-full object-cover" onError={e => e.currentTarget.remove()} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        <div className="absolute left-3 bottom-3 w-10 h-10 rounded-xl bg-white/95 shadow flex items-center justify-center text-xl" aria-hidden="true">{icon}</div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="font-extrabold text-gray-900 text-lg">{title}</div>
        <div className="text-sm text-gray-500">{sub}</div>
        <ul className="mt-3 space-y-1.5 text-sm text-gray-600 flex-1">
          {points.map(p => <li key={p} className="flex items-start gap-2"><span className="text-green-600 font-bold">✓</span>{p}</li>)}
        </ul>
        <div className={`mt-5 rounded-xl py-2.5 text-sm font-bold text-center ${yellow ? 'bg-yellow-400 text-gray-900' : 'bg-green-600 text-white'}`}>Create free account <span className="go inline-block">→</span></div>
      </div>
    </div>
  );
}

function SectionHead({ eyebrow, title, sub }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="text-green-700 text-xs font-bold uppercase tracking-widest">{eyebrow}</div>
      <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">{title}</h2>
      {sub && <p className="mt-3 text-gray-600 leading-relaxed">{sub}</p>}
    </div>
  );
}

function HowItWorks() {
  const [who, setWho] = useState('household');
  const tab = on => `px-5 py-2 rounded-lg text-sm font-bold transition ${on ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`;
  return (
    <section id="how" className="scroll-mt-20">
      <SectionHead eyebrow="How it works" title="From roof to rooftop power in four steps" />
      <div className="mt-6 flex justify-center">
        <div className="inline-flex gap-1 rounded-xl bg-gray-100 p-1" role="group" aria-label="Show steps for">
          <button type="button" onClick={() => setWho('household')} aria-pressed={who === 'household'} className={tab(who === 'household')}>🏠 For households</button>
          <button type="button" onClick={() => setWho('vendor')} aria-pressed={who === 'vendor'} className={tab(who === 'vendor')}>🔧 For vendors</button>
        </div>
      </div>
      <ol className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS[who].map(([icon, title, text], i) => (
          <li key={title} className="relative bg-white rounded-2xl border border-green-100 p-5 shadow-sm">
            <div className="absolute -top-3 -left-2 w-8 h-8 rounded-full bg-green-600 text-white text-sm font-extrabold flex items-center justify-center shadow">{i + 1}</div>
            <div className="text-3xl" aria-hidden="true">{icon}</div>
            <div className="mt-3 font-extrabold text-gray-900">{title}</div>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Subsidy({ onPick }) {
  return (
    <section id="subsidy" className="scroll-mt-20 rounded-3xl bg-gradient-to-br from-green-700 to-emerald-800 text-white p-6 sm:p-10 shadow-xl">
      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-8 items-center">
        <div>
          <div className="text-yellow-300 text-xs font-bold uppercase tracking-widest">Central subsidy</div>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">Up to ₹78,000 off your rooftop system</h2>
          <p className="mt-3 text-green-50/90 leading-relaxed">
            The PM Surya Ghar scheme pays part of the cost of a home rooftop system that uses eligible Made-in-India panels. We work out your exact figure from your quote.
          </p>
          <button type="button" onClick={() => onPick('household', 'signup')} className="mt-6 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-extrabold px-6 py-3 rounded-xl transition">Check my subsidy →</button>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20">
          <ul className="space-y-4">
            {SUBSIDY.map(([size, amount, width]) => (
              <li key={size}>
                <div className="flex items-baseline justify-between text-sm"><span className="font-semibold">{size}</span><span className="font-extrabold text-lg">{amount}</span></div>
                <div className="mt-1.5 h-2.5 rounded-full bg-white/20 overflow-hidden"><div className="h-full rounded-full bg-yellow-400" style={{ width: `${width}%` }} /></div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-green-50/80 leading-relaxed">
            Standard rates, which Gujarat uses. The scheme's stated period ends on 31 March 2027. Source:{' '}
            <a href={GUIDELINES_URL} target="_blank" rel="noopener noreferrer" className="underline font-semibold">MNRE guidelines for residential consumers</a>.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function Landing({ onPick }) {
  return (
    <div className="relative w-full max-w-6xl bounce-in my-auto">
      <header className="sticky top-0 z-20 -mx-2 mb-8 px-2 py-3 bg-amber-50/85 backdrop-blur rounded-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-3xl" aria-hidden="true">☀️</span>
          <div className="min-w-0">
            <div className="text-gray-900 font-extrabold text-lg tracking-tight leading-none">PM Surya Ghar</div>
            <div className="text-amber-600 font-semibold text-xs mt-0.5 truncate">Solar Marketplace</div>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-600" aria-label="Page sections">
          <button type="button" onClick={() => scrollTo('how')} className="hover:text-green-700">How it works</button>
          <button type="button" onClick={() => scrollTo('subsidy')} className="hover:text-green-700">Subsidy</button>
          <button type="button" onClick={() => scrollTo('features')} className="hover:text-green-700">Features</button>
          <button type="button" onClick={() => scrollTo('faq')} className="hover:text-green-700">FAQ</button>
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => onPick('household', 'login')} className="text-sm font-bold text-gray-700 hover:text-green-700 px-3 py-2">Log in</button>
          <button type="button" onClick={() => onPick('household', 'signup')} className="text-sm font-bold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl transition">Get started</button>
        </div>
      </header>

      <section className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700 shadow-sm">
            <span aria-hidden="true">☀️</span> Muft Bijli Yojana · scheme period to 31 March 2027
          </div>
          <div className="mt-4 h-1 w-24 rounded-full" style={{ background: 'linear-gradient(to right,#FF9933 33%,#e5e7eb 33% 66%,#138808 66%)' }} />
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.05]">
            Go solar with <span className="grad-text">quotes you can trust.</span>
          </h1>
          <p className="mt-5 text-gray-600 text-lg max-w-xl leading-relaxed">
            Post your need once. Local installers compete with real quotes. We work out your subsidy and payback by the official rules, and an AI assistant explains the best choice in plain words.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={() => onPick('household', 'signup')} className="cta-primary px-7 py-3.5 rounded-2xl font-extrabold text-white text-base">🏠 I need solar <span className="arrow">→</span></button>
            <button type="button" onClick={() => onPick('vendor', 'signup')} className="px-7 py-3.5 rounded-2xl font-extrabold text-green-800 text-base bg-white border-2 border-green-200 hover:border-green-500 transition">🔧 I'm an installer</button>
          </div>
          <p className="mt-4 text-sm text-gray-500">Already have an account?{' '}
            <button type="button" onClick={() => onPick('household', 'login')} className="font-bold text-green-700 hover:underline">Log in as household</button>{' · '}
            <button type="button" onClick={() => onPick('vendor', 'login')} className="font-bold text-green-700 hover:underline">as vendor</button>
          </p>
          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-gray-600">
            {['Subsidy worked out by official rules', 'English · हिन्दी · ગુજરાતી', 'Your phone stays private'].map(t => (
              <li key={t} className="flex items-center gap-1.5"><span className="text-green-600">✓</span>{t}</li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <Photo className="collage-img h-72 sm:h-96" fallback="linear-gradient(135deg,#fde047,#16a34a)" emoji="☀️"
            src={unsplash('photo-1509391366360-2e959784a276', 1100)} alt="Rooftop solar panels under a blue sky" imgClassName="relative" />
          <div className="float-a absolute -left-3 sm:-left-6 top-8 bg-white rounded-2xl shadow-xl px-4 py-3 border border-amber-100">
            <div className="text-xs text-gray-500 font-semibold">Central subsidy</div>
            <div className="grad-text font-extrabold text-2xl leading-tight">₹78,000</div>
            <div className="text-xs text-gray-500">up to, for 3 kW and above</div>
          </div>
          <div className="float-b absolute -right-2 sm:-right-5 -bottom-5 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 border border-green-100">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl" aria-hidden="true">🤖</div>
            <div><div className="font-extrabold text-gray-900 leading-none">Best quote, explained</div><div className="text-xs text-gray-500 mt-1">in your own language</div></div>
          </div>
        </div>
      </section>

      <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['₹78,000', 'maximum central subsidy'], ['2 roles', 'households and installers'], ['3 languages', 'English, Hindi, Gujarati'], ['0 AI guesses', 'on money. Rules do the maths']].map(([n, l]) => (
          <div key={l} className="bg-white/85 rounded-2xl border border-green-100 p-4 text-center shadow-sm">
            <div className="grad-text font-extrabold text-2xl">{n}</div><div className="text-xs text-gray-500 mt-1">{l}</div>
          </div>
        ))}
      </div>

      <div className="mt-20"><HowItWorks /></div>
      <div className="mt-20"><Subsidy onPick={onPick} /></div>

      <section id="features" className="mt-20 scroll-mt-20">
        <SectionHead eyebrow="Why this marketplace" title="Built so households can decide with confidence" />
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(([icon, title, text]) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl" aria-hidden="true">{icon}</div>
              <div className="mt-3 font-extrabold text-gray-900">{title}</div>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="start" className="mt-20 scroll-mt-20">
        <SectionHead eyebrow="Get started" title="Choose how you want to use it" sub="Creating an account takes under a minute." />
        <div className="mt-8 grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
          <RoleCard role="household" onPick={onPick} img="photo-1613665813446-82a78c468a1d" grad="linear-gradient(135deg,#fde047,#f59e0b)" icon="🏠"
            title="I Need Solar" sub="Household / Home owner" yellow points={['Get quotes from multiple vendors', 'AI compares quotes for you', 'See your subsidy and payback']} />
          <RoleCard role="vendor" onPick={onPick} img="photo-1624397640148-949b1732bb0a" grad="linear-gradient(135deg,#4ade80,#15803d)" icon="🔧"
            title="I'm a Vendor" sub="Installer / Solar company" points={['Find households ready to go solar', 'Send quotes in one form', 'Track installations & reviews']} />
        </div>
      </section>

      <section id="faq" className="mt-20 scroll-mt-20 max-w-3xl mx-auto">
        <SectionHead eyebrow="Questions" title="Good to know before you start" />
        <div className="mt-8 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 open:border-green-200">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-bold text-gray-900">
                {q}<span className="text-green-600 text-xl leading-none transition group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-20 rounded-3xl bg-gradient-to-r from-amber-400 to-yellow-300 p-8 sm:p-12 text-center shadow-xl">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">Ready to see what solar would save you?</h2>
        <p className="mt-3 text-gray-800/80 max-w-xl mx-auto">Post a request and get your first quotes, with the subsidy already worked out.</p>
        <button type="button" onClick={() => onPick('household', 'signup')} className="mt-6 bg-gray-900 hover:bg-gray-800 text-white font-extrabold px-8 py-3.5 rounded-2xl transition">Get started free →</button>
      </section>

      <footer className="mt-12 pb-4 text-center text-xs text-gray-500 leading-relaxed">
        <p>Figures are estimates to help you decide. Confirm your eligibility and final subsidy through the official PM Surya Ghar process.</p>
        <p className="mt-1">Built for the PM Surya Ghar Muft Bijli Yojana (Government of India scheme).</p>
      </footer>
    </div>
  );
}
