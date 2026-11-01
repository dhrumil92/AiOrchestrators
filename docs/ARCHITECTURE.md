# Architecture

## 1. Principles
1. **Code decides:** subsidy, cost, payback, ranking and missing items are deterministic.
2. **The LLM reads and explains:** photo review, voice text to fields, and plain-language explanation.
3. **Vendor text is untrusted:** it can never change a score, a rule or the recommendation.
4. **AI failure must not break the demo:** every AI call has a labelled fallback.

## 2. System overview
```
Browser: React + Vite + Leaflet + Recharts
        |  REST/JSON and file uploads
        v
Express API
  |-- routes -> services
  |-- rules/      subsidy, sizing, savings, ranking (pure functions)
  |-- security/   clean text, detect hidden instructions
  |-- ai/         single AI client: retries, rate limit, schema checks, fallback
  |-- storage/    local disk now, object storage later
        |                         |
        v                         v
   PostgreSQL              Gemini (photo)
                           Groq (Whisper, text)
```

## 3. Repository layout
```
client/src/      pages/  components/  charts/  api/  types/
server/src/      routes/ services/ rules/ ai/ security/ storage/ db/ seed/
server/uploads/  local photos, ignored by git
docs/            rules, architecture, scaling, tasks
```

## 4. Data model (PostgreSQL)
Use UUID primary keys and `created_at` on every table. Store money as whole rupees in integers.

### vendors
`id, name, phone, city, latitude, longitude, service_radius_km, is_sample`

### service_requests
`id, household_name, phone, latitude, longitude, address_text, state_code, tariff_code, monthly_units, budget_rupees, usable_area_sqm, preferred_language (en|hi|gu), status (open|closed), accepted_quote_id, is_sample`

Indexes: `status`, `(latitude, longitude)`.

### terrace_photos
`id, request_id, storage_key, content_type, size_bytes`

### photo_assessments
`id, request_id, photo_id, obstructions JSONB, summary, confidence (low|medium|high), source (live|saved), model_name`

### quotes
`id, request_id, vendor_id, system_kw, price_rupees, panel_brand, panel_watts, dcr_confirmed (nullable boolean), inverter_brand, inverter_kw, inverter_warranty_years, panel_warranty_years, install_days, notes_raw, notes_clean, status (submitted|accepted|not_selected), injection_flagged, injection_reason, is_sample`

Nullable fields are intentional, because missing items must remain visible. A unique constraint on `(request_id, vendor_id)` allows one quote per vendor. A partial unique index allows only one accepted quote per request.

### recommendations
`id, request_id, recommended_quote_id, scores JSONB, explanation, language, source (live|saved), input_hash`

The `input_hash` covers quote data and language. If unchanged, the stored explanation is reused to save LLM calls.

### ai_jobs (stretch)
`id, type, payload JSONB, status (queued|running|done|failed), attempts, run_after, error`

## 5. API contract
Base path: `/api`. JSON unless stated. Errors use `{ "error": { "code": "...", "message": "..." } }`.

| Method | Path | Purpose | Screen |
|---|---|---|---|
| GET | `/health` | Status of database and AI configuration | Internal |
| GET | `/vendors` | List vendors for role switcher | V1 |
| POST | `/voice/transcribe` | Multipart `audio`, `language`. Returns transcript and extracted fields | H1 |
| POST | `/requests` | Create request | H1 |
| GET | `/requests?status=open` | Requests for vendor map | V1 |
| GET | `/requests/:id` | Request, photo URL, assessment and status | H2, V2 |
| POST | `/requests/:id/photo` | Multipart `photo`. JPEG, PNG or WebP up to 5 MB | H1 |
| POST | `/requests/:id/assessment` | Run photo review | H2 |
| PATCH | `/requests/:id` | Update confirmed usable area or language | H2 |
| GET | `/requests/:id/estimate` | Code-calculated size, savings, chart data and rules used | H2 |
| GET | `/requests/:id/quotes` | Quotes for request | H3, V2 |
| POST | `/requests/:id/quotes` | Submit a quote | V2 |
| GET | `/requests/:id/comparison` | Per-quote numbers, checks, flags, scores, recommendation | H3 |
| POST | `/quotes/:id/accept` | Accept quote and close request | H3, H4 |
| GET | `/vendors/:id/quotes` | Vendor's quotes and statuses | V3 |
| GET | `/rules` | Rules, formulas, assumptions and source links | All |
| GET | `/jobs/:id` | Job status (stretch) | H2 |

