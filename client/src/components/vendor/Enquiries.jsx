import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { db, useDB } from '../../lib/storage.js';
import { isMyQuote } from '../../lib/domain.js';
import { estimateKw, inr, maskName, timeAgo } from '../../lib/utils.js';
import { EmptyState } from '../ui/bits.jsx';
import LeafletMap from '../shared/LeafletMap.jsx';
import { Chip, SectionHead } from './common.jsx';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function VendorMap({ v, active, onQuote, mapRef }) {
  const version = useDB();
  const layer = useRef(null);
  const fitted = useRef(false);
  const [ready, setReady] = useState(false);
  const onQuoteRef = useRef(onQuote);
  onQuoteRef.current = onQuote;

  useEffect(() => {
    const m = mapRef.current;
    if (!ready || !m) return;
    layer.current.clearLayers();
    const all = db.quotes(), bounds = [];
    db.requests().forEach(req => {
      if (!req.lat || !req.lng) return;
      const awarded = all.some(q => q.requestId === req.id && q.status === 'accepted');
      const icon = L.divIcon({
        html: `<div style="background:${awarded ? '#9ca3af' : 'linear-gradient(135deg,#16a34a,#ca8a04)'};color:white;border-radius:50% 50% 50% 0;padding:6px 8px;font-size:12px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;">${awarded ? '✔ Awarded' : '☀️ Open'}</div>`,
        iconSize: [84, 34], className: '',
      });
      const n = all.filter(q => q.requestId === req.id).length;
      const mine = all.find(q => q.requestId === req.id && isMyQuote(q, v));
      const box = document.createElement('div');
      box.style.minWidth = '200px';
      box.innerHTML = `<b>📍 ${esc(req.address)}</b><br/>
        <div style="margin:6px 0;display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;">
          <span>💡 Bill: ${inr(req.monthlyBill)}/mo</span><span>💰 Budget: ${inr(req.budget)}</span>
          ${req.roofArea ? `<span>🏠 Roof: ${esc(req.roofArea)} sq ft</span>` : ''}<span>📑 Quotes: ${n}</span>
        </div>`;
      if (mine && !awarded) {
        box.insertAdjacentHTML('beforeend', `<div style="background:#fefce8;color:#854d0e;border:1px solid #fde68a;padding:6px 10px;border-radius:8px;font-weight:600;font-size:12px;text-align:center;margin-top:4px;">✓ You quoted ${inr(mine.price)}</div>`);
      } else if (!awarded) {
        const b = document.createElement('button');
        b.textContent = '📝 Submit Quote';
        b.style.cssText = 'background:linear-gradient(135deg,#16a34a,#059669);color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:bold;width:100%;margin-top:4px;';
        b.addEventListener('click', () => { m.closePopup(); onQuoteRef.current(req.id); });
        box.appendChild(b);
      }
      L.marker([req.lat, req.lng], { icon }).addTo(layer.current).bindPopup(box);
      bounds.push([req.lat, req.lng]);
    });
    if (bounds.length && !fitted.current) { try { m.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 }); fitted.current = true; } catch {} }
  }, [ready, version, mapRef, v.id]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
      <LeafletMap active={active} style={{ height: 300 }} onReady={m => { mapRef.current = m; layer.current = L.layerGroup().addTo(m); setReady(true); }} />
    </div>
  );
}

