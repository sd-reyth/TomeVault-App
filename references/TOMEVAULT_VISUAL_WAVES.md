# TomeVault Visual Waves (post-governance)

**Status:** ACTIVE — replaces protocol-driven v4 sequencing for UI work.

## Honest assessment (where we are)

- Waves 0–2b delivered **architecture and incremental rail tweaks**, not the visual transformation the user expected.
- The user’s screenshot (PAUZEER, “Aan zet: …”, AAN ZET pills) = **old UI** on `actieve-werkversie`. New work lives on `cursor/sessie-polish-5028` and was **never merged**.
- **Slagorde still needs a full visual redo**, not another polish pass on the same layout.

## North star

TomeVault should feel like **one warm fantasy app**: disciplined typography, pill controls, thin icons, card-on-background depth, calm but characterful — not a HUD, not admin UI, not “same layout with different buttons”.

## Principles (lightweight)

1. Visual approval gates — user signs off in browser before next wave.
2. Bold diffs welcome when the old surface is wrong.
3. Keep combat/session logic working.
4. Merge each approved wave to `actieve-werkversie`.

---

## Wave A — Slagorde redo (NEXT, blocking)

**Goal:** Make combat rail something the user is proud of. Throw away timid 2b layout if needed.

**Deliverables:**
- New rail visual design (not just component extraction):
  - Hero-quality combat status block
  - Clear turn ownership (one strong signal)
  - Participant cards with readable names, beautiful HP/AC/init presentation
  - GM actions that look intentional, not bolted on
  - Footer that feels like a control deck
- Desktop + mobile + Dawn theme screenshots
- Merge to `actieve-werkversie`

**Exit:** User says “yes, this is the direction” or gives specific critique for one more iteration.

**Not in scope:** App.jsx slimming, other screens.

---

## Wave B — App shell

**Goal:** Sidebar, topbar, and main canvas match the rail quality.

**Surfaces:**
- Left nav (icons, labels, active state)
- Top bar (session, ambience, GM badge)
- View shell (headers, search bars, empty states)
- Kronieken + Voorbereidingen as first content screens

**Exit:** Opening any main tab feels like the same product as Slagorde.

---

## Wave C — Modals & profiles

**Goal:** HandoutModal, CharacterProfileModal, SettingsModal, confirm dialogs — same visual language.

**Exit:** No modal feels like legacy UI.

---

## Wave D — Remaining features

**Goal:** Chat, handouts grid, inventory, landing/login, ambience panel.

**Exit:** Full session walkthrough without visual whiplash.

---

## Wave E — Architecture cleanup (when visuals stable)

**Goal:** Maintainability without touching look & feel.

- `useAuth`, `useSession`, thin `App.jsx`
- CSS consolidation if helpful
- Optional: finish `shell/` extraction

**Exit:** App.jsx < 300 lines, zero behavioral regression.

---

## Deferred / cancelled from v4

| Old item | New stance |
|----------|------------|
| `check:ui` enforcement | Removed |
| Governance protocols | Removed |
| Wave 3 before visuals | **Cancelled** — E runs after D |
| Feature flag `tomevault:new-rail` | Not needed — ship directly |
| “No one-off CSS” hard rule | Soft preference only |

---

## Branch hygiene

All visual work should land on **`actieve-werkversie`** (or merge immediately after approval). The user must not need a special branch to see progress.

```bash
git checkout actieve-werkversie   # or merge cursor/sessie-polish-5028 first
npm run dev
# http://localhost:5173/?dev=gm
```
