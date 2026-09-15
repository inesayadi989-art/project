# Security & Secrets Rotation

Follow these immediate steps to secure secrets and finish deployment safely:

1. Rotate exposed keys now
   - Regenerate `GEMINI_API_KEY` in the provider console and revoke the old key.
   - Change the email account password or create an app-specific password and revoke the old one.

2. Do NOT commit secrets to the repo
   - Ensure `backend/.env` and `frontend/.env` remain ignored. `.gitignore` already lists them.

3. Add secrets to providers and GitHub
   - GitHub repo → Settings → Secrets and variables → Actions:
     - `VERCEL_TOKEN` (required for frontend deploy)
     - `RAILWAY_TOKEN` (optional for backend automation)
   - Vercel project → Settings → Environment Variables:
     - `VITE_API_URL` = `https://<your-backend-url>`
   - Railway (or other) → Add `GEMINI_API_KEY`, `EMAIL_PASS`, DB credentials.

4. Trigger and verify deployment
   - Merge the `ci/deploy-workflows` branch (already merged to `main` if you followed earlier steps).
   - Watch GitHub Actions and Vercel dashboard for build/deploy logs.
   - Smoke tests:
     - `curl -I https://<frontend-url>` should return 200/301.
     - `curl https://<backend-url>/api/health` should return healthy JSON.

5. If secrets were ever pushed in commits
   - Use `git log --all -S 'AQ.Ab8RN6K'` to locate commits containing the leaked token.
   - Remove history with a tool such as `git filter-repo` or the BFG Repo-Cleaner, then force-push.

If you want, I can run the non-destructive local commands (add/commit/push the SECURITY.md) now and then monitor Actions. Say "pousse" to let me push, or "surveille" to only watch Actions once you've added secrets.
