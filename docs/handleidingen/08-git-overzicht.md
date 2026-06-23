# Git-overzicht voor TomeVault (begrijpelijke namen)

Dit document is bedoeld als naslagwerk als je geen programmeerervaring hebt.
De **oude technische namen** staan links; de **betekenis** rechts.

---

## Welke versie is het meest actueel?

| Versie | Branch | Laatste wijziging | Wat is het? |
|--------|--------|-------------------|-------------|
| **Jouw werkversie (nieuwste lokaal)** | `actieve-werkversie` | 23 juni 2026 — "CURSOR READY" | De app zoals jij die met Copilot/Cursor hebt gebouwd (`App.jsx`, React, Firebase). **Dit is waar je nu op werkt.** |
| **GitHub-versie (online backup)** | `origin/main` | 27 mei 2026 — HandoutsPage | Een **andere** ontwikkellijn (TypeScript, `App.tsx`, CampaignHub). Gemaakt door Grok/andere AI. **Niet hetzelfde als jouw lokale app.** |
| Oude kopie op GitHub | `origin/grok-updates` | Zelfde als `origin/main` | Veiligheidskopie van de Grok-lijn |

**Belangrijk:** jouw computer en GitHub lopen **niet synchroon**. Je lokale versie is verder ontwikkeld, maar op een andere route dan wat op GitHub staat.

**Live website:** https://tomevaultapp.web.app (Firebase Hosting, project `tomevaultapp`)

---

## Branches — oude naam → nieuwe naam

Lokale branches zijn hernoemd op 23 juni 2026:

| Oude naam | Nieuwe naam | Wat zit erin? |
|-----------|-------------|---------------|
| `restore-89efecd` | **`actieve-werkversie`** | Jouw hoofdlijn — huidige werkbranch |
| `main` | `oud-main-initiative-bug` | Oude main, vastgelopen bij initiative-tracker bug |
| `github-main` | `kopie-van-github` | Lokale kopie van GitHub main |
| `grok-updates` | `grok-handouts-wijzigingen` | Grok's HandoutsPage-werk |
| `safety-grok-state-2026-05-27` | `veiligheidskopie-grok-27mei` | Veiligheidskopie van 27 mei |
| `bigChanges1` | `live-test-bugfixes` | Bugfixes tijdens live D&D-test |
| `codeoverhaul` | `ui-herontwerp-lichtmodus` | UI-herontwerp gericht op licht thema |

**Op GitHub** heten de branches nog `main` en `grok-updates` (die zijn niet hernoemd).

---

## Recente commits op `actieve-werkversie` (vertaald)

| Technische naam | Wat betekent het in het Nederlands? |
|-----------------|-------------------------------------|
| CURSOR READY | Klaar om verder te werken in Cursor |
| Klaar met VS Code en Github Copilot… | Overstap naar Cursor |
| Enhance InventoryView and PreparationsView… | Inventaris- en voorbereidingsschermen visueel verbeterd |
| Beter! Ietsje. | Kleine UI-verbetering |
| Enhance UI elements… | Animaties en stijlen bijgewerkt |
| Kleine fix, niet heel zichtbaar nog. | Kleine bugfix, nauwelijks zichtbaar |
| Lange break gehad! | Hervat na pauze |
| Add README.md… | Projectdocumentatie toegevoegd |
| Backup voor GROK hersteld… | Herstelpunt na Grok-problemen |
| Backup for GROK… | Thema-ondersteuning uitgebreid (voor Grok) |
| Add SVG assets for coins… | Munt-iconen (koper, zilver, goud, platina) |
| Stabiel, nog geen MVP: | Werkende versie, nog geen minimum product |
| Stabiel, niet optimaal: | Werkend maar nog niet goed genoeg |
| Backup voor grote veranderingen | Veiligheidskopie vóór grote wijziging |
| feat: add dice roller… | Dobbelsteenroller toegevoegd |
| feat: add player archive PDF… | PDF-export van spelerarchief |
| Initiative tracker gefixt! | Gevechtsbeurt-volgorde werkt weer |
| QR-code werkt nu! | Spelers kunnen via QR joinen |
| feat: add AmbiencePanel… | Achtergrondmuziek-paneel toegevoegd |
| TOMEVAULT 2.0: | Grote herstart van de app-structuur |

---

## Lokaal werken vs. Cloud (Cursor)

### Lokaal werken (wat je nu doet)
- De code staat op **jouw computer** in `Documents\TomeVault App`
- Cursor opent die map en ik (de AI) kan bestanden lezen, aanpassen en commando's draaien
- Wijzigingen zijn eerst alleen lokaal zichtbaar tot je **build + deploy** doet

### Cursor Cloud Agents
- Een **aparte virtuele machine** van Cursor in de cloud
- Werkt op een **eigen git-branch** in een geïsoleerde kopie van het project
- Handig voor langere taken terwijl je computer uit staat
- **Niet hetzelfde** als Firebase of GitHub — het is Cursor's eigen cloud-omgeving

### Firebase (de "cloud" van je app)
- **Google Firebase** — projectnaam: `tomevaultapp`
- Hier draait de **live website**, database (Firestore), bestandsopslag en login
- Deployen = `npm run build` + `firebase deploy`
- URL: https://tomevaultapp.web.app

