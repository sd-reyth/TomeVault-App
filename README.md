# TomeVault App - Overzicht

## Snelle Startkaart (10 regels)

1. UI/gedrag aanpassen: src/App.jsx
2. Firebase setup: src/firebase.js
3. App entry: index.html -> src/main.jsx
4. Build: npm run build
5. Build output: dist/
6. Hosting config: firebase.json (public = dist)
7. Statische assets: placeholders/, references/, audio/
8. Runtime helpers: src/lib/runtimeContext.js
9. Deploy: npm run deploy:hosting
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

## 6) Wat is actief

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

Niet langer gebruiken als bronbestand:
- losse root-prototypes buiten src/
- oude singlefile research builds

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
3. npm run preview:host gebruiken voor een lokale build-check op localhost/127.0.0.1
4. Als build ok is: npm run deploy:hosting
5. Daarna een korte live smoke check doen

## 9) Lokale Rollen Expliciet Maken

Gebruik voor lokale test-URLs altijd expliciet `devRole`, zodat GM/speler niet meer stilzwijgend van hostname afhangen.

Voorbeelden:
- GM lokaal: http://127.0.0.1:4173/?dev=1&devRole=gm&devSession=Dev%20Lab&devTag=dev-lab-4321&devPin=1234
- Speler lokaal: http://localhost:4173/?dev=1&devRole=player&devSession=Dev%20Lab&devTag=dev-lab-4321&devPin=1234&devName=Elara

Waarom twee origins:
- localhost en 127.0.0.1 delen geen browser-auth-state of local storage.
- Daardoor kun je GM en speler tegelijk open houden zonder elkaar te overschrijven.

Praktische checkvolgorde:
1. localhost of 127.0.0.1 met expliciete `devRole`
2. npm run build
3. npm run preview:host
4. npm run deploy:hosting
5. live smoke check
