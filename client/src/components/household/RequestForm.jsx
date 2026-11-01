import { useRef, useState } from 'react';
import L from 'leaflet';
import { api } from '../../lib/api.js';
import { refreshMarket } from '../../lib/storage.js';
import { startRecording } from '../../lib/recorder.js';
import { useToast } from '../ui/Toast.jsx';
import LeafletMap, { pinIcon } from '../shared/LeafletMap.jsx';
import { LANGUAGES } from './SolarPlan.jsx';

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white transition';
const labelCls = 'text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wide';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export default function RequestForm({ profile, active, onPosted }) {
  const toast = useToast();
  const blank = () => ({ name: profile.name || '', phone: '', address: '', units: '', budget: '', area: '' });
  const [f, setF] = useState(blank);
  const [language, setLanguage] = useState('hi');
  const [pin, setPin] = useState(null);           // { lat, lng }
  const [photo, setPhoto] = useState(null);       // { dataUrl, file }
  const [voice, setVoice] = useState('idle');     // idle | listening | understanding
  const [transcript, setTranscript] = useState('');
  const [busy, setBusy] = useState(false);
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
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_PHOTO_BYTES) {
      e.target.value = '';
      return toast('Use a JPEG, PNG or WebP photo up to 5 MB.', 'error');
    }
    const reader = new FileReader();
    reader.onload = ev => setPhoto({ dataUrl: ev.target.result, file });
    reader.readAsDataURL(file);
  }

  async function understand(blob) {
    setVoice('understanding');
    try {
      const r = await api.transcribe(blob, language);
      setTranscript(r.transcript);
      if (!r.transcript) return toast('We could not hear that. Please try again or type.', 'error');
      setF(s => ({ ...s, units: r.fields.monthlyUnits ?? s.units, budget: r.fields.budgetRupees ?? s.budget }));
      const filled = r.fields.monthlyUnits !== null || r.fields.budgetRupees !== null;
      toast(filled ? '✅ Form filled from your voice. Please check it.' : 'We heard you, but found no units or budget. Please type them.', filled ? 'success' : 'info');
    } catch (err) { toast(err.message, 'error'); }
    finally { setVoice('idle'); }
  }
  async function toggleVoice() {
    if (recRef.current) { recRef.current.stop(); recRef.current = null; return; }
    if (voice !== 'idle') return;
    const rec = await startRecording({ onDone: understand, onError: msg => toast(msg, 'error') });
    if (rec) { recRef.current = rec; setVoice('listening'); }
  }

  async function submit(e) {
    e.preventDefault();
    const name = f.name.trim(), address = f.address.trim();
    const units = Number(f.units), budget = Number(f.budget);
    if (!name || !address || !(units > 0) || !(budget > 0)) return toast('Please fill in all required fields.', 'error');
    if (!pin) return toast('Please pin your location on the map!', 'error');
    setBusy(true);
    try {
      const req = await api.createRequest({
        householdName: name, addressText: address, ...(f.phone.trim() ? { phone: f.phone.trim() } : {}), latitude: +pin.lat.toFixed(6), longitude: +pin.lng.toFixed(6),
        monthlyUnits: Math.round(units), budgetRupees: Math.round(budget), preferredLanguage: language,
        ...(f.area !== '' ? { usableAreaSqm: Number(f.area) } : {}),
      });
      if (photo) await api.uploadPhoto(req.id, photo.file);
      await refreshMarket();
      toast('🎉 Request posted! Vendors will quote soon.', 'success');
      setF(blank()); setPhoto(null); setTranscript('');
      if (fileRef.current) fileRef.current.value = '';
      if (markerRef.current) { mapRef.current?.removeLayer(markerRef.current); markerRef.current = null; }
      setPin(null);
      onPosted?.();
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  }

  return (
    <div id="request-form-card" data-hhsec className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between gap-3">
        <h3 className="font-bold text-gray-800 text-lg">📋 Post Your Solar Requirement</h3>
        <div className="shrink-0 flex items-center gap-2">
          <select value={language} onChange={e => setLanguage(e.target.value)} aria-label="Language" className="border border-gray-200 rounded-full px-3 py-2 text-sm bg-gray-50">
            {LANGUAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <button type="button" onClick={toggleVoice} disabled={voice === 'understanding'} className={`flex items-center gap-2 text-white px-4 py-2 rounded-full text-sm font-semibold transition shadow-md disabled:opacity-60 ${voice === 'listening' ? 'bg-red-500 listening-pulse' : 'bg-green-600 hover:bg-green-700'}`}>
            🎤 <span>{voice === 'listening' ? 'Stop' : voice === 'understanding' ? 'Understanding…' : 'Fill by Voice'}</span>
          </button>
        </div>
      </div>
      {voice === 'listening' && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex flex-wrap items-center gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-full listening-pulse" />
          <span className="text-red-700 text-sm font-medium">Listening... Say your units and budget, then press Stop</span>
          <span className="text-red-500 text-xs">(e.g. "मेरा महीने का उपयोग 300 यूनिट है और बजट डेढ़ लाख है")</span>
        </div>
      )}
      {transcript && <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 text-sm text-blue-800 italic">🎤 You said: "{transcript}"</div>}

      <form onSubmit={submit} noValidate className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div><label htmlFor="h-name" className={labelCls}>Full Name *</label><input id="h-name" value={f.name} onChange={set('name')} placeholder="e.g. Ravi Kumar" className={inputCls} /></div>
        <div><label htmlFor="h-phone" className={labelCls}>Phone</label><input id="h-phone" type="tel" value={f.phone} onChange={set('phone')} placeholder="Shared only with the vendor you accept" className={inputCls} /></div>
        <div className="md:col-span-2"><label htmlFor="h-address" className={labelCls}>Address *</label><input id="h-address" value={f.address} onChange={set('address')} placeholder="House no., street, city" className={inputCls} /><p className="text-xs text-gray-500 mt-1">Put the city last. Vendors see only the city until you accept a quote.</p></div>
        <div>
          <label htmlFor="h-units" className={labelCls}>Monthly Electricity Use (units) *</label>
          <input id="h-units" type="number" min="1" value={f.units} onChange={set('units')} placeholder="e.g. 300" className={inputCls} />
          <p className="text-xs text-gray-500 mt-1">Units (kWh), as shown on your bill</p>
        </div>
        <div>
          <label htmlFor="h-budget" className={labelCls}>Budget (₹) *</label>
          <input id="h-budget" type="number" min="1" value={f.budget} onChange={set('budget')} placeholder="e.g. 150000" className={inputCls} />
        </div>
        <div>
          <label htmlFor="h-area" className={labelCls}>Clear Terrace Area (sq m)</label>
          <input id="h-area" type="number" min="0" value={f.area} onChange={set('area')} placeholder="e.g. 30" className={inputCls} />
          <p className="text-xs text-gray-500 mt-1">You can confirm this after the terrace check</p>
        </div>
        <div>
          <label htmlFor="h-photo" className={labelCls}>Terrace / Rooftop Photo</label>
          <input id="h-photo" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} className="w-full border border-dashed border-amber-300 rounded-xl px-4 py-2.5 text-sm bg-amber-50 cursor-pointer" />
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
          <LeafletMap active={active} center={[22.3072, 73.1812]} zoom={11} className="border-2 border-amber-200 rounded-xl shadow-inner" style={{ height: 350 }}
            onReady={m => { mapRef.current = m; m.on('click', e => placePin(e.latlng.lat, e.latlng.lng)); }} />
          <p className="text-xs text-gray-500 mt-1">Click the map to drop a pin on your home. Bill savings use Gujarat rates.</p>
        </div>
        <div className="md:col-span-2">
          <button type="submit" disabled={busy} className="cta-primary w-full py-4 rounded-xl font-extrabold text-white text-lg disabled:opacity-60">{busy ? 'Posting…' : '🚀 Post My Solar Requirement'}</button>
        </div>
      </form>
    </div>
  );
}
