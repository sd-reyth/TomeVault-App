# TomeVault

A frontend-only React 18 + TypeScript + Vite single-page app ("Fantasy TTRPG Companion"). UI strings are partly in Dutch. There is no backend, database, or external service — `firebase` is listed in `package.json` but is not imported or wired into the app.

## Cursor Cloud specific instructions

- This is a single service: the Vite dev server. Run it with `npm run dev` (serves on `http://localhost:3000`, see `vite.config.ts`). `npm install` is handled by the startup update script.
- `vite.config.ts` sets `server.open: true`; in a headless VM that just prints a warning and the server still serves on port 3000 — ignore it.
- Known repo gaps (pre-existing, not environment issues): `npm run build` fails because there is no committed `tsconfig.json` (`tsc -b` errors), and `npm run lint` fails because there is no committed ESLint flat config (`eslint.config.js`) required by ESLint 9. The app runs fine in dev mode regardless. Add these config files at the repo level if build/lint are needed.
- There are no automated tests in this repo.
