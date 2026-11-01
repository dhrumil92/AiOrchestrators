# CLAUDE.md

Rooftop solar marketplace for the SELC Hackathon. Households post needs, vendors quote, and an AI assistant helps the household decide.

## Read first
- `PRD.md`: scope, demo story and acceptance checks
- `docs/RULES.md`: official rules, formulas and test values
- `docs/ARCHITECTURE.md`: data model and API contract
- `DESIGN.md`: screens and wording
- `docs/SCALING.md`: scaling plan
- `docs/TASKS.md`: timeline and ownership

If a task conflicts with these documents, stop and raise it. Change the contract first, then the code.

## Stack
- `client/`: React, Vite, TypeScript, Leaflet, Recharts
- `server/`: Node, Express, TypeScript
- Database: PostgreSQL
- AI: Gemini for photos, Groq for speech and text, free tiers only

## Commands
Run these from `server/`:
- `npm run dev`: start the API on port 4000
- `npm test`: run server tests
- `npm run typecheck`: check types
- `npm run db:setup`: apply migrations and seed
- `npm run db:seed`: replace all marketplace data with the demo data. This wipes data entered by hand

Shared API types live in `shared/api.ts`.

## Non-negotiable rules
1. **The LLM never produces numbers.** Subsidy, cost, payback, savings, scores and ranking come from `server/src/rules/`.
2. **No rule value without a source.** Rule values belong in `server/src/rules/config.ts` and must match `docs/RULES.md`. Never invent a rule or use one from memory.
3. **Vendor text is untrusted.** Ranking must never read notes. Never put flagged notes in an AI prompt.
4. **All AI calls use `server/src/ai/client.ts`.** It validates output and applies fallback.
5. **Label fallback results.** Saved AI output must never look live.
6. **Protect the demo path.** Finish request -> quote -> accept before stretch work.
7. **Keep secrets out of git.** Use `.env` and maintain `.env.example`.
8. **Use plain household wording.** Follow the wording table in `DESIGN.md`.

## Ownership
| Role | Owns |
|---|---|
| Architect | `docs/`, shared types, database migrations, `server/src/rules/`, seed data, slides |
| Frontend | `client/` |
| Backend | `server/src/routes/`, `services/`, `db/`, `storage/` |
| AI features | `server/src/ai/`, `server/src/security/`, AI fixtures |

Avoid editing files owned by another role without telling them. API or schema changes need the Architect's agreement.

## Working style
- Build one vertical slice at a time.
- Add tests for rules, ranking, hidden-instruction handling and acceptance.
- `docs/RULES.md` test values are the expected results.
- Run the relevant checks before saying a task is done.
- Keep commits small. Commit or push only when asked.

## Skills and tools
**Already available**
- `dataviz`: household charts
- `run`: launch the app and confirm a change
- `code-review`: review changes before merging
- `security-review`: review before the demo

**Recommended, install manually**
- Playwright MCP, for browser checks of the demo flow:
  `claude mcp add playwright npx @playwright/mcp@latest`
- Context7, for current library docs:
  `npx ctx7 setup --claude`
- Frontend Design, for interface quality. Confirm the exact name in `/plugin` first:
  `/plugin install frontend-design@claude-plugins-official`

**Optional:** Superpowers, only if the team already knows it:
`/plugin install superpowers@claude-plugins-official`
