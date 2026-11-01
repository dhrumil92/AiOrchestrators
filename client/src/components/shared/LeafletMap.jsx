import { useEffect, useRef } from 'react';
import L from 'leaflet';

export const pinIcon = (emoji = '📍', size = 28) => L.divIcon({
  html: `<div style="font-size:${size}px;margin-top:-${size / 2}px;margin-left:-${size / 2}px;">${emoji}</div>`,
  iconSize: [size, size], className: '',
});

/**
 * Plain Leaflet map managed by React.
 * onReady(map) runs once after creation; `active` triggers invalidateSize when a hidden tab becomes visible.
 */
export default function LeafletMap({ center = [22.5, 82.5], zoom = 5, onReady, active = true, className = '', style }) {
  const el = useRef(null);
  const map = useRef(null);
  useEffect(() => {
    const m = L.map(el.current).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(m);
    map.current = m;
    onReady?.(m);
    return () => { m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (active && map.current) { const t = setTimeout(() => map.current?.invalidateSize(), 120); return () => clearTimeout(t); }
  }, [active]);
  return <div ref={el} className={className} style={style} />;
}
