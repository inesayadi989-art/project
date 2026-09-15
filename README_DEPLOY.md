# Deployment automation

This repo includes GitHub Actions workflows to automate frontend and backend deployment.

- Frontend: `.github/workflows/deploy-frontend.yml` — builds `frontend/` and deploys to Vercel using `VERCEL_TOKEN` secret.
- Backend: `.github/workflows/deploy-backend.yml` — runs CI for `backend/`. To enable Railway deployment, add `RAILWAY_TOKEN` secret and update the workflow step.

Required GitHub repository secrets:

- `VERCEL_TOKEN` — personal token from Vercel (Account → Tokens)
- `RAILWAY_TOKEN` — (optional) Railway API key

How to trigger:

1. Push to `main` branch (or open a PR from `ci/deploy-workflows`).
2. Actions will run: frontend builds and is deployed to Vercel; backend CI runs.

Create a PR for review:

- Open: https://github.com/inesayadi989-art/project and create a PR from `ci/deploy-workflows` → `main`.

Notes:

- Ensure Vercel project is linked to the repo or that the `vercel` CLI has permissions for deployments using the token.
- Keep secrets rotated after use.
