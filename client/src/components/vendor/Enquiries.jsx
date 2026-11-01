import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { db, useDB } from '../../lib/storage.js';
import { isMyQuote } from '../../lib/domain.js';
import { inr, timeAgo } from '../../lib/utils.js';
import { EmptyState } from '../ui/bits.jsx';
import LeafletMap from '../shared/LeafletMap.jsx';
import { Chip, SectionHead } from './common.jsx';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function VendorMap({ v, active, onQuote, mapRef, focus }) {
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
      const awarded = req.status === 'closed';
      const icon = L.divIcon({
        html: `<div style="background:${awarded ? '#9ca3af' : 'linear-gradient(135deg,#16a34a,#ca8a04)'};color:white;border-radius:50% 50% 50% 0;padding:6px 8px;font-size:12px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;">${awarded ? '✔ Awarded' : '☀️ Open'}</div>`,
        iconSize: [84, 34], className: '',
      });
      const mine = all.find(q => q.requestId === req.id && isMyQuote(q, v));
      const box = document.createElement('div');
      box.style.minWidth = '200px';
      box.innerHTML = `<b>📍 ${esc(req.addressText || 'Address not given')}</b><br/>
        <div style="margin:6px 0;display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;">
          <span>💡 ${req.monthlyUnits} units a month</span><span>💰 Budget: ${inr(req.budgetRupees)}</span>
          ${req.usableAreaSqm ? `<span>🏠 Terrace: ${req.usableAreaSqm} sq m</span>` : ''}
        </div>`;
      if (mine && !awarded) {
        box.insertAdjacentHTML('beforeend', `<div style="background:#fefce8;color:#854d0e;border:1px solid #fde68a;padding:6px 10px;border-radius:8px;font-weight:600;font-size:12px;text-align:center;margin-top:4px;">✓ You quoted ${inr(mine.priceRupees)}</div>`);
      } else if (!awarded) {
        const b = document.createElement('button');
        b.textContent = '📝 Submit Quote';
        b.style.cssText = 'background:linear-gradient(135deg,#16a34a,#059669);color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:bold;width:100%;margin-top:4px;';
        b.addEventListener('click', () => { m.closePopup(); onQuoteRef.current(req.id); });
        box.appendChild(b);
      }
      L.marker([req.latitude, req.longitude], { icon }).addTo(layer.current).bindPopup(box);
      bounds.push([req.latitude, req.longitude]);
    });
    if (bounds.length && !fitted.current) { try { m.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 }); fitted.current = true; } catch {} }
  }, [ready, version, mapRef, v.id]);

  useEffect(() => {
    if (ready && focus) mapRef.current?.setView([focus.lat, focus.lng], 15);
  }, [ready, focus, mapRef]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
      <LeafletMap active={active} style={{ height: 380 }} onReady={m => { mapRef.current = m; layer.current = L.layerGroup().addTo(m); setReady(true); }} />
    </div>
  );
}

