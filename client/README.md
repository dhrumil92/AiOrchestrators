# Client

React and Vite frontend for the rooftop solar marketplace. It talks to the Express API in `server/`.

## Run it

Start the server first, then from `client/`:

```bash
npm install        # first time only
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run build      # production build into dist/
```

Vite forwards `/api` calls to the server on port 4000. Use Chrome or Edge for voice input.

## Where data lives

- **Server, in PostgreSQL:** vendors, requests, photos, quotes, accepted quotes.
- **Server, calculated:** size, subsidy, savings, payback, ranking. The client never calculates these.
- **Server, AI:** terrace review, voice, explanations. API keys stay on the server.
- **Browser only:** demo session, vendor catalogue, reviews, install stages, vendor profile. These are prototype extras with no server tables.

## Structure

```
src/
  main.jsx, App.jsx, AppContext.jsx   app shell, tabs, 5-second data refresh
  index.css                           Tailwind and custom styles
  lib/
    api.js        every server call
    storage.js    cached server data and browser-only extras, useDB() hook
    domain.js     identity, vendor stats, notifications, accept quote
    chartData.js  arranges server figures for charts
    recorder.js   microphone recording
    utils.js      formatting
  components/
    Header.jsx            role switch, vendor picker, status panel
    login/                landing page, demo sign-in
    household/            request form, solar plan, quote comparison, charts
    vendor/               dashboard, enquiries map, quote form, installations and extras
    ai/AiAdvisor.jsx      quick actions and calculator, answered by the server
    shared/               Leaflet map, "How was this calculated?" panel
    ui/                   toast, confirm dialog, small shared pieces
```
