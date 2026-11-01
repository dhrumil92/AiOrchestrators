import { useEffect, useState } from 'react';
import { Icon, Photo } from '../ui/bits.jsx';
import { unsplash } from '../../lib/utils.js';

function Carousel({ slides, badge, shadow }) {
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0);            // restarts the timer after a manual pick
  useEffect(() => {
    const t = setInterval(() => setI(x => (x + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length, tick]);
  return (
    <div className={`relative h-64 md:h-80 rounded-3xl overflow-hidden shadow-xl ${shadow}`}>
      {slides.map((s, k) => (
        <div key={s.title} className={`slide ${k === i ? 'active' : ''}`} style={{ background: s.grad }} aria-hidden={k !== i}>
          <div className="absolute inset-0 flex items-center justify-center text-8xl" aria-hidden="true">{s.emoji}</div>
          <img src={unsplash(s.img)} alt={s.title} loading="lazy" className="relative" onError={e => e.currentTarget.remove()} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 pb-8 text-white">
            <div className="font-extrabold text-xl leading-tight">{s.title}</div>
            <div className="text-white/85 text-sm mt-1">{s.sub}</div>
          </div>
        </div>
      ))}
      <div className="absolute top-4 left-4 bg-white/90 text-green-800 text-xs font-bold px-3 py-1 rounded-full shadow">{badge}</div>
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {slides.map((s, k) => (
          <button key={k} aria-label={`Show slide ${k + 1}`} className={`slide-dot ${k === i ? 'active' : ''}`} onClick={() => { setI(k); setTick(t => t + 1); }} />
        ))}
      </div>
    </div>
  );
}

const StatStrip = ({ items, border }) => (
  <div className={`grid grid-cols-4 gap-2 bg-white rounded-2xl p-4 border ${border} shadow-sm text-center`}>
    {items.map(([n, l]) => (
      <div key={l}><div className="grad-text font-extrabold text-lg md:text-2xl">{n}</div><div className="text-gray-500 text-xs leading-tight whitespace-pre-line">{l}</div></div>
    ))}
  </div>
);

const Steps = ({ steps, title = 'How it works', className }) => (
  <div className={`rounded-2xl p-5 border border-green-100 ${className}`}>
    <h3 className="text-gray-900 font-extrabold text-base mb-3">{title}</h3>
    <div className="grid grid-cols-3 gap-3 text-center">
      {steps.map(([color, text], k) => (
        <div key={text}><div className={`w-9 h-9 mx-auto rounded-full font-bold flex items-center justify-center ${color}`}>{k + 1}</div><div className="text-xs text-gray-700 font-semibold mt-2">{text}</div></div>
      ))}
    </div>
  </div>
);

export function HouseholdShowcase() {
  const benefits = [
    ['⚡', 'Free Electricity', 'The scheme aims at free or low-cost power, up to 300 units a month.', '#fef3c7'],
    ['💰', 'Big Subsidy', '₹30,000/kW for 2 kW, up to ₹78,000 for 3 kW+.', '#d1fae5'],
    ['📉', 'Lower Bills', 'Lower your monthly electricity bill with your own power.', '#dcfce7'],
    ['🔁', 'Earn from Surplus', 'Net metering sends extra power to the grid for credit.', '#fef9c3'],
    ['🌍', 'Go Green', 'Clean electricity from your own rooftop.', '#dcfce7'],
    ['🛠️', 'Low Maintenance', 'Just occasional cleaning. Panels last 25+ years.', '#fef3c7'],
  ];
  return (
    <div className="space-y-5">
      <Carousel badge="🇮🇳 PM Surya Ghar Muft Bijli Yojana" shadow="shadow-amber-200/60" slides={[
        { img: 'photo-1509391366360-2e959784a276', emoji: '☀️', title: 'Power your home with the sun', sub: 'Free or low-cost power, up to 300 units a month', grad: 'linear-gradient(135deg,#fbbf24,#f97316)' },
        { img: 'photo-1508514177221-188b1cf16e9d', emoji: '🏠', title: 'Up to ₹78,000 Govt. subsidy', sub: 'Credited directly to your bank account under PM Surya Ghar', grad: 'linear-gradient(135deg,#34d399,#059669)' },
        { img: 'photo-1497440001374-f26997328c1b', emoji: '🌱', title: 'Clean energy for 25+ years', sub: 'Cut your bills and your carbon footprint together', grad: 'linear-gradient(135deg,#86efac,#16a34a)' },
      ]} />
      <StatStrip border="border-amber-100" items={[['300', 'free units\nper month'], ['₹78K', 'max\nsubsidy'], ['25+', 'years of\nfree power']]} />
      <div>
        <h3 className="text-gray-800 font-extrabold text-lg mb-3">Why go solar? ☀️</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {benefits.map(([icon, t, d, bg]) => (
            <div key={t} className="benefit-card bg-white rounded-2xl p-4 border border-amber-100">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-2" style={{ background: bg }} aria-hidden="true">{icon}</div>
              <div className="font-bold text-gray-800 text-sm">{t}</div>
              <div className="text-gray-500 text-xs mt-1 leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>
      <Steps className="bg-gradient-to-r from-amber-100 via-orange-50 to-emerald-50" steps={[
        ['bg-amber-500 text-white', 'Register & post your rooftop'], ['bg-yellow-400 text-gray-900', 'Compare vendor quotes with AI'], ['bg-green-600 text-white', 'Install & claim your subsidy']]} />
    </div>
  );
}

export function VendorShowcase() {
  const feats = [
    ['target', 'Qualified leads', 'Households share their bill, budget, roof area and exact location.', false],
    ['map', 'Demand on a map', 'Spot open enquiries near your service area at a glance.', true],
    ['box', 'One-click quotes', 'Save your panels and inverters once, reuse them in every quote.', false],
    ['steps', 'Installation tracker', 'Survey → DISCOM approval → install → net metering, all in one place.', true],
    ['shield', 'Verified badge', 'Complete your business profile to stand out to households.', false],
    ['star', 'Reviews that sell', 'Happy customers rate your work after every completed job.', true],
  ];
  return (
    <div className="space-y-5">
      <Carousel badge="🤝 Vendor & Installer Partner Program" shadow="shadow-green-200/60" slides={[
        { img: 'photo-1624397640148-949b1732bb0a', emoji: '🔧', title: 'Grow your solar installation business', sub: 'Reach households who are actively looking for rooftop solar', grad: 'linear-gradient(135deg,#16a34a,#065f46)' },
        { img: 'photo-1559302504-64aae6ca6b6d', emoji: '⚡', title: 'Quote on real enquiries for free', sub: 'See bill, budget, roof size and location before you quote', grad: 'linear-gradient(135deg,#facc15,#ca8a04)' },
        { img: 'photo-1611365892117-00ac5ef43c90', emoji: '📈', title: 'Track every job to commissioning', sub: 'Keep each customer updated at every installation stage', grad: 'linear-gradient(135deg,#22c55e,#15803d)' },
      ]} />
      <div className="rounded-2xl p-5 flex items-center gap-4 border border-green-100" style={{ background: 'linear-gradient(135deg,#f0fdf4,#fefce8)' }}>
        <div className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-2xl text-white shadow-md" style={{ background: 'linear-gradient(135deg,#16a34a,#ca8a04)' }} aria-hidden="true">☀️</div>
        <div>
          <div className="font-extrabold text-gray-900">A national push for rooftop solar</div>
          <div className="text-sm text-gray-600 mt-0.5">PM Surya Ghar Muft Bijli Yojana aims to bring rooftop solar to <strong className="text-green-700">1 crore homes</strong>, with subsidies of up to ₹78,000 per household.</div>
        </div>
      </div>
      <StatStrip border="border-green-100" items={[['₹0', 'to join\n& quote'], ['6', 'tracked install\nstages'], ['1-click', 'quotes from\nyour catalogue'], ['AI', 'quote\ncomparison']]} />
      <div>
        <h3 className="text-gray-900 font-extrabold text-lg mb-3">Why partner with us? 🤝</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {feats.map(([icon, t, d, y]) => (
            <div key={t} className="why-card bg-white rounded-2xl p-4 border border-gray-100">
              <div className={`why-icon w-10 h-10 rounded-xl flex items-center justify-center ${y ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}><Icon name={icon} size={20} /></div>
              <div className="mt-2.5 font-bold text-gray-900 text-sm">{t}</div>
              <div className="text-gray-500 text-xs mt-1 leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>
      <Steps className="bg-white" steps={[
        ['bg-green-600 text-white', 'Create your business profile'], ['bg-yellow-400 text-gray-900', 'Quote on nearby enquiries'], ['bg-green-600 text-white', 'Install, track & get reviewed']]} />
    </div>
  );
}
