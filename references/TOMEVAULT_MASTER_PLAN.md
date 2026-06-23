# TomeVault Master Plan — Visual Revolution

**Status:** ACTIVE  
**Datum:** juni 2025  
**Supersedes:** protocol-driven v4, governance docs (verwijderd)

---

## Afspraken met de product owner

| # | Afspraak |
|---|----------|
| 1 | **Richting:** Pocket Bard — warm, cohesive, modern fantasy; pills, thin icons, card-on-background |
| 2 | **Merge:** pas naar `actieve-werkversie` wanneer jij tevreden bent — niet eerder |
| 3 | **Eerst Slagorde:** alles wat dwars zit (PAUZEER-mix, “aan zet”-chaos, lelijke rijen, bolt-on acties) gaat als eerste |
| 4 | **Echt, niet cosmetisch:** layout + hiërarchie + feel veranderen; geen “zelfde UI, andere className” |
| 5 | **Snel zichtbaar:** elke sessie eindigt met browser-screenshots van wat er anders is |

---

## Wat er misging (eerlijk)

1. **Te veel architectuur, te weinig ontwerp** — componenten extracten ≠ visuele revolutie  
2. **Te voorzichtig** — oude layout behouden, alleen knoppen vervangen  
3. **Branch-split** — jij keek soms naar `actieve-werkversie`, werk zat op `cursor/sessie-polish-5028`  
4. **Governance remde bold moves** — nu verwijderd (`check:ui`, 7 protocol-docs weg)

De 2b-code (primitives, `useCombat`, combat components) **hergebruiken we** waar het helpt — maar de **Slagorde krijgt een nieuw visueel ontwerp**, geen polish-pass.

---

## Noordster (Pocket Bard vertaald naar TomeVault)

```
Warm canvas → floating cards → één duidelijke actie per zone
Pill controls (niet vierkante icon-mush)
Thin stroke icons (1.5)
Sans voor UI, serif alleen voor ceremoniële titels
Turn state = één sterke visuele beat (niet banner + status + pill + rail)
GM control deck onderaan, altijd zichtbaar zonder scrollen
```

**Niet:** HUD-dichtheid, admin-dashboard, fantasy-font op elke label, vierkante action-trays op rijen.

---

## Werkwijze (snelheid zonder rotzooi)

### Per sessie
1. **Ontwerpkeuze** (1 blok tekst + optionele schets) → jij knikt of stuurt bij  
2. **Implementatie** in de branch waar we werken  
3. **`npm run build`** groen  
4. **Browser QA** — desktop + 390px + Dawn  
5. **Screenshots** in artifacts + korte “wat is anders”  
6. **Merge alleen op jouw “ja”**

### Branch
- Werk op `cursor/sessie-polish-5028` (of nieuwe `cursor/wave-a-slagorde-*`)  
- Jij test lokaal op die branch  
- Merge naar `actieve-werkversie` = jouw expliciete goedkeuring

---

# WAVES

## Wave A — Slagorde + Shell Revolution (NU)

**Scope expanded per user:** not rail-only — topbar chips, sidebar nav pills, main view shells, and combat rail in one cohesive `revolution.css` pass.

**Delivered in branch:** `cursor/sessie-polish-5028`

**Doel:** De combat rail waar je trots op bent. Alles wat je dwars zit, weg. Pocket Bard-niveau op dit ene paneel.

### A1 — Status & control zone (header)
**Weg met:**
- PAUZEER-tekstknop + losse iconen mix  
- “Aan zet: {naam}” in header én banner én rij-pill  
- Ingepakte box-in-box zonder hiërarchie  

**Nieuw:**
- **Combat hero card** — grote status (Ruststand / Gevecht / Pauze), ronde-badge, één regel context  
- **Mode deck:** `Start gevecht` (idle) of **pill toggle** Actief | Pauze (niet “PAUZEER”)  
- **Secondary row:** Uitleg + Stop als gelijkwaardige labeled pills (geen roze skull-tile)  
- Status-icoon in zachte **glow chip**, niet los in het raster  

### A2 — Participant tiles (rijen)
**Weg met:**
- `truncate` / afgeknipte namen  
- Vierkante action-tray rechts op de rij  
- HP/AC als naoorlogse input-boxjes  
- “AAN ZET” pill naast volgordenummer  

**Nieuw:**
- **Character tile** — avatar links, naam `break-words`, conditions als floating chips  
- **Stat strip** — HP | AC | Init als horizontale pillen (leesbaar, tikbaar voor GM)  
- **Turn = tile state** — border glow + left rail + subtiele lift (geen derde tekstlabel)  
- **Volgorde** — klein nummer-badge, geen zwaard/pauze-duplicaat  
- GM acties: compact **icon row** onder tile op mobile, zijkant op desktop — geen bordered tray  

