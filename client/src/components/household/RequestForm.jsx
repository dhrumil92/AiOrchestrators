import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { api } from '../../lib/api.js';
import { refreshMarket } from '../../lib/storage.js';
import { cancelRecording, MIN_AUDIO_BYTES, startRecording } from '../../lib/recorder.js';
import { applyVoiceFields, describeVoice, voiceSummary } from '../../lib/voiceFill.js';
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
  const [review, setReview] = useState(null);     // what to check after a recording, from describeVoice
  const [voiced, setVoiced] = useState([]);       // form keys filled from voice and not edited since
  const [busy, setBusy] = useState(false);
  const recRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const fileRef = useRef(null);
  const set = k => e => { setF(s => ({ ...s, [k]: e.target.value })); setVoiced(v => v.filter(x => x !== k)); };

  const fieldCls = k => {
    if (voiced.includes(k)) return `${inputCls} ring-2 ring-green-300 border-green-400`;
    if (review?.confirmKeys.includes(k) && f[k] === '') return `${inputCls} ring-2 ring-amber-300 border-amber-400`;
    return inputCls;
  };
  const voiceTag = k => voiced.includes(k) && <span className="ml-2 normal-case tracking-normal text-green-700 font-semibold">🎤 from your voice, please check</span>;

  // Leaving the page while recording must release the microphone.
  useEffect(() => () => cancelRecording(recRef.current), []);

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

  // Fills the form for review. It never posts the request: that needs the submit button.
  async function understand(blob) {
    if (blob.size < MIN_AUDIO_BYTES) {
      setVoice('idle');
      return toast('That recording was empty. Please try again and speak after pressing the button.', 'error');
    }
    setVoice('understanding');
    try {
      const r = await api.transcribe(blob, language);
      setTranscript(r.transcript);
      setReview(r.transcript ? describeVoice(r) : null);
      const { form, voiced: keys } = applyVoiceFields(f, r.fields);
      setF(form);
      setVoiced(keys);
      const { text, kind } = voiceSummary(r, keys.length);
      toast(text, kind);
    } catch (err) { toast(err.message, 'error'); }
    finally { setVoice('idle'); }
  }
  async function toggleVoice() {
    if (recRef.current) { recRef.current.stop(); recRef.current = null; return; }
    if (voice !== 'idle') return;
    setVoice('starting');
    const rec = await startRecording({ onDone: understand, onError: msg => toast(msg, 'error') });
    if (rec) { recRef.current = rec; setVoice('listening'); } else setVoice('idle');
  }
  function cancelVoice() {
    cancelRecording(recRef.current);
    recRef.current = null;
    setVoice('idle');
    toast('Recording cancelled. Nothing was changed.', 'info');
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
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
      setF(blank()); setPhoto(null); setTranscript(''); setReview(null); setVoiced([]);
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
          <button type="button" onClick={toggleVoice} disabled={voice === 'understanding' || voice === 'starting'} className={`flex items-center gap-2 text-white px-4 py-2 rounded-full text-sm font-semibold transition shadow-md disabled:opacity-60 ${voice === 'listening' ? 'bg-red-500 listening-pulse' : 'bg-green-600 hover:bg-green-700'}`}>
            🎤 <span>{voice === 'listening' ? 'Stop' : voice === 'understanding' ? 'Understanding…' : transcript ? 'Record again' : 'Fill by Voice'}</span>
          </button>
        </div>
      </div>
      {voice === 'listening' && (
        <div role="status" className="bg-red-50 border-b border-red-200 px-6 py-3 flex flex-wrap items-center gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-full listening-pulse" />
          <span className="text-red-700 text-sm font-medium">Recording… say your monthly units, terrace area, address, budget and the kW you want, then press Stop</span>
          <button type="button" onClick={cancelVoice} className="text-red-700 text-xs font-bold underline">Cancel</button>
          <span className="w-full text-red-500 text-xs">For example: "मेरा महीने का उपयोग 300 यूनिट है, छत 500 वर्ग फीट है और बजट डेढ़ लाख है"</span>
        </div>
      )}
      {voice === 'understanding' && <div role="status" className="bg-amber-50 border-b border-amber-100 px-6 py-3 text-sm text-amber-800 font-medium">⏳ Listening to your recording…</div>}
      {transcript && (
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 text-sm text-blue-900 space-y-1.5">
          <div className="italic">🎤 You said: "{transcript}"</div>
          {review && (
            <>
              <div className="font-semibold">Nothing is posted yet. Check the highlighted boxes below, change anything that is wrong, then press "Post My Solar Requirement".</div>
              {review.unclear.length > 0 && <div className="text-amber-800">⚠️ Not clear, please confirm: {review.unclear.join(', ')}.</div>}
              {review.missing.length > 0 && <div className="text-gray-700">Not mentioned: {review.missing.join(', ')}.</div>}
              {review.extras.length > 0 && (
                <div className="text-gray-700">
                  Also heard: {review.extras.map(([k, v]) => `${k}: ${v}`).join(' · ')}. These are not part of the request form yet, so mention them to your installer.
                </div>
              )}
            </>
          )}
        </div>
      )}

      <form onSubmit={submit} noValidate className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div><label htmlFor="h-name" className={labelCls}>Full Name *</label><input id="h-name" value={f.name} onChange={set('name')} placeholder="e.g. Ravi Kumar" className={inputCls} /></div>
        <div><label htmlFor="h-phone" className={labelCls}>Phone</label><input id="h-phone" type="tel" value={f.phone} onChange={set('phone')} placeholder="Shared only with the vendor you accept" className={inputCls} /></div>
        <div className="md:col-span-2"><label htmlFor="h-address" className={labelCls}>Address *{voiceTag('address')}</label><input id="h-address" value={f.address} onChange={set('address')} placeholder="House no., street, city" className={fieldCls('address')} /><p className="text-xs text-gray-500 mt-1">Put the city last. Vendors see only the city until you accept a quote.</p></div>
        <div>
          <label htmlFor="h-units" className={labelCls}>Monthly Electricity Use (units) *{voiceTag('units')}</label>
          <input id="h-units" type="number" min="1" value={f.units} onChange={set('units')} placeholder="e.g. 300" className={fieldCls('units')} />
          <p className="text-xs text-gray-500 mt-1">Units (kWh), as shown on your bill</p>
        </div>
        <div>
          <label htmlFor="h-budget" className={labelCls}>Budget (₹) *{voiceTag('budget')}</label>
          <input id="h-budget" type="number" min="1" value={f.budget} onChange={set('budget')} placeholder="e.g. 150000" className={fieldCls('budget')} />
        </div>
        <div>
          <label htmlFor="h-area" className={labelCls}>Clear Terrace Area (sq m){voiceTag('area')}</label>
          <input id="h-area" type="number" min="0" step="any" value={f.area} onChange={set('area')} placeholder="e.g. 30" className={fieldCls('area')} />
          <p className="text-xs text-gray-500 mt-1">{voiced.includes('area') ? 'Converted to square metres from what you said (1 sq ft = 0.0929 sq m)' : 'You can confirm this after the terrace check'}</p>
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
