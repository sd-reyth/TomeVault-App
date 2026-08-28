# Security — public repository

TomeVault is intentionally open source on GitHub so tools like Claude Code can access the codebase. Security therefore depends on **what stays out of git** and on **Firebase server-side rules**, not on hiding client config.

## What must never be committed

| Item | Why |
|------|-----|
| `.env` | Firebase web config and local overrides |
| `.private/` | Operator notes (admin UIDs, replication, incident write-ups) |
| `*-service-account*.json` / `firebase-adminsdk*.json` | Full admin access to your Firebase project |
| Personal access tokens, Stripe secret keys, webhook secrets | Immediate account compromise |

If any of the above was ever committed, rotate/revoke it and treat the old value as leaked.

## What is safe (and expected) in a public repo

- **Firestore rules** (`firestore.rules`) and **Storage rules** (`storage.rules`) — these protect data server-side.
- **Firebase project ID** and **hosting URL** — already visible on the live site.
- **Client Firebase config via `.env.example`** — placeholders only; real values live in your local `.env`.

> **Note:** `VITE_*` values are embedded in the production JS bundle at build time. They are not secret in the way a server API key is. Real protection = Auth + Security Rules + API key domain restrictions + (recommended) Firebase App Check.

## Local setup after clone

```bash
cp .env.example .env
# Fill in values from Firebase Console → Project settings → Your apps
npm install
npm run dev
```

## Before every deploy

1. Build with a valid local `.env` (or CI secrets with the same variable names).
2. In Google Cloud Console, restrict the Firebase **Web API key** to your domains (`tomevaultapp.web.app`, `tomevaultapp.firebaseapp.com`, `localhost` for dev).
3. Review `firestore.rules` and `storage.rules` after schema changes.

## Private operator folder

Create `.private/` locally for notes that should not be public, for example:

- `REPLICATION_NOTES.md` — Firestore replication / admin glossary
- `ADMIN_SETUP.md` — how owner/admin documents are provisioned
- incident or support notes with user identifiers

This folder is gitignored.

## Reporting issues

If you find a security problem in the live app, contact the maintainer privately instead of opening a public issue with exploit details.
