# Déploiement (Vercel + Render / Railway) — Souk.tn

Ce document décrit les étapes pour déployer le frontend sur Vercel et le backend + MySQL sur Render ou Railway (Option A + B combinées).

## Pré-requis
- Repo GitHub contenant le projet (push du code).
- Comptes : Vercel, Render ou Railway.
- Ne commitez jamais de fichiers `.env` contenant des secrets.

## Fichiers importants
- `backend/.env.example` — variables d'environnement d'exemple (à remplir sur le provider).
- `.gitignore` — exclut `*.env` et `backend/.env` (vérifié).

## Variables d'environnement à configurer sur le provider
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_CHARSET`
- `JWT_SECRET`
- `EMAIL_USER`, `EMAIL_PASS`
- `FRONTEND_URL`, `BACKEND_URL`
- `GEMINI_API_KEY`

## Frontend — Vercel
1. Sur Vercel: New Project → connectez votre dépôt GitHub.
2. Sélectionnez le répertoire `frontend/`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Ajoutez les variables d'environnement nécessaires (par ex. `VITE_API_URL` ou `REACT_APP_API_URL` si utilisé).
6. Déployez.

## Backend + MySQL — Render ou Railway
1. Créez une Managed MySQL instance (notez host, user, password, db name).
2. Sur Render/Railway: New Service → Web Service → pointez vers le répertoire `backend/`.
   - Build: `npm install`
   - Start Command: `npm start`
3. Ajoutez les variables d'environnement listées ci‑dessus dans les settings du service, et remplacez `DB_*` par les valeurs fournies par la base.
4. Configurez les secrets (`GEMINI_API_KEY`, `EMAIL_PASS`, `JWT_SECRET`) via l'interface Secrets/Environment.

## Uploads et fichiers statiques
Le répertoire `uploads/` est local et non persistant sur la plupart des hébergeurs. Options recommandées:
- Utiliser un bucket S3 (AWS) ou DigitalOcean Spaces et mettre en place l'upload vers S3 dans le backend.
- Ou utiliser le stockage persistant fourni par Render (Disk) si disponible.

## Emails
Utilisez un provider d'emails (SendGrid, Mailgun) pour la production plutôt que un compte Gmail simple. Stockez les clés dans les Env Vars.

## Tests locaux rapides
- Frontend build:
```
cd frontend
npm install
npm run build
```
- Backend run:
```
cd backend
npm install
npm start
```
- Vérifier : `GET /api/health`

## Sécurité
- Révoquez ou regénérez toute clé exposée accidentellement (ex: `GEMINI_API_KEY`).
- Restreindre CORS en production (au lieu de `origin: true`).

## Notes finales
Si vous voulez, je peux:
- ajouter un `Dockerfile` et `docker-compose.yml` pour un déploiement sur Droplet (Option B).
- ajouter un script d'upload S3 et modifier `server.js` pour supporter S3.
