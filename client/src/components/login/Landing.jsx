import { Photo } from '../ui/bits.jsx';
import { unsplash } from '../../lib/utils.js';

function RoleCard({ role, img, grad, icon, title, sub, points, yellow, onPick }) {
  const pick = () => onPick(role);
  return (
    <div className="role-card rc group bg-white rounded-2xl overflow-hidden flex flex-col" role="button" tabIndex={0} aria-label={`${title}: ${sub}`}
      onClick={pick} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }}>
      <div className="relative h-28 sm:h-32 overflow-hidden" style={{ background: grad }}>
        <div className="absolute inset-0 flex items-center justify-center text-5xl" aria-hidden="true">{icon}</div>
        <img src={unsplash(img, 600)} alt="" loading="lazy" className="relative w-full h-full object-cover" onError={e => e.currentTarget.remove()} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        <div className="absolute left-3 bottom-3 w-10 h-10 rounded-xl bg-white/95 shadow flex items-center justify-center text-xl" aria-hidden="true">{icon}</div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="font-extrabold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500">{sub}</div>
        <ul className="mt-3 space-y-1 text-xs text-gray-600 flex-1">
          {points.map(p => <li key={p} className="flex items-start gap-1.5"><span className="text-green-600 font-bold">✓</span>{p}</li>)}
        </ul>
        <div className={`mt-4 rounded-xl py-2 text-sm font-bold text-center ${yellow ? 'bg-yellow-400 text-gray-900' : 'bg-green-600 text-white'}`}>Continue <span className="go inline-block">→</span></div>
      </div>
    </div>
  );
}

export default function Landing({ name, setName, onPick }) {
  return (
    <div className="relative w-full max-w-6xl bounce-in my-auto">
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="sun-float text-5xl" aria-hidden="true">☀️</div>
            <div>
              <div className="text-gray-900 font-extrabold text-2xl tracking-tight leading-none">PM Surya Ghar</div>
              <div className="text-amber-600 font-semibold text-sm mt-1">मुफ्त बिजली योजना — Solar Marketplace</div>
            </div>
          </div>
          <div className="mt-3 h-1 w-24 rounded-full" style={{ background: 'linear-gradient(to right,#FF9933 33%,#e5e7eb 33% 66%,#138808 66%)' }} />
          <h1 className="mt-7 text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-[1.08]">
            Power your home<br className="hidden sm:block" /> with <span className="grad-text">the sun.</span>
          </h1>
          <p className="mt-4 text-gray-600 text-base sm:text-lg max-w-lg leading-relaxed">
            One marketplace for rooftop solar: households get competing quotes and AI advice, installers find customers and manage every job.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 max-w-lg">
            {[['300', 'units a month\nscheme aim', 'border-yellow-100'], ['₹78K', 'max govt.\nsubsidy', 'border-green-100'], ['25+', 'years of\nclean power', 'border-yellow-100']].map(([n, l, b]) => (
              <div key={n} className={`bg-white/80 rounded-2xl border ${b} p-3 text-center shadow-sm`}><div className="grad-text font-extrabold text-xl">{n}</div><div className="text-xs text-gray-500 leading-tight whitespace-pre-line">{l}</div></div>
            ))}
          </div>
          <div className="hidden lg:block relative mt-8 max-w-lg">
            <Photo className="collage-img h-56" fallback="linear-gradient(135deg,#fde047,#16a34a)" emoji="☀️"
              src={unsplash('photo-1509391366360-2e959784a276', 1000)} alt="Rooftop solar panels under a blue sky" imgClassName="relative" />
            <div className="float-a absolute -right-5 -bottom-5 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 border border-green-100">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl" aria-hidden="true">🌱</div>
              <div><div className="font-extrabold text-gray-900 leading-none">Clean energy</div><div className="text-xs text-gray-500 mt-1">from your own rooftop</div></div>
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur border border-green-100 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-green-200/50">
          <h2 className="text-2xl font-extrabold text-gray-900">Get started</h2>
          <p className="text-sm text-gray-500 mt-1">Tell us your name and how you'd like to use the platform.</p>
          <div className="mt-5">
            <label htmlFor="login-name" className="text-green-800 text-xs font-bold uppercase tracking-widest mb-2 block">👤 Your name</label>
            <input id="login-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ravi Kumar or SunPower Solutions"
              className="w-full bg-green-50/50 border border-green-200 text-gray-800 placeholder-gray-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:bg-white transition" />
          </div>
          <p className="mt-6 text-green-800 text-xs font-bold uppercase tracking-widest mb-3">🙋 Continue as</p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <RoleCard role="household" onPick={onPick} img="photo-1613665813446-82a78c468a1d" grad="linear-gradient(135deg,#fde047,#f59e0b)" icon="🏠"
              title="I Need Solar" sub="Household / Home owner" yellow points={['Get quotes from multiple vendors', 'AI compares quotes for you', 'Subsidy up to ₹78,000']} />
            <RoleCard role="vendor" onPick={onPick} img="photo-1624397640148-949b1732bb0a" grad="linear-gradient(135deg,#4ade80,#15803d)" icon="🔧"
              title="I'm a Vendor" sub="Installer / Solar company" points={['Find households ready to go solar', 'Send quotes in one click', 'Track installations & reviews']} />
          </div>
          <p className="mt-5 text-center text-xs text-gray-500">Built for the PM Surya Ghar Muft Bijli Yojana (Govt. of India scheme)</p>
        </div>
      </div>
    </div>
  );
}
