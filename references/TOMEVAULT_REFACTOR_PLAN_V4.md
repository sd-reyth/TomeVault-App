# TomeVault Refactor Plan v4

## Status: ACTIVE — started Wave 0

This is the definitive refactor plan. It supersedes the exploratory v1/v2/v3 drafts.

## Context

TomeVault's visual problems are no longer a colors-and-fonts issue.
They are an **architecture and adoption problem**:

- `App.jsx` — 4000+ lines (auth, Firestore, routing, handlers, UI markup)
- `index.css` — 3200+ lines (tokens, primitives, feature-specific CSS all mixed)
- 315 ad-hoc styling violations (`text-[Npx]`, `font-fantasy` on UI chrome) as of Wave 0
- No shared `Icon`, `Text`, or `Card` primitive — every component repeats patterns
- `LandingThemePicker` was on the login screen (removed in Wave 0)

## North Star

TomeVault should feel like Pocket Bard: warm, atmospheric, visually disciplined.
But TomeVault has 5 themes vs Pocket Bard's 1 — that is a **strength**, provided
tokens are respected throughout.

Reference: `references/TOMEVAULT_UI_SPEC_V1.md`

## Target Architecture

```
src/
├── theme/          # tokens.css + ThemeProvider
├── ui/             # design system primitives (grows per wave)
├── shell/          # TopBar, Sidebar, RightRail, ScreenScaffold
├── features/       # combat/, handouts/, chat/, ... (thin views)
├── app/            # App.jsx (<250 lines) + hooks
└── lib/            # business logic (untouched)
```

Migration rule: old `src/components/*` stays until the wave that replaces it is complete.
No mass rename in one commit.

## Waves

### Wave 0 — Preparation + cleanup ✅ DONE
**Exit state:**
- Theme picker removed from landing/login screen (now only in SettingsModal)
- Directory structure created: `ui/`, `shell/`, `features/`, `app/`, `theme/`
- `npm run check:ui` script warns on `text-[Npx]` and `font-fantasy` outside `ui/` and `theme/`
- Baseline: 315 violations (target: 0 after Wave 5)
- Build passes, app functionally unchanged

### Wave 1 — Core primitives
**Goal:** Minimal design system foundation that Wave 2b can use directly.

New primitives (four only):
| Primitive | Replaces |
|-----------|---------|
| `Icon` | Direct `lucide-react` imports + MDI in DiceRoller |
| `Text` | `tv-type-*` classes + `text-[Npx]` |
| `Button` | Extend existing: icon slot, loading state, sm/md |
| `Card` | Copy-pasted `tv-panel` surfaces |

CSS split: `theme/tokens.css` + `ui/primitives.css` extracted from `index.css`.

MDI removed from `DiceRoller.jsx` and `ChatView.jsx`.

SegmentedControl → Wave 2b (not needed yet).

**Exit criteria:**
- No direct `lucide-react` imports outside `ui/Icon.jsx`
- No `@mdi/js` in `src/`
- Four primitives documented with one example each
- Build green; screens visually equal or better

### Wave 2a — useCombat extraction
**Goal:** Largest block out of App.jsx without touching UI. Stoppable after this wave.

New file: `app/useCombat.js`
— initiative, turns, pause, conditions, join-requests extracted from App.jsx

**Exit criteria:**
- `useCombat.js` exists; combat handlers not inline in App.jsx
- App.jsx ~300–500 lines smaller
- No behavioral regression; no visual change
- Session test: initiative, conditions, pause, NPC management still work

### Wave 2b — RightRail redesign (highest risk wave)
**Goal:** Fix the biggest daily pain point — the combat rail.

Risk mitigation: internal feature flag `tomevault:new-rail` (localStorage) so the old
RightSidebar can be re-enabled without redeployment if a session test fails.

New files:
```
shell/RightRail.jsx
features/combat/TurnBanner.jsx
features/combat/ParticipantRow.jsx
features/combat/CombatActions.jsx
features/combat/ConditionChips.jsx
```

