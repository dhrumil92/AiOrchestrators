# PM Surya Ghar – Solar Marketplace (React)

React + Vite frontend for the rooftop solar marketplace.

**Status:** working prototype. Data is stored in the browser's localStorage and AI calls go
straight to Gemini from the browser. It is not yet connected to the Express API in `server/`.

## Run it

Needs Node.js 18+. From `client/`:

```bash
npm install        # first time only
npm run dev        # dev server with hot reload → http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build → http://localhost:4173
```

## Structure

```
src/
  main.jsx, App.jsx, AppContext.jsx   app shell, tabs, shared context
  index.css                           Tailwind + the original custom styles
  lib/
    storage.js    localStorage "database" + useDB() hook (re-renders on change)
    domain.js     business rules: identity, quotes, stages, stats, notifications
    utils.js      formatting, validation, subsidy, PIN hashing
    gemini.js     Gemini API call + all AI prompts
    useGemini.js  hook: AI call that asks for the API key if missing
    speech.js     browser voice input
  components/
    Header.jsx            top bar, ⚙️ settings (API key, sample data, logout)
    login/                landing page, role showcases, sign-in with PIN
    household/            welcome dashboard, request form + map, quotes
    vendor/               dashboard: overview, enquiries + map, installations,
                          products, reviews, notifications, profile, quote modal
    ai/AiAdvisor.jsx      quick actions, subsidy calculator, SuryaBot chat
    shared/LeafletMap.jsx Leaflet map wrapper
    ui/                   toast, confirm dialog, small shared pieces
```

## Notes

- Data lives in the browser's localStorage, per site address. Use ⚙️ Settings → Load sample data for demo content.
- AI features need a Google Gemini API key, entered in ⚙️ Settings.
- The 4-digit PIN only prevents casual mix-ups between accounts on a shared device;
  it is not real security (there is no server).