| | Lokaal (jouw PC) | Cursor Cloud | Firebase (Google) |
|--|------------------|--------------|-------------------|
| Wat | Code bewerken | AI werkt op afstand | Live app voor gebruikers |
| Wie ziet het | Alleen jij | Jij via Cursor | Iedereen met de link |
| Database | Nee | Nee | Ja (Firestore) |

---

## Kan Cursor GitHub Copilot vervangen?

**Ja, grotendeels — en voor jouw situatie waarschijnlijk beter.**

| Taak | GitHub Copilot (VS Code) | Cursor Agent (ik) |
|------|--------------------------|-------------------|
| Code suggesties tijdens typen | ✅ Sterk | ✅ Ook beschikbaar |
| Hele features bouwen | Beperkt | ✅ Kan meerdere bestanden tegelijk aanpassen |
| Terminal-commando's draaien | Nee | ✅ Build, deploy, git |
| Uitleg in gewone taal | Beperkt | ✅ Uitgebreid |
| Firebase deployen | Jij moet het doen | ✅ Ik kan het uitvoeren (met jouw toestemming) |
| Firestore rules aanpassen | Jij moet het doen | ✅ Ik kan `firestore.rules` bewerken en deployen |
| Git commits / PR's | Beperkt | ✅ Met jouw expliciete verzoek |

**Wat ik niet automatisch kan zonder jou:**
- Inloggen op jouw Firebase- of GitHub-account (tenzij CLI al ingelogd is)
- Beslissingen nemen over welke versie (jouw `App.jsx` vs. Grok's `App.tsx`) de toekomst wordt
- Force-pushen naar GitHub zonder jouw expliciete OK

---

## Aanbevolen werkwijze vanaf nu

1. Werk altijd op branch **`actieve-werkversie`**
2. Geef commits **duidelijke Nederlandse namen**, bijv.:
   - `ui: sidebar-knoppen gelijkgetrokken`
   - `fix: qr-code werkt op mobiel`
   - `deploy: live versie bijgewerkt`
3. Vraag mij om te **builden en deployen** als je klaar bent voor de live site
4. Sync met GitHub pas als je bewust kiest welke versielijn de hoofdlijn wordt

---

## Commits hernoemen — waarom dat niet automatisch is gedaan

Oude commit-berichten hernoemen = **geschiedenis herschrijven**. Dat:
- Kan GitHub breken als die commits al online staan
- Vereist `force push` (gevaarlijk zonder ervaring)
- Raakt tientallen commits tegelijk

**Branches zijn wel hernoemd.** Voor commits staat de vertaling in de tabel hierboven.
Vanaf nu kunnen we nieuwe commits wél met duidelijke Nederlandse namen maken.

---

## Werken op een andere laptop (Cursor)

Je bent **niet gebonden aan één laptop**. De code hoort op **GitHub** te staan; elke laptop haalt die op via Cursor.

### Eenmalig op deze laptop (nu)

1. Zorg dat GitHub de branch `actieve-werkversie` heeft:
   ```powershell
   cd "C:\Users\mholt\Documents\TomeVault App"
   git push -u origin actieve-werkversie
   ```
2. Als Windows om inloggen vraagt: log in op GitHub (browser of Git Credential Manager).

### Op de andere laptop (eerste keer)

1. Installeer [Cursor](https://cursor.com) en [Git](https://git-scm.com).
2. Clone het project:
   ```powershell
   git clone https://github.com/sd-reyth/TomeVault-App.git
   cd TomeVault-App
   git checkout actieve-werkversie
   npm install
   npm run dev
   ```
3. Open de map in Cursor: **File → Open Folder**.

### Elke keer als je wisselt van laptop

| Actie | Commando |
|-------|----------|
| **Voor je weggaat** — werk opslaan in de cloud | `git add .` → `git commit -m "beschrijving"` → `git push` |
| **Op andere laptop** — nieuwste code ophalen | `git pull` |
| **Live site bijwerken** (optioneel) | `npm run build` → `npm run deploy:hosting` |

### Wat loopt waar?

| Plaats | Wat staat er? | Voor wie? |
|--------|---------------|-----------|
| Jouw laptop | Werkkopie + Cursor | Jij, tijdens ontwikkelen |
| **GitHub** (`actieve-werkversie`) | Broncode, versiegeschiedenis | Jij, op alle laptops |
| **Firebase** (`tomevaultapp.web.app`) | Live website voor spelers | Jouw spelers / testers |

GitHub = code sync tussen laptops. Firebase = wat gebruikers online zien.

### Let op: twee versies op GitHub

- **`actieve-werkversie`** — jouw echte app (`App.jsx`) ← gebruik deze
- **`main`** — oudere Grok/TypeScript-lijn (`App.tsx`) — gearchiveerd, kan later verwijderd worden

### Gearchiveerde oude branches (juni 2026)

Oude branches zijn **lokaal verwijderd**, maar veilig bewaard als **tags** (bladwijzers in git):

| Tag | Wat zat erin? |
|-----|---------------|
| `archief/grok-typescript-27mei-2026` | Grok HandoutsPage / App.tsx-lijn |
| `archief/live-test-bugfixes` | Bugfixes tijdens live D&D-test |
| `archief/ui-herontwerp-lichtmodus` | UI-herontwerp licht thema |
| `archief/oud-main-initiative-bug` | Oude main bij initiative-tracker bug |

Een tag terugzetten (alleen als je ooit iets nodig hebt):
```powershell
git checkout archief/grok-typescript-27mei-2026
```


