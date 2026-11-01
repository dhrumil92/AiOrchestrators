import { db } from '../../lib/storage.js';
import { cityOf, quoteKw, timeAgo } from '../../lib/utils.js';
import { EmptyState, Stars } from '../ui/bits.jsx';
import { SectionHead } from './common.jsx';

export default function Reviews({ v }) {
  const revs = db.reviews().filter(r => r.vendorId === v.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const avg = revs.length ? revs.reduce((a, r) => a + r.rating, 0) / revs.length : 0;
  const dist = [5, 4, 3, 2, 1].map(n => ({ n, c: revs.filter(r => r.rating === n).length }));
  const max = Math.max(1, ...dist.map(d => d.c));
  const reqs = db.requests(), quotes = db.quotes();
  return (
    <section className="vsec space-y-5">
      <SectionHead title="Reviews & ratings" sub="Households can rate you once an installation is marked completed." />
      <div className="grid md:grid-cols-[260px_1fr] gap-5 items-start">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-center">
            <div className="text-5xl font-extrabold text-gray-900 tabular-nums">{revs.length ? avg.toFixed(1) : '—'}</div>
            <div className="mt-1"><Stars value={avg} className="text-xl" /></div>
            <div className="text-sm text-gray-500 mt-1">{revs.length} review{revs.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="mt-5 space-y-2">
            {dist.map(d => (
              <div key={d.n} className="grid grid-cols-[28px_1fr_24px] items-center gap-2 text-xs" title={`${d.n} stars: ${d.c}`}>
                <span className="text-gray-600 font-semibold">{d.n}★</span>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-yellow-500 rounded-full" style={{ width: d.c / max * 100 + '%' }} /></div>
                <span className="text-right text-gray-700 tabular-nums">{d.c}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {!revs.length && <EmptyState icon="⭐" title="No reviews yet" text="After you mark an installation as completed, the household can rate your work here." />}
          {revs.map(r => {
            const q = quotes.find(x => x.id === r.quoteId), req = reqs.find(x => x.id === r.requestId);
            return (
              <div key={r.id} className="vcard bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-800 font-bold flex items-center justify-center" aria-hidden="true">{(r.reviewerName || '?')[0]}</div>
                    <div>
                      <div className="font-semibold text-gray-900">{r.reviewerName}</div>
                      <div className="text-xs text-gray-500">{timeAgo(r.createdAt)}{req ? ' · ' + cityOf(req.address) : ''}{q ? ' · ' + quoteKw(q).toFixed(1) + ' kW' : ''}</div>
                    </div>
                  </div>
                  <Stars value={r.rating} />
                </div>
                {r.comment && <p className="mt-3 text-sm text-gray-700 leading-relaxed">“{r.comment}”</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