New primitives added to `ui/`:
- `SegmentedControl` — combat mode (active/pause)
- `IconButton` — composed from Button + Icon

UX non-negotiables:
1. ONE turn indicator (banner OR row highlight, not three signals)
2. No name truncation on mobile
3. Uniform action grid — `IconButton` only, no PAUZEER text + round icon mix
4. No `font-fantasy` on row labels — only `Text variant="body"`
5. `SegmentedControl` for combat mode

**Exit criteria:**
- Old `RightSidebar.jsx` kept until new rail passes one real session
- `RightSidebar.jsx` < 300 lines (rest in `features/combat/`)
- Mobile QA: readable names, one turn indicator, uniform actions
- No regression in conditions, NPC management, initiative swap

### Wave 3 — App.jsx slimmer
**Goal:** Maintainability. Logical after Wave 2a removes combat.

Extract: `app/useAuth.js`, `app/useSession.js`, `app/providers.jsx`

**Exit criteria:**
- App.jsx < 250 lines
- No UI markup in hooks
- Build green, no behavioral change

### Wave 4 — HandoutModal + 2 large modals
**Order:** HandoutModal → CharacterProfileModal → SettingsModal

Per modal:
- Labels → `<Text variant="label">`
- Footer → `<Button>` grammar (ghost / primary / danger)
- Microcopy shortened; long explanation → `TextReveal`
- Add `Toggle` to `ui/` only if HandoutModal needs it

**Exit criteria:**
- 0× `text-[Npx]` in these three modals
- HandoutModal < 350 lines

### Wave 5 — Remaining screens + enforce
**Screens:** LandingScreen → AmbiencePanel (+ `Slider` if needed) → ChatView, HandoutsView, InventoryView → remaining modals

**Enforce:**
- `check:ui` becomes CI blocker (`STRICT=1`)
- Dead CSS removed from index.css (target: < 1000 lines)
- Surface inventory updated with new paths
- Dawn + 4 other themes QA on all surfaces

**Exit criteria:**
- 0 violations in `check:ui` (excluding legacy allow-list)
- All surfaces from TOMEVAULT_UI_SURFACE_INVENTORY.md checked

## Primitives roadmap

| Wave | Added to `ui/` |
|------|---------------|
| 1 | Icon, Text, Button (extended), Card |
| 2b | SegmentedControl, IconButton |
| 4 | Toggle (if HandoutModal needs it) |
| 5 | Slider, ScreenScaffold, Modal (ModalFrame evolution) |

Only build what a concrete wave requires. Nothing upfront.

## Hard rules (apply from Wave 0 forward)

1. No new `text-[Npx]` in features — use `Text` variants
2. No `font-fantasy` outside `Text variant="display|title|subtitle"`
3. No hardcoded theme colors (`rose-*`, `amber-*`, `indigo-*`) in features
4. No border/radius/shadow in feature component className — use Card or Panel
5. No second hero header in embedded views
6. No full-system rebuild while a wave is in progress

## Success criteria (full completion)

- Changing primary accent in one token file → whole app follows
- New modal in < 30 lines of markup (primitives only)
- No visual inconsistency between sidebar, combat rail, and modals
- Mobile combat: name readable, one turn signal, uniform actions
- 5 themes including Dawn: no dark patches, no hardcoded surfaces
- App.jsx < 250 lines
- User at first session: "this feels like one app"

## Baseline (Wave 0 measurements)

| Metric | Wave 0 | Target (Wave 5) |
|--------|--------|-----------------|
| check:ui violations | 315 | 0 |
| App.jsx lines | 4023 | < 250 |
| index.css lines | 3212 | < 1000 |
| RightSidebar.jsx lines | 1439 | < 300 (split) |
| Direct lucide-react imports | 28 files | 1 (Icon.jsx) |
| @mdi/js usage | 2 files | 0 |
