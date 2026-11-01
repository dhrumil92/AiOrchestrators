# Task: pull the password reset update and set up the database for it

You are working in my clone of the `AiOrchestrators` repo (github.com/dhrumil92/AiOrchestrators). The PostgreSQL database is on this computer. My teammate pushed a commit that adds password reset and change password. They had no database, so the migration and the server tests have not run yet. Please do the steps below, then tell me the results.

## What the update adds
- **Forgot password:** a "Forgot password?" link on the Log in tab. It emails a one-time link that works for 1 hour.
- **Reset page:** opening the link (`/?reset=<token>`) shows a "Choose a new password" form. Saving it logs the user in and logs them out on every other device.
- **Change password:** Settings (the gear icon) has a "Change password" form for logged-in users. It logs out the user's other devices.
- **API:** new routes `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` and `POST /api/auth/change-password`. The types are in `shared/api.ts`.
- **Database:** a new table, `password_reset_tokens`, from migration `server/src/db/migrations/003_password_reset.sql`. It only adds a table and does not change existing data.
- **Email:** `server/src/services/email.ts` sends through Resend when `RESEND_API_KEY` is set. Otherwise it prints the reset link in the server console.

## Steps
1. Go to the repo root and run `git status`. If there are uncommitted changes, stop and ask me what to do with them.
2. Pull the update with `git checkout main` and then `git pull origin main`. Confirm that `server/src/db/migrations/003_password_reset.sql` and `server/src/services/email.ts` now exist. If the pull has conflicts, stop and show them to me.
3. Optionally add these lines to `server/.env`. The app works without them, and the reset link is then printed in the server console:
   ```
   APP_URL=http://localhost:5173
   RESEND_API_KEY=your_key
   EMAIL_FROM=RoofSolar <onboarding@resend.dev>
   ```
4. Apply the database migration:
   ```
   cd server
   npm install
   npm run db:migrate
   ```
   It should print `Applied 003_password_reset.sql`.
   Do **not** run `npm run db:seed` or `npm run db:setup` unless I ask. Seeding wipes all accounts and data.
5. Run the checks. All of them must pass. If a test fails, show me the failing output, and fix it only if the cause is clear.
   - From `server/`: `npm run typecheck` and `npm test`.
   - From `client/`: `npm install`, `npm test` and `npm run build`.
6. Check it by hand:
   - Start the server with `cd server && npm run dev` and the client with `cd client && npm run dev`. Open http://localhost:5173.
   - Pick Household, open the Log in tab and click **Forgot password?**. Enter `meena@example.com` and send.
   - Copy the reset link from the server console, open it, set a new password and confirm that you are logged in.
   - Open Settings and use **Change password**. Then log out and log in with the new password.
   - Finally, use Change password to set Meena's password back to `Demo@1234`, so the demo login in CLAUDE.md still works.
7. Do not commit or push anything unless I ask. Tell me what passed, what failed and anything you had to change.
