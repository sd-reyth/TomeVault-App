# TomeVault App - Overzicht

## Snelle Startkaart (10 regels)

1. UI/gedrag aanpassen: src/App.jsx
2. Firebase setup: src/firebase.js
3. App entry: index.html -> src/main.jsx
4. Build: npm run build
5. Build output: dist/
6. Hosting config: firebase.json (public = dist)
7. Statische assets: placeholders/, references/, audio/
8. Legacy bestanden: _archive/legacy-pre-react/
9. Deploy: firebase deploy
10. Voor wijzigingen altijd eerst build-check doen

Dit project gebruikt een moderne structuur:
- src bevat de app-logica en UI
- root bevat projectconfiguratie, build-entry en deploy-instellingen

Als je denkt "waar werken we nou in?":
- Voor features en gedrag werken we bijna altijd in src/App.jsx
- Voor Firebase of build/deploy werken we in root-config bestanden

## 1) Hoe de app start

1. index.html bevat alleen het root-element en laadt src/main.jsx.
2. src/main.jsx mount de React app.
3. src/App.jsx bevat vrijwel alle schermen, state en handlers.

Kort: index.html -> src/main.jsx -> src/App.jsx

## 2) Firebase koppeling

src/firebase.js initialiseerd:
- Auth
- Firestore
- Storage

App.jsx gebruikt deze services voor login, sessies, chat, handouts, inventory en profielen.

## 3) Dataflow in de app (simpel model)

1. Login:
- Google, gast of e-mail login via Firebase Auth.
- onAuthStateChanged zet uid/rol/status in state.

2. Sessie starten of joinen:
- GM maakt sessie (document in sessions).
- Spelers joinen via code/tag.

3. Realtime lezen:
- Handouts, players, chat, inventory, wallets en notes komen via Firestore listeners.

4. Schrijven (server-first):
- Updates gaan eerst naar Firestore.
- UI houdt meestal een lokale fallback/optimistic update voor snelle feedback.

5. Afbeeldingen:
- Placeholder afbeeldingen worden statisch meegekopieerd tijdens build.
- Eigen uploads gaan naar Firebase Storage en de download URL wordt opgeslagen in Firestore.

## 4) Placeholder en avatars

- Handout suggesties worden semantisch gekozen op basis van titel/inhoud/type.
- Als een speler/NPC geen avatar heeft, toont de app deterministisch een placeholder.
- Blob previews zijn tijdelijk; permanente opslag gebeurt via Storage upload bij opslaan.

## 5) Build en deploy

Build:
- npm run build
- output gaat naar dist

Hosting:
- firebase.json staat op public: dist
- rewrite stuurt routes naar /index.html

Belangrijk:
- root-bestanden zoals index.html, package.json, firebase.json en vite.config.js horen juist in root te blijven.
- deze zijn nodig voor tooling en deploy, ook al staat veel app-code in src.

## 6) Wat is actief vs archief

Actief (belangrijk):
- src/
- index.html
- package.json
- vite.config.js
- firebase.json
- firestore.rules
- firestore.indexes.json
- storage.rules
- placeholders/
- references/
- audio/

Tijdelijk/gegenereerd:
- dist/
- node_modules/
- .firebase/

Legacy (mag later handmatig weg):
- _archive/legacy-pre-react/

## 7) Snelle mentale checklist

Als je iets wilt aanpassen:
- UI/gedrag? -> src/App.jsx
- Firebase init? -> src/firebase.js
- Deploy gedrag? -> firebase.json
- Build gedrag/static copy? -> vite.config.js
- Styling basis? -> src/index.css

## 8) Praktische workflow

1. Feature aanpassen in src/App.jsx
2. npm run build draaien
3. Als build ok is: deploy
4. Pas als alles stabiel is: handmatig legacy archief verwijderen
