# Tasks and timeline

`T` is when coding starts. This plan assumes 3 hours 45 minutes remain. If less remains, shorten Phase 4 first.

## Before T
- [ ] Each person reads the demo story in `PRD.md` and their own section here.
- [ ] Get Gemini and Groq free API keys.
- [ ] Install PostgreSQL or start it in Docker on the demo laptop.
- [ ] Record a short real sample in Hindi and in Gujarati.
- [ ] Find a terrace photo with a water tank and staircase room that you are allowed to use.

## Phase 1: Foundation (T to T+0:45)
| Role | Work |
|---|---|
| **Architect** | Shared types, migrations, rules config. Implement subsidy, sizing, savings and ranking with tests. Seed data |
| **Frontend** | Vite app, routes, layout, API client with mock data, role switch |
| **Backend** | Express app, database connection, requests and quotes endpoints, photo upload |
| **AI features** | Test Gemini photo review and Groq Whisper in Hindi and Gujarati. Build AI client and schemas |

**Checkpoint 1 at T+0:45**
- [ ] Client calls server.
- [ ] Rule tests match `docs/RULES.md`.
- [ ] Seed runs.
- [ ] Voice and photo tests pass with real AI, or a fallback decision is made.

If this is on time, the stretch job queue may start in Phase 3.

## Phase 2: Core flow (T+0:45 to T+1:45)
| Role | Work |
|---|---|
| **Architect** | Estimate and comparison logic. Help integration |
| **Frontend** | H1 with map and upload, V1 map, V2 quote form, H3 basic list, accept action, V3 |
| **Backend** | Quote validation, accept transaction, vendor quote status, estimate and comparison endpoints |
| **AI features** | Voice endpoint, field extraction, photo assessment endpoint |

**Checkpoint 2 at T+1:45**
- [ ] Full request -> quote -> accept flow works end to end with real database data.

This is the most important checkpoint. Everyone stops other work until it passes.

## Phase 3: AI and household experience (T+1:45 to T+2:45)
| Role | Work |
|---|---|
| **Architect** | "How was this calculated?" data, rules endpoint, draft slides |
| **Frontend** | H2 summary and charts, H3 recommendation, bars, cards and flags, calculation panel, H4 |
| **Backend** | Hardening, error format, optional job queue |
| **AI features** | Hidden-instruction defence, recommendation explanation in 3 languages, output checks, fallback fixtures |

**Checkpoint 3 at T+2:45**
- [ ] All PRD must-haves work.
- [ ] Quote C is flagged and Quote A wins.
- [ ] Demo works with AI keys removed.

## Phase 4: Polish and presentation (T+2:45 to T+3:45)
| Role | Work |
|---|---|
| **Architect** | Finish slides, verify `docs/SCALING.md` cost figures |
| **Frontend** | Mobile layout, loading and error states, visual polish |
| **Backend** | Fresh-database test, README commands, bug fixes |
| **AI features** | Test real voice clips again, tune wording |

**Code freeze at T+3:15.** After that, fix only demo-breaking bugs.

**Rehearse by T+3:30** using a freshly seeded database. Time it. Run it again with Wi-Fi off to confirm fallback behaviour, except the map tiles, which need internet.

Prepare a backup screen recording of the full demo.

## Cut order if behind
Cut from the top first.
1. Benchmark comparison.
2. AI job queue. Explain it in slides instead.
3. Payback chart. Keep payback as a number.
4. H4 timeline. Keep a success message.
5. Live AI explanations in Hindi and Gujarati. Use template English, but keep voice input if it works.

**Never cut:** request -> quote -> accept, code-based numbers, rule sources, missing-item flags, recommendation with reasons, terrace obstruction review, or voice input.

## Presentation outline
1. Problem, in one sentence.
2. Live demo of Meena's journey.
3. Architecture: code decides, LLM explains.
4. Trust: rule sources and hidden-instruction defence.
5. Scale: database, photos, job queue, rate limits.
6. Hosting and cost: about $415 a month for 10,000 requests, based on stated assumptions.
7. What comes next.

## Rule verification still open
- [x] Check the July 2025 MNRE amendments. Secondary coverage shows no change to the rates used here.
- [ ] Confirm current free-tier limits in the Groq console and Google AI Studio.
- [ ] Confirm the current subsidy on the national portal if it is accessible.
