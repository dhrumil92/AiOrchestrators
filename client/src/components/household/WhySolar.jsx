import { Icon, Reveal } from '../ui/bits.jsx';

const CARDS = [
  ['rupee', 'Save on Electricity Bills', 'Generate your own power. The scheme aims to provide free or low-cost electricity up to 300 units a month.', 'Lower monthly bills'],
  ['leaf', 'Environment Friendly', 'Silent, clean electricity straight from the sun — no fuel, no smoke, no noise.', '100% clean energy'],
  ['globe', 'Reduce Carbon Footprint', 'Every unit your roof makes is a unit you do not need to draw from the grid.', 'Lower emissions'],
  ['wrench', 'Low Maintenance', 'No moving parts. An occasional wash keeps panels efficient for decades.', '25-yr panel life'],
  ['trend', 'Long-Term Savings', 'With a subsidy of up to ₹78,000, the app works out your own money-back time from each real quote.', 'Payback per quote'],
  ['zap', 'Energy Independence', 'Depend less on the grid and rising tariffs. Net metering credits you for surplus power.', 'Net-metering credits'],
];

export default function WhySolar({ onPost }) {
  return (
    <section id="why-solar" data-hhsec className="py-4">
      <Reveal className="text-center max-w-2xl mx-auto">
        <span className="text-green-700 font-semibold text-sm tracking-widest uppercase">Benefits</span>
        <h3 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900">Why Choose Solar Energy?</h3>
        <p className="mt-3 text-gray-600">Clean power, lower bills and a brighter future — all from your own rooftop.</p>
      </Reveal>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {CARDS.map(([icon, title, text, tag], i) => {
          const y = i % 2 === 1;
          return (
            <Reveal key={title} delay={i * 80} className="why-card bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className={`why-icon w-12 h-12 rounded-xl flex items-center justify-center ${y ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}><Icon name={icon} /></div>
              <h4 className="mt-4 font-bold text-gray-900 text-lg">{title}</h4>
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">{text}</p>
              <span className={`inline-block mt-4 text-xs font-semibold px-3 py-1 rounded-full border ${y ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 'bg-green-50 text-green-800 border-green-200'}`}>{tag}</span>
            </Reveal>
          );
        })}
      </div>
      <Reveal className="mt-10 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-5 text-white" style={{ background: 'linear-gradient(135deg,#15803d,#16a34a 55%,#65a30d)' }}>
        <div>
          <div className="text-xl sm:text-2xl font-extrabold">Ready to make the switch?</div>
          <div className="text-green-100 mt-1 text-sm sm:text-base">Post your rooftop details once — vendors near you will send quotes.</div>
        </div>
        <button onClick={onPost} className="shrink-0 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-7 py-3.5 rounded-2xl shadow-lg transition hover:-translate-y-0.5">Post My Requirement →</button>
      </Reveal>
    </section>
  );
}

export function SubsidyRef() {
  const rows = [['1 kW', '₹30,000', '₹30,000 per kW'], ['2 kW', '₹60,000', '₹30,000 per kW'], ['3 kW', '₹78,000', 'Next kW at ₹18,000']];
  return (
    <div id="subsidy-ref" data-hhsec className="bg-white rounded-2xl shadow-md p-5">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">🇮🇳 PM Surya Ghar Subsidy Reference</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {rows.map(([kw, amt, net]) => (
          <div key={kw} className="subsidy-badge rounded-xl p-4 text-center text-white">
            <div className="text-2xl font-black">{kw}</div><div className="text-green-200 text-xs mt-1">Subsidy</div>
            <div className="text-xl font-bold">{amt}</div><div className="text-green-300 text-xs mt-1">{net}</div>
          </div>
        ))}
        <div className="rounded-xl p-4 text-center bg-amber-100 border-2 border-amber-300">
          <div className="text-2xl font-black text-amber-800">3+ kW</div><div className="text-amber-600 text-xs mt-1">Max Subsidy</div>
          <div className="text-xl font-bold text-amber-800">₹78,000</div><div className="text-amber-600 text-xs mt-1">Capped here</div>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3">Panels must be made in India to qualify. State subsidies are not included. <a className="underline text-green-700" href="https://solar.delhi.gov.in/public/assets/solar/PMSG_Guidelines_for_Residential_CFA_Capex_Mode.pdf" target="_blank" rel="noopener noreferrer">MNRE guidelines, section 5</a></p>
    </div>
  );
}
