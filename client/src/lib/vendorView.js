// What the vendor dashboard shows, worked out from data the server already sent.
// Nothing here calculates a rule: ranking, subsidy and payback stay on the server.

export const VENDOR_VIEWS = [
  ['overview', '📊', 'Dashboard'],
  ['enquiries', '📥', 'Enquiries'],
  ['installations', '🛠️', 'Installations'],
  ['products', '📦', 'Products'],
  ['reviews', '⭐', 'Reviews'],
  ['notifications', '🔔', 'Notifications'],
  ['profile', '🏢', 'Profile'],
];

/** Shown in the bottom bar on a phone. The rest go under "More". */
export const PRIMARY_VIEWS = ['overview', 'enquiries', 'installations'];

/** '#/enquiries' becomes 'enquiries'. Anything unknown is the dashboard. */
export function viewFromHash(hash) {
  const name = String(hash || '').replace(/^#\/?/, '').split(/[/?]/)[0];
  return VENDOR_VIEWS.some(([id]) => id === name) ? name : 'overview';
}

const plural = (n, one, many) => (n === 1 ? one : many);

/**
 * The things a vendor should do now, most important first.
 * `profileMissing` lists the profile details still empty. An empty result means all caught up.
 */
export function attentionItems({ notQuoted, active, profileMissing, unread }) {
  const items = [];
  if (notQuoted > 0) {
    items.push({ id: 'enquiries', icon: '📥', tone: 'green', view: 'enquiries', action: 'Send quotes',
      title: `${notQuoted} new ${plural(notQuoted, 'enquiry', 'enquiries')} waiting for your quote`,
      text: 'Households compare quotes side by side. Early, complete quotes are easier to compare.' });
  }
  if (active > 0) {
    items.push({ id: 'installations', icon: '🛠️', tone: 'amber', view: 'installations', action: 'Update jobs',
      title: `${active} ${plural(active, 'installation', 'installations')} in progress`,
      text: 'Move each job to its next stage so the household can follow along.' });
  }
  if (profileMissing.length > 0) {
    items.push({ id: 'profile', icon: '🏢', tone: 'blue', view: 'profile', action: 'Finish profile',
      title: `Finish your business profile (${profileMissing.length} ${plural(profileMissing.length, 'detail', 'details')} missing)`,
      text: `Still needed: ${profileMissing.join(', ')}.` });
  }
  if (unread > 0) {
    items.push({ id: 'notifications', icon: '🔔', tone: 'gray', view: 'notifications', action: 'Read',
      title: `${unread} unread ${plural(unread, 'notification', 'notifications')}`,
      text: 'New enquiries, decisions and reviews.' });
  }
  return items;
}

/** The win rate as a whole percent, or null when no customer has decided yet. */
export function winRate(won, decided) {
  return decided > 0 ? Math.round((won / decided) * 100) : null;
}
