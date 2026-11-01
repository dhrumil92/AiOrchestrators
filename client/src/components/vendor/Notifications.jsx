import { buildNotifications } from '../../lib/domain.js';
import { NotifItem, SectionHead } from './common.jsx';

/** seenAt: the "last seen" time captured when this section was opened, so new items stay highlighted on this visit. */
export default function Notifications({ v, seenAt, markAll, show }) {
  const seen = new Date(seenAt || 0);
  const list = buildNotifications(v);
  return (
    <section className="vsec space-y-5">
      <SectionHead title="Notifications" sub="New enquiries, accepted quotes and reviews.">
        <button onClick={markAll} className="text-sm font-semibold text-green-700 hover:text-green-800">Mark all as read</button>
      </SectionHead>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
        {list.length ? list.map(n => <NotifItem key={n.id} n={n} unread={new Date(n.at) > seen} onGo={show} />)
          : <div className="p-10 text-center text-gray-500 text-sm">🔕 No notifications yet.</div>}
      </div>
    </section>
  );
}
