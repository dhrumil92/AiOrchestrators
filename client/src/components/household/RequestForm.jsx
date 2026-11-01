import { useRef, useState } from 'react';
import { db } from '../../lib/storage.js';
import { genId, isValidPhone } from '../../lib/utils.js';
import { voicePrompt } from '../../lib/gemini.js';
import { startSpeech } from '../../lib/speech.js';
import { useGemini } from '../../lib/useGemini.js';
import { useToast } from '../ui/Toast.jsx';
import LeafletMap, { pinIcon } from '../shared/LeafletMap.jsx';
import L from 'leaflet';

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white transition';
const labelCls = 'text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wide';

export default function RequestForm({ household, profile, active, onPosted }) {
  const toast = useToast();
  const callGemini = useGemini();
  const blank = () => ({ name: profile.name || '', phone: profile.phone || '', address: profile.address || '', bill: '', budget: '', roof: '' });
  const [f, setF] = useState(blank);
  const [pin, setPin] = useState(null);           // { lat, lng }
  const [photo, setPhoto] = useState(null);       // { dataUrl, base64 }
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const fileRef = useRef(null);
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));

  function placePin(lat, lng) {
    const m = mapRef.current;
    if (!m) return;
    if (markerRef.current) m.removeLayer(markerRef.current);
    markerRef.current = L.marker([lat, lng], { icon: pinIcon() }).addTo(m);
    setPin({ lat, lng });
  }
  function useMyLocation() {
    if (!navigator.geolocation) return toast('Geolocation not supported', 'error');
    toast('Getting your location...', 'info');
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      mapRef.current?.setView([latitude, longitude], 15);
      placePin(latitude, longitude);
      toast('Location set!', 'success');
    }, () => toast('Could not get location', 'error'));
  }

  function onPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto({ dataUrl: ev.target.result, base64: ev.target.result.split(',')[1] });
    reader.readAsDataURL(file);
  }

  async function parseVoice(text) {
    toast('Processing your voice input with AI...', 'info');
    const res = await callGemini(voicePrompt(text));
    if (!res) return;
    try {
      const d = JSON.parse(res.replace(/```json|```/g, '').trim());
      setF(s => ({ ...s,
        name: d.name || s.name, phone: d.phone || s.phone, address: d.address || s.address,
        bill: d.monthlyBill ?? s.bill, budget: d.budget ?? s.budget, roof: d.roofArea ?? s.roof }));
      toast('✅ Form filled from your voice!', 'success');
    } catch { toast('Could not parse voice. Please fill manually.', 'error'); }
  }
  function toggleVoice() {
    if (recRef.current) { try { recRef.current.stop(); } catch {} recRef.current = null; setListening(false); return; }
    const rec = startSpeech({
      onResult: t => { setTranscript(t); parseVoice(t); },
      onEnd: () => { recRef.current = null; setListening(false); },
      onError: err => { recRef.current = null; setListening(false); toast(err === 'unsupported' ? 'Voice input requires Chrome or Edge browser.' : 'Voice error: ' + err, 'error'); },
    });
    if (rec) { recRef.current = rec; setListening(true); }
  }

  function submit(e) {
    e.preventDefault();
    const name = f.name.trim(), phone = f.phone.trim(), address = f.address.trim();
    const bill = parseFloat(f.bill), budget = parseFloat(f.budget);
    if (!name || !phone || !address || !(bill >= 0) || !(budget >= 0) || f.bill === '' || f.budget === '') return toast('Please fill in all required fields.', 'error');
    if (!isValidPhone(phone)) return toast('Enter a valid 10-digit mobile number.', 'error');
    if (!pin) return toast('Please pin your location on the map!', 'error');
    const req = {
      id: genId(), name, phone, address, lat: +pin.lat.toFixed(6), lng: +pin.lng.toFixed(6),
      monthlyBill: bill, budget, roofArea: parseFloat(f.roof) || 0, photo: photo?.base64 || null,
      createdAt: new Date().toISOString(), status: 'open', householdId: household?.id || null,
    };
    db.saveRequests([...db.requests(), req]);
    toast('🎉 Request posted! Vendors will quote soon.', 'success');
    setF(blank()); setPhoto(null); setTranscript('');
    if (fileRef.current) fileRef.current.value = '';
    if (markerRef.current) { mapRef.current?.removeLayer(markerRef.current); markerRef.current = null; }
    setPin(null);
    onPosted?.();
  }

  return (
    <div id="request-form-card" data-hhsec className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between gap-3">
        <h3 className="font-bold text-gray-800 text-lg">📋 Post Your Solar Requirement</h3>
        <button type="button" onClick={toggleVoice} className={`shrink-0 flex items-center gap-2 text-white px-4 py-2 rounded-full text-sm font-semibold transition shadow-md ${listening ? 'bg-red-500 listening-pulse' : 'bg-green-600 hover:bg-green-700'}`}>
          🎤 <span>{listening ? 'Listening...' : 'Fill by Voice'}</span>
        </button>
      </div>
      {listening && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex flex-wrap items-center gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-full listening-pulse" />
          <span className="text-red-700 text-sm font-medium">Listening... Speak your requirement</span>
          <span className="text-red-500 text-xs">(e.g. "My name is Ravi, monthly bill 2000 rupees, budget 1 lakh 50 thousand, I live in Pune")</span>
        </div>
      )}
      {transcript && <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 text-sm text-blue-800 italic">🎤 You said: "{transcript}"</div>}

      <form onSubmit={submit} noValidate className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div><label htmlFor="h-name" className={labelCls}>Full Name *</label><input id="h-name" value={f.name} onChange={set('name')} placeholder="e.g. Ravi Kumar" className={inputCls} /></div>
        <div><label htmlFor="h-phone" className={labelCls}>Phone Number *</label><input id="h-phone" type="tel" inputMode="numeric" value={f.phone} onChange={set('phone')} placeholder="98XXXXXXXX" className={inputCls} /></div>
        <div className="md:col-span-2"><label htmlFor="h-address" className={labelCls}>Address *</label><input id="h-address" value={f.address} onChange={set('address')} placeholder="House no., street, city, state" className={inputCls} /></div>
        <div>
          <label htmlFor="h-bill" className={labelCls}>Monthly Electricity Bill (₹) *</label>
          <input id="h-bill" type="number" min="0" value={f.bill} onChange={set('bill')} placeholder="e.g. 2500" className={inputCls} />
          <p className="text-xs text-gray-500 mt-1">Your average monthly bill in ₹</p>
        </div>
        <div>
          <label htmlFor="h-budget" className={labelCls}>Budget (₹) *</label>
          <input id="h-budget" type="number" min="0" value={f.budget} onChange={set('budget')} placeholder="e.g. 200000" className={inputCls} />
          <p className="text-xs text-gray-500 mt-1">Typical 3kW system: ₹1.5–2.5L before subsidy</p>
        </div>
        <div><label htmlFor="h-roof" className={labelCls}>Roof Area Available (sq ft)</label><input id="h-roof" type="number" min="0" value={f.roof} onChange={set('roof')} placeholder="e.g. 400" className={inputCls} /></div>
        <div>
          <label htmlFor="h-photo" className={labelCls}>Terrace / Rooftop Photo</label>
          <input id="h-photo" ref={fileRef} type="file" accept="image/*" onChange={onPhoto} className="w-full border border-dashed border-amber-300 rounded-xl px-4 py-2.5 text-sm bg-amber-50 cursor-pointer" />
          <p className="text-xs text-gray-500 mt-1">AI will analyze for obstructions & solar potential</p>
        </div>
        {photo && (
          <div className="md:col-span-2">
            <span className={labelCls}>Photo Preview</span>
            <div className="relative rounded-xl overflow-hidden border-2 border-amber-200 max-h-48">
              <img src={photo.dataUrl} alt="Your rooftop" className="w-full h-48 object-cover" />
              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">✅ Uploaded</div>
              <button type="button" onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ''; }} className="absolute top-2 left-2 bg-white/90 hover:bg-white text-gray-700 text-xs px-2 py-1 rounded-full font-semibold">✕ Remove</button>
            </div>
          </div>
        )}
        <div className="md:col-span-2">
          <span className={labelCls}>📍 Pin Your Location on Map *</span>
          <div className="flex flex-wrap gap-2 mb-2">
            <button type="button" onClick={useMyLocation} className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-4 py-2 rounded-lg font-semibold transition flex items-center gap-1.5">📡 Use My Location</button>
            {pin && <span className="text-xs text-gray-500 self-center">📍 {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}</span>}
          </div>
          <LeafletMap active={active} className="border-2 border-amber-200 rounded-xl shadow-inner" style={{ height: 350 }}
            onReady={m => { mapRef.current = m; m.on('click', e => placePin(e.latlng.lat, e.latlng.lng)); }} />
          <p className="text-xs text-gray-500 mt-1">Click anywhere on the map to drop a pin on your home</p>
        </div>
        <div className="md:col-span-2">
          <button type="submit" className="cta-primary w-full py-4 rounded-xl font-extrabold text-white text-lg">🚀 Post My Solar Requirement</button>
        </div>
      </form>
    </div>
  );
}