### Key response: `GET /requests/:id/estimate`
```json
{
  "suggestedKw": 2.5,
  "schemeBand": "2 to 3 kW",
  "monthlyGenerationUnits": 300,
  "monthlyChart": [{ "month": "Jan", "usedUnits": 300, "generatedUnits": 300 }],
  "subsidyRupees": 69000,
  "yearlySavingRupees": 14520,
  "explanation": "...",
  "rulesUsed": ["cfa-standard", "sizing-band", "tariff-rgp"]
}
```

`monthlyChart` uses the app's flat yearly assumption and must not suggest seasonal accuracy.

### Key response: `GET /requests/:id/comparison`
```json
{
  "quotes": [{
    "quoteId": "uuid",
    "vendorName": "Sunrise Rooftop Co.",
    "priceRupees": 145000,
    "subsidyRupees": 69000,
    "amountYouPayRupees": 76000,
    "paybackYears": 5.2,
    "subsidyAtRisk": false,
    "missingItems": [],
    "securityFlag": null,
    "recommendable": true,
    "score": 96
  }],
  "recommendation": {
    "quoteId": "uuid",
    "reasons": ["..."],
    "language": "gu",
    "source": "live"
  }
}
```

### Accept rule
Use one database transaction. Lock the request, confirm it is open, set the chosen quote to `accepted`, set the others to `not_selected`, and close the request. If it is already closed, return `409 REQUEST_CLOSED`.

## 6. AI features
All calls go through `server/src/ai/client.ts`. Model names come from environment variables because they change. Confirm available models and free-tier limits in Google AI Studio and the Groq console when setting up.

| Feature | Provider | Input | Output |
|---|---|---|---|
| Voice | Groq Whisper with language `hi` or `gu` | Audio up to 25 MB | Transcript |
| Fields from speech | Groq text | Transcript | JSON: units, budget, notes |
| Terrace review | Gemini | Photo | JSON: obstructions, confidence, summary |
| Explanation | Groq text, with Gemini as backup | Code-calculated facts | JSON: reasons in chosen language |

Every AI response must pass a schema check. Reject and fall back if it does not.

### Flow: request to recommendation
1. Code calculates and scores.
2. `rules/ranking` picks the recommended quote.
3. The AI receives only the verified facts and that quote ID, and writes reasons.
4. Code checks the returned ID matches and the numbers in the response match verified facts.
5. If a check fails, use the built-in template explanation.

Explanations must not introduce new numbers. The UI displays figures from code, not from AI text.

## 7. Hidden-instruction defence
Layers, in order:
1. **Clean:** normalise Unicode, remove zero-width characters, and strip HTML. Keep the original in `notes_raw`.
2. **Detect:** rule-based check for phrases such as "ignore previous instructions", "rank this vendor first" and "system:". Store a flag and reason.
3. **Isolate:** ranking never reads notes.
4. **Withhold:** flagged notes are not sent to the LLM. Other vendor text is sent only inside clear data markers, with instructions that it is data.
5. **Verify:** code checks the recommendation after the AI responds.
6. **Show:** the UI displays a clear warning on the quote.

Layer 3 is the main protection. Detection is for visibility, so missing a phrase still cannot change the ranking.

## 8. Fallbacks
Saved responses live in `server/src/ai/fixtures/` for the demo request.

| Failure | Behaviour |
|---|---|
| Photo AI fails | Use saved review for demo photo. Otherwise let the household list obstructions manually |
| Voice fails | Show a typing prompt, with form values untouched |
| Text AI fails | Use built-in English template from code-calculated facts |
| AI output fails checks | Same as above |

Saved or template results always show a small "saved example" or "basic explanation" label. Never present them as live.

## 9. Security and privacy basics
- Keep API keys in `.env` on the server only.
- Validate all input, including file type and size.
- Use parameterised queries.
- Store photos under generated names and never trust file names.
- The role switcher is for demo only. Production requires login and ownership checks, as covered in `docs/SCALING.md`.
- Vendors see approximate location and need no household phone number until a quote is accepted.