export default function Enquiries({ v, active, onQuote, show }) {
  const [filter, setFilter] = useState('all');
  const [layout, setLayout] = useState('list');   // list | map
  const [sort, setSort] = useState('new');        // new | budget | units
  const [focus, setFocus] = useState(null);
  const mapRef = useRef(null);
  const mapBox = useRef(null);
  const all = db.quotes(), requests = db.requests();
  const info = [...requests].reverse().map(req => {
    const quotes = all.filter(q => q.requestId === req.id);
    // Vendors receive only their own quotes, so a closed request without a win has no accepted quote here.
    const acc = req.status === 'closed' ? (quotes.find(q => q.status === 'accepted') || { id: null }) : undefined;
    return { req, quotes, acc, mine: quotes.find(q => isMyQuote(q, v)) };
  });
  const matches = {
    all: () => true,
    new: i => !i.acc && !i.mine,
    quoted: i => i.mine,
    closed: i => i.acc,
  };
  const SORTS = {
    new: () => 0,   // the list is already newest first
    budget: (a, b) => b.req.budgetRupees - a.req.budgetRupees,
    units: (a, b) => b.req.monthlyUnits - a.req.monthlyUnits,
  };
  const list = info.filter(matches[filter]).sort(SORTS[sort]);

  function viewOnMap(lat, lng) {
    setLayout('map');
    setFocus({ lat, lng, nonce: Date.now() });
    setTimeout(() => mapBox.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }

  return (
    <section className="vsec space-y-5">
      <SectionHead title="Customer enquiries" sub="Solar requests posted by households. Send a quote to compete for the job.">
        <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">{info.filter(i => !i.acc).length} open</span>
      </SectionHead>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter enquiries">
          {[['all', 'All'], ['new', 'Not quoted yet'], ['quoted', 'Quoted by me'], ['closed', 'Awarded']].map(([k, l]) => <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{l} · {info.filter(matches[k]).length}</Chip>)}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">Sort
            <select value={sort} onChange={e => setSort(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
              <option value="new">Newest</option><option value="budget">Highest budget</option><option value="units">Most units</option>
            </select>
          </label>
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1" role="group" aria-label="Show as">
            {[['list', '☰ List'], ['map', '🗺️ Map']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setLayout(k)} aria-pressed={layout === k}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${layout === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      {layout === 'map' && <div ref={mapBox}><VendorMap v={v} active={active} onQuote={onQuote} mapRef={mapRef} focus={focus} /></div>}
      <div className="space-y-4">
        {!requests.length ? <EmptyState icon="📭" title="No household enquiries yet" text="New solar requests from households will appear here as soon as they are posted." />
          : !list.length ? <EmptyState icon="🔍" title="Nothing here" text="No enquiries match this filter." />
          : list.map(({ req, acc, mine }) => {
            const iWon = acc && mine && acc.id === mine.id;
            return (
              <div key={req.id} className={`vcard bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${acc && !iWon ? 'opacity-70' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700 text-sm" aria-hidden="true">{req.householdName[0] || '?'}</div>
                      <span className="font-bold text-gray-800">{req.householdName}</span>
                      <span className="text-xs text-gray-500">{timeAgo(req.createdAt)}</span>
                      {iWon ? <span className="text-xs px-2.5 py-1 bg-green-600 text-white rounded-full font-semibold">🏆 You won this job</span>
                        : acc ? <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full font-semibold">Awarded to another vendor</span>
                        : mine ? <span className="text-xs px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full font-semibold">You quoted {inr(mine.priceRupees)}</span> : null}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">📍 {req.addressText || 'Area not given'}{iWon && req.contactPhone && <> · 📞 <a className="text-green-700 font-semibold" href={`tel:${req.contactPhone}`}>{req.contactPhone}</a></>}{!iWon && <span className="text-gray-500"> · Full address and phone shared if your quote is accepted</span>}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-yellow-50 text-yellow-800 text-xs px-3 py-1.5 rounded-full font-semibold">💡 {req.monthlyUnits} units a month</span>
                      <span className="bg-green-50 text-green-700 text-xs px-3 py-1.5 rounded-full font-semibold">💰 Budget: {inr(req.budgetRupees)}</span>
                      {req.usableAreaSqm ? <span className="bg-gray-50 text-gray-700 text-xs px-3 py-1.5 rounded-full font-semibold">🏠 {req.usableAreaSqm} sq m terrace</span> : null}
                    </div>
                  </div>
                  {req.photoUrl && <img src={req.photoUrl} alt="Rooftop" className="w-20 h-16 shrink-0 object-cover rounded-xl border-2 border-gray-200" />}
                </div>
                <div className="mt-4 flex gap-2">
                  {iWon ? <button onClick={() => show('installations')} className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm bg-green-600 hover:bg-green-700 transition">🛠️ Track installation</button>
                    : acc ? <div className="flex-1 py-2.5 rounded-xl text-center text-sm font-semibold bg-gray-50 text-gray-500">Closed</div>
                    : mine ? <div className="flex-1 py-2.5 rounded-xl text-center text-sm font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200">✓ Quote sent · awaiting decision</div>
                    : <button onClick={() => onQuote(req.id)} className="cta-primary flex-1 py-2.5 rounded-xl font-bold text-white text-sm">📝 Submit Quote</button>}
                  <button onClick={() => viewOnMap(req.latitude, req.longitude)} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition">🗺️ Map</button>
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}