export default function Enquiries({ v, active, onQuote, show }) {
  const [filter, setFilter] = useState('all');
  const mapRef = useRef(null);
  const mapBox = useRef(null);
  const all = db.quotes(), requests = db.requests();
  const info = [...requests].reverse().map(req => {
    const quotes = all.filter(q => q.requestId === req.id);
    return { req, quotes, acc: quotes.find(q => q.status === 'accepted'), mine: quotes.find(q => isMyQuote(q, v)) };
  });
  const list = info.filter(i => filter === 'all' || (filter === 'new' && !i.acc && !i.mine) || (filter === 'quoted' && i.mine) || (filter === 'closed' && i.acc));

  function viewOnMap(lat, lng) {
    mapRef.current?.setView([lat, lng], 15);
    mapBox.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <section className="vsec space-y-5">
      <SectionHead title="Customer enquiries" sub="Solar requests posted by households. Send a quote to compete for the job.">
        <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">{info.filter(i => !i.acc).length} open</span>
      </SectionHead>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter enquiries">
        {[['all', 'All'], ['new', 'Not quoted yet'], ['quoted', 'Quoted by me'], ['closed', 'Awarded']].map(([k, l]) => <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{l}</Chip>)}
      </div>
      <div ref={mapBox}><VendorMap v={v} active={active} onQuote={onQuote} mapRef={mapRef} /></div>
      <div className="space-y-4">
        {!requests.length ? <EmptyState icon="📭" title="No household enquiries yet" text="New solar requests from households will appear here as soon as they are posted." />
          : !list.length ? <EmptyState icon="🔍" title="Nothing here" text="No enquiries match this filter." />
          : list.map(({ req, quotes, acc, mine }) => {
            const iWon = acc && mine && acc.id === mine.id;
            return (
              <div key={req.id} className={`vcard bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${acc && !iWon ? 'opacity-70' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700 text-sm" aria-hidden="true">{req.name[0] || '?'}</div>
                      <span className="font-bold text-gray-800">{iWon ? req.name : maskName(req.name)}</span>
                      <span className="text-xs text-gray-500">{timeAgo(req.createdAt)}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-semibold">{quotes.length} quote{quotes.length !== 1 ? 's' : ''}</span>
                      {iWon ? <span className="text-xs px-2.5 py-1 bg-green-600 text-white rounded-full font-semibold">🏆 You won this job</span>
                        : acc ? <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full font-semibold">Awarded to another vendor</span>
                        : mine ? <span className="text-xs px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full font-semibold">You quoted {inr(mine.price)}</span> : null}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">📍 {req.address}{iWon && <> · 📞 <a className="text-green-700 font-semibold" href={`tel:${req.phone}`}>{req.phone}</a></>}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-yellow-50 text-yellow-800 text-xs px-3 py-1.5 rounded-full font-semibold">💡 Bill: {inr(req.monthlyBill)}/mo</span>
                      <span className="bg-green-50 text-green-700 text-xs px-3 py-1.5 rounded-full font-semibold">💰 Budget: {inr(req.budget)}</span>
                      {req.roofArea ? <span className="bg-gray-50 text-gray-700 text-xs px-3 py-1.5 rounded-full font-semibold">🏠 {req.roofArea} sq ft roof</span> : null}
                      <span className="bg-green-50 text-green-700 text-xs px-3 py-1.5 rounded-full font-semibold">📐 ~{estimateKw(req.monthlyBill)} kW needed</span>
                    </div>
                  </div>
                  {req.photo && <img src={`data:image/jpeg;base64,${req.photo}`} alt="Rooftop" className="w-20 h-16 shrink-0 object-cover rounded-xl border-2 border-gray-200" />}
                </div>
                <div className="mt-4 flex gap-2">
                  {iWon ? <button onClick={() => show('installations')} className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm bg-green-600 hover:bg-green-700 transition">🛠️ Track installation</button>
                    : acc ? <div className="flex-1 py-2.5 rounded-xl text-center text-sm font-semibold bg-gray-50 text-gray-500">Closed</div>
                    : mine ? <div className="flex-1 py-2.5 rounded-xl text-center text-sm font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200">✓ Quote sent · awaiting decision</div>
                    : <button onClick={() => onQuote(req.id)} className="cta-primary flex-1 py-2.5 rounded-xl font-bold text-white text-sm">📝 Submit Quote</button>}
                  {req.lat && req.lng ? <button onClick={() => viewOnMap(req.lat, req.lng)} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition">🗺️ Map</button> : null}
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}
