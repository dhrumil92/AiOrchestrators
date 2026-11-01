# Design

## 1. Design goal
A household owner with no solar knowledge should understand the answer in 10 seconds:

**What should I buy, what will I pay, when do I get it back, and whom should I choose?**

Show the answer first, the picture second and the detail on request.

## 2. Principles
- Use everyday words.
- Show one main action per screen.
- Use charts only when they make a decision easier.
- Never rely on colour alone. Pair colour with icons and words.
- Label all estimates.
- Use Indian number formatting, such as ₹1,45,000.

| Avoid | Use |
|---|---|
| CFA | Government subsidy |
| Capex | Cost of the system |
| kWp | kW |
| Net cost | You pay |
| Payback period | Money back in about 5 years |
| DCR | Made-in-India panels that qualify for subsidy |

Introduce "kWh" once as "units (kWh), as shown on your bill".

## 3. Visual style
The built app uses a green and yellow theme with Tailwind, which replaced the teal listed below. Status colours, type sizes and touch targets still apply.

- **Mood:** warm, trustworthy and simple. Avoid a dark "AI dashboard" look.
- **Base:** warm off-white background, white cards, dark slate text.
- **Primary:** deep teal, for main actions.
- **Solar accent:** sun yellow, for generation.
- **Status:** green for good, amber for needs checking, red for serious issues.
- **Type:** Noto Sans plus Noto Sans Devanagari and Noto Sans Gujarati, so Hindi and Gujarati look consistent.
- **Size:** body text at least 16 px, key figures 28 px or more, touch targets at least 44 px.

Use `frontend-design` for screen quality and `dataviz` for charts where available.

## 4. Navigation
Visitors choose household or vendor on the landing page, then sign up or log in. The top bar shows the product name, account name and logout. The language picker sits on the request form and on each solar plan, because language is saved per request.

## 5. Household screens
### H1. Tell us about your home
Route: `/`. Single page with three clear steps.

1. **Speak or type:** a large microphone button with language choice and a live state: Listening, Understanding, Done. Filled fields remain editable.
2. **Find your home:** Leaflet map with search and a draggable pin.
3. **Add your terrace photo:** drag, browse or use camera, with an example of a good photo.

Main button: **See my solar plan**.

APIs: `POST /voice/transcribe`, `POST /requests`, `POST /requests/:id/photo`.

### H2. Your solar plan
Route: `/requests/:id`.

**Summary card:**
> A 2.5 kW system could cover about 300 units a month.
> Government subsidy: ₹69,000. Estimated yearly bill saving: ₹14,520.

**Terrace review:** photo beside a list of findings, such as water tank and staircase room. The review is listed, not drawn on the photo, because box accuracy is not guaranteed. Note: "AI estimate. A site visit is still needed." The household confirms usable terrace area.

**Usage vs generation chart:** two bars, units used and estimated solar units. The estimate is the same every month, so 12 bars would suggest seasonal detail the app does not have. Caption it as an average estimate.

**Rule source:** "How was this calculated?" on each figure.

Main button: **See quotes**.

APIs: `GET /requests/:id`, `POST /requests/:id/assessment`, `PATCH /requests/:id`, `GET /requests/:id/estimate`, `GET /rules`.

### H3. Compare your quotes
Route: `/requests/:id/quotes`.

**Top: recommendation card**
> We suggest Sunrise Rooftop Co.
> Lowest cost among complete quotes, a longer inverter warranty and the quickest install.

Reasons appear in the chosen language. Add a note that the choice comes from fixed scoring rules, which the AI only explains.

**Then: "You pay" stacked bars.** One bar per vendor: the part the household pays and the subsidy part. The subsidy part is hatched when at risk.

**Then: payback chart.** Years on the horizontal axis and rupees on the vertical. Each line shows the household position for one quote, and crossing ₹0 marks payback. Limit to 3 quotes, with the recommended one first.

**Then: comparison cards.** Side by side on desktop and stacked on mobile.

| Row | Example |
|---|---|
| Vendor | Sunrise Rooftop Co. |
| You pay | ₹76,000 |
| Quote price | ₹1,45,000 |
| Money back | About 5.2 years |
| Size | 2.5 kW |
| Panels | Brand, watts, subsidy eligibility |
| Inverter | Brand and warranty |
| Install time | 21 days |

**Check indicators**
- Green tick: "Complete"
- Amber triangle: "Ask about: inverter warranty"
- Amber triangle: "Subsidy at risk: made-in-India panels not confirmed"
- Red shield: "Warning: this quote contained hidden instructions. We ignored them."

The shield expands to show the removed text as plain text.

Main action on each card: **Accept this quote**, with a confirmation dialog.

APIs: `GET /requests/:id/quotes`, `GET /requests/:id/comparison`, `POST /quotes/:id/accept`, `GET /rules`.

### H4. Quote accepted
Route: `/requests/:id/accepted`. A timeline of next steps: vendor contact, site visit, application on the National Portal with consumer number, installation, then subsidy. Keep the summary visible and show the scheme's stated end date of 31 March 2027.

API: `GET /requests/:id`.

## 6. "How was this calculated?" view
A side panel on desktop and a bottom sheet on mobile:
1. The answer.
2. The sum in plain form, such as "₹30,000 x 2 kW + ₹18,000 x 0.5 kW = ₹69,000".
3. The rule in simple words.
4. Source link and section.
5. Assumptions, such as 4 units per kW per day.

## 7. Vendor screens
### V1. Open requests
Route: `/vendor`. Map with markers and a list beside it. Each item shows area, units, suggested kW, budget and photo status.

APIs: `GET /vendors`, `GET /requests?status=open`.

### V2. Request details and quote form
Route: `/vendor/requests/:id`. Shows the terrace photo, usage and suggested size. The form has sections for price, panels, inverter, warranty, timeline and notes.

Show a live completeness meter before submitting, so vendors see what may lower their position.

APIs: `GET /requests/:id`, `GET /requests/:id/quotes`, `POST /requests/:id/quotes`.

### V3. My quotes
Route: `/vendor/quotes`. Status shown as Submitted, Accepted or Not selected. Accepted is prominent, because it completes the demo.

API: `GET /vendors/:id/quotes`.

## 8. States
| State | Behaviour |
|---|---|
| Loading AI | "Checking your terrace..." with a skeleton, never a blank screen |
| No quotes | "Vendors are reviewing your request" |
| One quote | Show it, but state that comparison improves with more quotes |
| No recommendable quote | "No quote is complete yet", plus questions to ask |
| AI unavailable | Calculated figures still appear, with a "basic explanation" label |
| Request closed | Show the accepted vendor. Hide accept buttons |
| Microphone blocked | Explain and offer typing |
| Invalid photo | Say which types and sizes are accepted |

## 9. Accessibility and mobile
- Design for 360 px width first, with no horizontal page scroll.
- Charts have a text summary.
- Keyboard use works for forms and dialogs.
- Maintain WCAG AA contrast.
- Fixed UI labels stay in English for this build. AI explanations use the chosen language.
