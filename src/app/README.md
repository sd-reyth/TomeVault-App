# src/app — Application orchestration

Thin App.jsx + custom hooks. No UI markup in hooks.

Target (after Wave 2a + Wave 3):
- `App.jsx` — providers + screen routing + modal composition (<250 lines)
- `useAuth.js` — Firebase auth flows
- `useSession.js` — Firestore session + party subscriptions
- `useCombat.js` — initiative, turns, pause, conditions (Wave 2a)
- `providers.jsx` — ThemeProvider + SessionProvider
