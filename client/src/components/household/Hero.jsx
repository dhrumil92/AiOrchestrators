import { Photo, Reveal } from '../ui/bits.jsx';
import { unsplash } from '../../lib/utils.js';

export default function Hero({ firstName, go }) {
  return (
    <section id="hh-overview" data-hhsec className="hero-wrap relative rounded-3xl overflow-hidden border border-green-100 shadow-lg shadow-green-100/60">
      <svg className="sun-spin absolute -top-16 -right-16 w-56 h-56 text-yellow-300/60 pointer-events-none hidden md:block" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="50" cy="50" r="18" fill="currentColor" stroke="none" />
        <g strokeLinecap="round"><line x1="50" y1="4" x2="50" y2="20" /><line x1="50" y1="80" x2="50" y2="96" /><line x1="4" y1="50" x2="20" y2="50" /><line x1="80" y1="50" x2="96" y2="50" /><line x1="17" y1="17" x2="28" y2="28" /><line x1="72" y1="72" x2="83" y2="83" /><line x1="17" y1="83" x2="28" y2="72" /><line x1="72" y1="28" x2="83" y2="17" /></g>
      </svg>
      <div className="relative grid lg:grid-cols-2 gap-10 p-6 sm:p-10 lg:p-12 items-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 bg-white/80 border border-green-200 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 listening-pulse" />
            <span>Hi {firstName || 'there'} 👋 — PM Surya Ghar Muft Bijli Yojana</span>
          </span>
          <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
            Welcome Home!
            <span className="block grad-text mt-2 text-3xl sm:text-4xl">Start Your Journey Towards Smarter, Greener Energy.</span>
          </h2>
          <p className="mt-5 text-gray-600 text-base sm:text-lg max-w-xl leading-relaxed">
            Turn your rooftop into a power plant. Get competing quotes from registered installers, let AI compare them, and claim up to <strong className="text-green-700">₹78,000</strong> in government subsidy.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button onClick={() => go('why-solar')} className="cta-primary whitespace-nowrap rounded-2xl text-white font-bold text-base sm:text-lg px-8 py-4">
              Explore Solar Benefits <span className="arrow">→</span>
            </button>
            <button onClick={() => go('request-form-card')} className="whitespace-nowrap rounded-2xl font-bold text-base px-7 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 shadow-md shadow-yellow-200 transition hover:-translate-y-0.5">
              ☀️ Get Free Quotes
            </button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
            {['Govt. subsidy up to ₹78,000', 'Multiple vendor quotes', 'AI-powered advice'].map(t => (
              <span key={t} className="flex items-center gap-1.5"><span className="text-green-600 font-bold">✓</span> {t}</span>
            ))}
          </div>
        </Reveal>
        <Reveal delay={150} className="relative">
          <div className="grid grid-cols-5 grid-rows-2 gap-3 sm:gap-4 h-72 sm:h-96">
            <Photo className="collage-img col-span-3 row-span-2" fallback="linear-gradient(135deg,#fde047,#16a34a)" emoji="☀️" imgClassName="relative" src={unsplash('photo-1509391366360-2e959784a276', 900)} alt="Solar panels installed on a rooftop" />
            <Photo className="collage-img col-span-2" fallback="linear-gradient(135deg,#bbf7d0,#22c55e)" emoji="🏡" imgClassName="relative" src={unsplash('photo-1613665813446-82a78c468a1d', 900)} alt="House powered by solar energy" />
            <Photo className="collage-img col-span-2" fallback="linear-gradient(135deg,#d9f99d,#65a30d)" emoji="🌱" imgClassName="relative" src={unsplash('photo-1542601906990-b4d3fb778b09', 900)} alt="Green, sustainable living" />
          </div>
          <div className="float-a absolute -left-2 sm:-left-5 bottom-6 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 border border-yellow-100">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center text-xl" aria-hidden="true">⚡</div>
            <div><div className="font-extrabold text-gray-900 leading-none">Up to 300 units</div><div className="text-xs text-gray-500 mt-1">the scheme aims to cover</div></div>
          </div>
          <div className="float-b absolute -right-2 sm:-right-4 top-6 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 border border-green-100">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl" aria-hidden="true">🌍</div>
            <div><div className="font-extrabold text-gray-900 leading-none">Clean power</div><div className="text-xs text-gray-500 mt-1">from your own roof</div></div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
