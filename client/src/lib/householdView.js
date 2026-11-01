// What the household dashboard shows, worked out from requests and quotes the server already sent.
// Nothing here calculates a rule: subsidy, savings and ranking stay on the server.

export const VIEWS = [
  ['home', 'Home', '🏠'],
  ['new', 'New request', '➕'],
  ['requests', 'My requests', '📬'],
  ['learn', 'Learn', '📘'],
];

/** The five steps of a household's journey, in order. */
export const JOURNEY = ['Post request', 'Get quotes', 'Compare', 'Accept a quote', 'Install'];

/** '#/requests' becomes 'requests'. Anything unknown is the home view. */
export function viewFromHash(hash) {
  const name = String(hash || '').replace(/^#\/?/, '').split(/[/?]/)[0];
  return VIEWS.some(([id]) => id === name) ? name : 'home';
}

export function greeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Where one request stands. `step` is the journey step it is on (0 to 4, or 5 when finished).
 * `quotes` are the quotes for this request only.
 */
export function requestStatus(req, quotes, lastStage) {
  const accepted = quotes.find(q => q.status === 'accepted');
  if (accepted) {
    return (accepted.installStage || 0) >= lastStage
      ? { key: 'completed', label: 'Installed', tone: 'green', step: 5 }
      : { key: 'installing', label: 'Installation in progress', tone: 'green', step: 4 };
  }
  if (req.status === 'closed') return { key: 'closed', label: 'Closed', tone: 'gray', step: 3 };
  if (quotes.length) {
    return { key: 'quotes', label: `${quotes.length} quote${quotes.length > 1 ? 's' : ''} to compare`, tone: 'amber', step: 2 };
  }
  return { key: 'waiting', label: 'Waiting for quotes', tone: 'blue', step: 1 };
}

// Which request needs attention first: new quotes, then a live installation, then waiting.
const URGENCY = { quotes: 0, installing: 1, waiting: 2, completed: 3, closed: 4 };

/** The one thing the household should do next, with the request it is about. */
export function nextStep(requests, quotes, lastStage) {
  if (!requests.length) {
    return { step: 0, title: 'Post your first request', text: 'Tell us your monthly units and budget. Installers near you will send quotes.', cta: { label: 'Post a request', view: 'new' } };
  }
  const rows = requests
    .map(req => ({ req, status: requestStatus(req, quotes.filter(q => q.requestId === req.id), lastStage) }))
    .sort((a, b) => URGENCY[a.status.key] - URGENCY[b.status.key] || String(b.req.createdAt).localeCompare(String(a.req.createdAt)));
  const { req, status } = rows[0];
  const cta = { label: 'Open request', view: 'requests', requestId: req.id };
  switch (status.key) {
    case 'quotes':
      return { step: 2, requestId: req.id, title: 'Compare your quotes', text: `${status.label}. We show them side by side with the subsidy and payback worked out.`, cta: { ...cta, label: 'Compare quotes' } };
    case 'installing':
      return { step: 4, requestId: req.id, title: 'Your installation is under way', text: 'Follow each stage, from the site survey to net metering.', cta: { ...cta, label: 'See progress' } };
    case 'waiting':
      return { step: 1, requestId: req.id, title: 'Waiting for vendor quotes', text: 'Vendors near you can see your request. Add a terrace photo and your terrace area to help them quote well.', cta: { ...cta, label: 'Open request' } };
    default:
      return { step: 5, requestId: req.id, title: status.key === 'completed' ? 'Your solar system is installed' : 'Your request is closed', text: status.key === 'completed' ? 'Remember to submit your bank details on the National Portal to claim the subsidy, and leave a review.' : 'You can post a new request any time.', cta: status.key === 'completed' ? cta : { label: 'Post a new request', view: 'new' } };
  }
}

/** Counts for the dashboard tiles. */
export function summarize(requests, quotes, lastStage) {
  const rows = requests.map(req => requestStatus(req, quotes.filter(q => q.requestId === req.id), lastStage));
  return {
    requests: requests.length,
    quotes: quotes.length,
    toCompare: rows.filter(s => s.key === 'quotes').length,
    installing: rows.filter(s => s.key === 'installing').length,
    completed: rows.filter(s => s.key === 'completed').length,
  };
}