### A3 — Control deck (footer)
**Nieuw:**
- Vaste **GM deck**: Rol allen | + NPC | Volgende beurt (primary, full width op mobile)  
- Altijd zichtbaar zonder roster-scroll (shell fixed footer)  
- Duidelijke disabled states (niet “verdwenen grey blobs”)  

### A4 — Shell & thema
- Rail voelt **premium**: minder dashed boxes, meer depth, rustiger borders  
- **Dawn parchment** QA — geen dark patches, turn glow leesbaar  
- Mobile overlay: safe areas, geen overlap met bottom nav  

### Wave A — Definition of Done
- [ ] Jij zegt: “dit is de richting” (mag nog iteratie, maar geen “hetzelfde als eerst”)  
- [ ] Geen PAUZEER, geen “Aan zet” in header, geen AAN ZET pill op rijen  
- [ ] Screenshots: desktop combat actief, mobile 390px, Dawn  
- [ ] Build groen, combat start/pause/advance/end werkt  
- [ ] Merge naar `actieve-werkversie` **alleen na jouw OK**

**Geschatte omvang:** 1–2 gefocuste agent-sessies (grote CSS + layout rewrite van combat slice, niet hele app).

---

## 🟠 Wave B — App Shell (na A-goedkeuring)

**Doel:** Sidebar, topbar en view-headers voelen als hetzelfde product als Slagorde.

| Surface | Wat |
|---------|-----|
| Linker nav | Pill active state, icon+label rhythm, geen losse grijze tiles |
| Topbar | Session chip, ambience, GM badge — één rustige band |
| View shell | Kronieken + Voorbereidingen headers, search, empty states |
| Main canvas | Card-on-background depth consistent met rail |

**Definition of Done:** Tab wisselen voelt niet als andere app.

---

## 🟡 Wave C — Modals & profiles

HandoutModal → CharacterProfileModal → SettingsModal → confirm dialogs.

Zelfde button grammar, spacing, headers, footers als Wave A/B.

**Definition of Done:** Geen enkele modal voelt “legacy”.

---

## 🟢 Wave D — Overige features

Chat, Handouts grid, Inventory, Landing/login, Ambience panel, player views.

**Definition of Done:** Full GM-sessie walkthrough zonder visuele whiplash.

---

## 🔵 Wave E — Engineering hardening (pas na visuals)

Jouw testrapport — **belangrijk, maar niet nu:**

| Item | Actie | Prioriteit in E |
|------|--------|-----------------|
| App.jsx ~3484 regels | `useAuth`, `useSession`, feature hooks | E1 |
| Mock initial state | `useState([])` i.p.v. `MOCK_*` | E2 (quick, kan eerder als 30min fix) |
| Listener reset bij `role` change | Dependency fix, geen lege flash | E2 |
| Error boundary vangt alle rejections | Alleen render errors | E3 |
| Geen automated tests | Kritieke flows: combat, join, handout save | E4 |
| Bundle 851kB vendor | Lazy `jspdf`, modal splits | E5 |
| Cloud Functions leeg | Documenteer; geen actie tenzij policy wijzigt | — |
| AudioContext warnings | Defer `primeUiAudio` tot first gesture | E5 |

**UI-governance / check:ui:** verwijderd. Geen violation-count als doel.

---

## Wat we NIET meer doen

- ❌ Governance docs bij elke UI-tweak  
- ❌ `check:ui` als gate  
- ❌ “Wave 3 architectuur” vóór visuele goedkeuring  
- ❌ Kleine class-tweaks verkopen als “redesign”  
- ❌ Merge zonder jouw tevredenheid  

---

## Volgorde (samenvatting)

```
A Slagorde Revolution     ← JIJ BENT HIER
B App shell
C Modals
D Rest features
E Engineering hardening
```

---

## Jouw testrapport → waar het landt

| Jouw punt | Nu? | Wave |
|-----------|-----|------|
| Slagorde ziet er oud uit | **JA** | A |
| App.jsx monolith | Nee | E1 |
| Mock data init | Optioneel snelle fix | E2 |
| Firestore listener flash | Nee | E2 |
| Error boundary te breed | Nee | E3 |
| Geen tests | Nee | E4 |
| Bundle size | Nee | E5 |
| check:ui 292 warnings | **Niet meer relevant** | — |

---

## Eerste actie (direct na plan-OK)

Start **Wave A1+A2** in één pass:
1. Nieuw combat CSS-blok (`combat-rail.css` of dedicated section in `index.css`)  
2. `CombatGmHeader` + `ParticipantRow` layout **opnieuw** — niet itereren op huidige grid  
3. Screenshots naar jou  
4. Jij geeft feedback → A3/A4 → merge wanneer goed  

**Vraag aan jou:** Plan akkoord? Zo ja, start ik Wave A meteen op de huidige branch.
