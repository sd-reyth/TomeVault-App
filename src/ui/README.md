# src/ui — Design system primitives

Only presentation primitives live here. No business logic, no Firestore, no handlers.

Rules:
- No `text-[Npx]` arbitrary sizes — use `tv-type-*` classes or the `Text` component.
- No `font-fantasy` except inside `Text variant="display|title|subtitle"`.
- No hardcoded theme colors (`rose-*`, `amber-*`, etc.) — use semantic tokens.
- Every interactive control must have hover, focus, press, and disabled states.

Current primitives:
- `Button.jsx` — primary / secondary / ghost / danger / accent variants

Planned (Wave 1+):
- `Icon.jsx` — Lucide only, strokeWidth 1.5, 44px touch target
- `Text.jsx` — wrapper for tv-type-* scale
- `Card.jsx` — surface container
- `SegmentedControl.jsx` — tab/mode selector (Wave 2b)
