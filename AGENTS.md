# TomeVault UI Governance

These instructions apply to every future UI, UX, layout, styling, and presentation-layer task in this repository.

## Required Sources Of Truth

Before making any UI change, consult these files in this order:

1. `AGENTS.md`
2. `references/TOMEVAULT_HOUSESTYLE_PROTOCOL.md`
3. `references/TOMEVAULT_UI_PROPAGATION_PROTOCOL.md`
4. `references/TOMEVAULT_UI_AUDIT_CHECKLIST.md`
5. `references/TOMEVAULT_UI_SURFACE_INVENTORY.md`
6. `references/TOMEVAULT_UI_SPEC_V1.md`

## Non-Negotiable Working Rules

1. Preserve business logic, state shape, handlers, persistence behavior, and feature semantics unless the user explicitly asks for behavioral changes.
2. Treat house style as a system, not as per-screen polish.
3. Do not add one-off colors, borders, shadows, spacing recipes, or button recipes inside feature components when a shared token or primitive can own that decision.
4. If a visual change belongs at the token, primitive, shell, or layout-recipe level, fix it there first.
5. If a shared primitive changes, audit and update all dependent screens in the same pass when feasible.
6. On small screens, content priority always beats utility density. Secondary actions must collapse, move, or hide before primary content is compressed.
7. Embedded components may not render their own hero-style headers when they are already inside a screen-level shell.
8. Every screen must follow one approved screen recipe from `references/TOMEVAULT_HOUSESTYLE_PROTOCOL.md`.
9. Every house-style change must be checked against `references/TOMEVAULT_UI_PROPAGATION_PROTOCOL.md` so the rest of the app stays aligned.
10. Every audit or cleanup pass must account for hidden surfaces listed in `references/TOMEVAULT_UI_SURFACE_INVENTORY.md`, not just the currently visible screen.
11. Do not declare a UI task complete until the touched slice is validated and any shared-style fallout is considered.

## Mandatory Behavior For Future UI Work

1. Identify whether the requested change is a token issue, primitive issue, screen recipe issue, or feature-only issue.
2. Prefer centralization over local patching.
3. If no shared primitive exists yet, create or document one instead of repeating ad-hoc markup.
4. When introducing a new UI pattern, update the governing docs in `references/` in the same task.
5. When a user asks for consistency, uniformity, cleanup, polish, responsiveness, or house style, default to these governance files instead of improvising.
6. When a user points out a single bad control or dialog, treat it as evidence of a missing protocol and update the shared rules accordingly.

## Mandatory Functional UI Protocol

1. Buttons, icon actions, clickable text, cards, rows, toggles, destructive actions, and reveal actions all need explicit behavior and style rules.
2. Long explanatory text should be minimized by default and moved behind structured reveal patterns where appropriate.
3. Theme QA must include the lightest and highest-contrast theme state, currently including Dawn, because stray hardcoded dark-surface CSS is easiest to spot there.
