import { useMemo, useState } from 'react';
import { db, useDB } from '../../lib/storage.js';
import { useToast } from '../ui/Toast.jsx';
import Landing from './Landing.jsx';
import { HouseholdShowcase, VendorShowcase } from './Showcase.jsx';

// The demo has no real login: pick a household name, or one of the vendors on the server.
function ProfileStep({ role, initialName, onBack }) {
  useDB();
  const toast = useToast();
  const isHH = role === 'household';
  const vendors = db.vendorList();
  const [name, setName] = useState(initialName || 'Meena Patel');
  const [vendorId, setVendorId] = useState('');

  function submit(e) {
    e.preventDefault();
    const loginTime = new Date().toISOString();
    if (isHH) {
      if (!name.trim()) return toast('Please enter your name.', 'error');
      return db.saveSession({ role, name: name.trim(), profile: { name: name.trim() }, loginTime });
    }
    const v = vendors.find(x => x.id === (vendorId || vendors[0]?.id));
    if (!v) return toast('No vendors found. Is the server running and seeded?', 'error');
    db.saveSession({ role, name: v.name, vendorId: v.id, profile: {}, loginTime });
  }

  const label = isHH ? 'text-amber-700' : 'text-green-700';
  const field = `w-full text-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white transition ${isHH ? 'bg-amber-50/60 border border-amber-200' : 'bg-green-50/50 border border-green-200'}`;
  return (
    <div className="relative w-full max-w-6xl bounce-in my-auto">
      <div className="grid gap-6 items-start lg:grid-cols-[1.25fr_1fr]">
        <div>{isHH ? <HouseholdShowcase /> : <VendorShowcase />}</div>
        <form onSubmit={submit} className="order-first lg:order-none bg-white border border-amber-100 rounded-3xl p-7 shadow-xl shadow-amber-200/50 lg:sticky lg:top-4" noValidate>
          <div className="flex items-center gap-3 mb-6">
            <button type="button" onClick={onBack} aria-label="Back" className="text-gray-500 hover:text-gray-800 text-2xl leading-none transition">←</button>
            <div>
              <h2 className="text-gray-800 font-extrabold text-xl">{isHH ? '🏠 Household' : '🔧 Vendor'}</h2>
              <p className="text-gray-500 text-xs mt-0.5">Demo sign-in. You can switch role from the top bar at any time.</p>
            </div>
          </div>
          {isHH ? (
            <div>
              <label htmlFor="p-name" className={`${label} text-xs font-bold uppercase tracking-widest mb-1.5 block`}>👤 Your name</label>
              <input id="p-name" value={name} onChange={e => setName(e.target.value)} className={field} autoComplete="name" />
            </div>
          ) : (
            <div>
              <label htmlFor="p-vendor" className={`${label} text-xs font-bold uppercase tracking-widest mb-1.5 block`}>🏪 Sign in as</label>
              <select id="p-vendor" value={vendorId} onChange={e => setVendorId(e.target.value)} className={field}>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          )}
          <button type="submit" className="cta-primary mt-6 w-full py-3.5 rounded-2xl font-extrabold text-white text-base">Enter the App →</button>
        </form>
      </div>
    </div>
  );
}

export default function Login() {
  const [step, setStep] = useState(null);       // null | 'household' | 'vendor'
  const [name, setName] = useState('');
  const stars = useMemo(() => Array.from({ length: 80 }, (_, i) => {
    const size = Math.random() * 6 + 2;
    return { i, size, top: Math.random() * 100, left: Math.random() * 100, o: Math.random() * 0.35 + 0.1, d: Math.random() * 3 + 2, delay: Math.random() * 3 };
  }), []);
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-start px-4 py-8 overflow-y-auto"
      style={{ background: 'linear-gradient(160deg,#fffbeb 0%,#fff7ed 45%,#ecfdf5 100%)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {stars.map(s => (
          <div key={s.i} style={{ position: 'absolute', width: s.size, height: s.size, borderRadius: '50%', top: s.top + '%', left: s.left + '%',
            background: `rgba(245,158,11,${s.o})`, animation: `twinkle ${s.d}s ease-in-out ${s.delay}s infinite` }} />
        ))}
      </div>
      {step
        ? <ProfileStep key={step} role={step} initialName={name} onBack={() => setStep(null)} />
        : <Landing name={name} setName={setName} onPick={setStep} />}
    </div>
  );
}
