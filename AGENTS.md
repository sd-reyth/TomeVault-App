# TomeVault — Agent Instructions

## Priority

**Visual quality and UX come first.** The app should feel warm, cohesive, and premium (Pocket Bard–level vibe). Ship changes the user can *see* and *feel* in the browser.

## What to preserve

- Business logic, state shape, handlers, Firestore behavior, and feature semantics — unless the user explicitly asks for behavioral changes.
- A working app after every commit (build green, no broken combat/session flows).

## What is NOT required anymore

- No governance doc consultation order.
- No `check:ui` lint gate.
- No mandatory “fix tokens before features” sequencing — use judgment; prefer shared primitives when they speed up consistency, but **do not block bold visual work** waiting for perfect architecture.
- No audit checklists or surface inventories before shipping UI.

## How to work on UI

1. **Show, don’t theorize** — browser QA with screenshots after meaningful visual changes.
2. **Be bold** — if the current component looks wrong, redesign it; incremental class tweaks are not enough when the user says it still feels old.
3. **One surface at a time, but fully** — finish Slagorde before declaring it done; half-refactors waste time.
4. **Ask for reference** when unsure — screenshot, app name, or “more like X, less like Y”.
5. **Merge to the user’s working branch** when a slice is approved — don’t leave visual work stranded on a side branch.

## Active plan

See `references/TOMEVAULT_VISUAL_WAVES.md` for the current wave roadmap.
