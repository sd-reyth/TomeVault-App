# interfaceUpdate Audit Log

Last run: _2026-03-25_

> This file is maintained automatically by the `interface-update` skill.
> Do not edit manually unless removing a stale or incorrect entry.
> The skill reads this file at the start of every run and skips items marked `DONE`.
> To force a full re-audit of everything, invoke: `/interface-update full audit`

---

## Completed Items

- [DONE] 2B-input-types — Added correct `type` attributes for GM/player/session/profile/template/inventory inputs in `index.html` — 2026-03-25
- [DONE] 2B-prof-initiative-inputmode — Added missing `inputmode="numeric"` to `profStatInitiative` in `index.html` — 2026-03-25
- [DONE] 2D-focus-rings — Added `.btn:focus-visible` and `.topbar__iconBtn:focus-visible` in `style.css` — 2026-03-25
- [DONE] 2C-mode-indicator-css — Added GM mode topbar indicator via `body[data-role="dm"] .topbar` in dark/light/desktop-light rules in `style.css` — 2026-03-25
- [DONE] 2C-mode-indicator-state — Added `document.body.dataset.role = state.role || ""` in `showOnly()` in `index.mjs` — 2026-03-25
- [DONE] 2D-destructive-confirm-leave — Added confirmation guard before leave-session state reset in `index.mjs` — 2026-03-25
- [DONE] 2D-destructive-confirm-reset — Added confirmation guard before reset-initiative action in `index.mjs` — 2026-03-25

---

## Pending Suggestions

- [PENDING] 1-dm-gm-internal-migration — Internal `"dm"` role identifiers are persisted in Firestore docs/IDs and localStorage keys; changing requires coordinated data migration and explicit approval.
- [PENDING] 2D-themed-confirm-modals — Current `window.confirm()` guards are functional but not visually consistent; replace with TomeVault modal pattern in a dedicated follow-up task.

