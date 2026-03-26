---
name: interface-update
description: 'TomeVault UI/UX audit and brand compliance refactor. Use when auditing accessibility, fixing DM→GM terminology, checking mobile responsiveness, reviewing WCAG contrast, or enforcing the TomeVault design token system.'
argument-hint: 'Optional: specify phase + mode (e.g. "Phase 1 only", "audit only, no changes", "mode: ui-copy-only")'
user-invocable: true
disable-model-invocation: false
---

# interfaceUpdate — TomeVault UI/UX Audit & Brand Compliance

**Role:** Senior UX Engineer and Full-Stack Developer for TomeVault App.

> **Non-negotiable foundation:** `.github/copilot-instructions.md` is the single source of
> truth for all visual tokens, component patterns, motion rules, and theming. It overrides
> every generic design system (Material, Tailwind, etc.). Read it before touching any CSS or HTML.

## Do Not Use When

- The request is primarily repository architecture/performance/storage cleanup (use `code-cleanup`).
- The request is primarily feature discovery and roadmap prioritization using external research (use `function-suggestions`).
- The request is only about debugging chat-agent runtime behavior or skill loading failures (use `troubleshoot`).

## Invocation Modes

- `mode: ui-copy-only` (default): only update visible UI text, labels, titles, placeholders, tooltips, aria-label/title text, and docs/comments where safe.
- `mode: ui-and-css`: includes `ui-copy-only` plus CSS/HTML/accessibility implementation work from this skill.
- `mode: migration-required`: allows internal identifier changes (variable names, persisted role values, keys) only with explicit user approval in the current request.

---

## Pre-flight — Audit Log Check

Before doing anything else:

1. Read [./AUDIT_LOG.md](./AUDIT_LOG.md).
2. For every checklist item in Phase 2 that has a matching entry under `## Completed Items`
   in the log with status `DONE`, **skip that item entirely** — do not re-audit, do not
   re-implement, do not mention it in the Phase 4 report unless the user explicitly asks.
3. If the log does not exist yet, proceed with all items as normal.

> **Exception:** If the user's invocation message contains the phrase `full audit` or
> `reset audit log`, ignore the log and treat every item as new.

---

## Phase 1 — Brand Compliance: DM → GM

Scan **all files in the repository** (including `functions/index.js` and any other backend files)
for `DM` (case-sensitive and -insensitive).

Default behavior is `mode: ui-copy-only`.

**Replace** `DM` / `Dm` / `dm` → `GM` / `Gm` / `gm` (preserve original casing) **only when** it
refers to "Dungeon Master" in:
- UI text, labels, headings, toasts, placeholders, tooltips
- ARIA labels and `title` attributes
- Code comments

Only in `mode: migration-required` and only after explicit user approval in this run:

- Variable names and function names
- Persisted role values, Firestore fields, IDs, and storage keys tied to role naming

**Do NOT replace** in:
- "Direct Message" contexts
- CSS dimension values or unit strings
- Third-party library identifiers, external API field names, or SDK types
- Import paths or contents of `node_modules/` or `functions/node_modules/`

After replacing: verify that all renamed identifiers still resolve without reference errors.

If migration mode is used, provide a compatibility plan (fallback reads, data backfill, rollback path).

---

## Phase 2 — UX/UI Heuristic Audit

For each finding, classify it as **[IMPLEMENT]** (unambiguous best-practice fix) or
**[SUGGEST]** (requires layout/architectural decision before acting).

### 2A. Visual Hierarchy & Clutter
- [ ] Core actions (start session, add player, roll dice) reachable within 3 taps from the dashboard — flag any that require more as **[SUGGEST]**
- [ ] Spacing between functional blocks follows the 8-point grid (multiples of 4px/8px) per the UX contract — misalignments are **[IMPLEMENT]**
- [ ] Secondary GM tools (advanced settings, generators) are behind modals or collapsible sections, not inline — **[SUGGEST]** where restructuring is required

### 2B. Mobile vs. Desktop
- [ ] Touch targets ≥ 44×44px on all interactive elements in mobile layout — **[IMPLEMENT]**
- [ ] No element causes horizontal scroll at < 768px — tables must degrade to cards or scrollable containers — **[IMPLEMENT]** for trivial fixes, **[SUGGEST]** for layout refactors
- [ ] All `<input>` fields have the correct `type` attribute (`number`, `email`, `tel`, `url`, etc.) — **[IMPLEMENT]**
- [ ] Each major screen fills the visible viewport (`100dvh`) without accidental page overflow in default state (allow overflow only in intended scroll regions or explicitly expanded content) — **[IMPLEMENT]** for CSS/container fixes, **[SUGGEST]** for structural rewrites
- [ ] Viewport-fit implementations follow the existing app-shell and `body[data-screen]` active-screen pattern (including chrome-offset variables already defined in `style.css`) — **[IMPLEMENT]**

### 2C. Player vs. GM Mode Awareness
- [ ] A clear visual indicator communicates which mode the user is in — **[IMPLEMENT]**
- **Use only TomeVault's existing gold accent tokens and border/shadow variables — do not introduce new colors (no blue, silver, red, or any hex not already in `style.css`).**
- Apply a gold-accented header border or badge using existing CSS variables. If the correct element to target is ambiguous, **pause and ask the user before implementing.**

### 2D. Accessibility (WCAG 2.1 AA)
- [ ] Text contrast ratio ≥ 4.5:1 against background in both light and dark modes — **[IMPLEMENT]** when a token swap fixes it, **[SUGGEST]** when structural change is needed
- [ ] All interactive elements have a visible `:focus` ring — **[IMPLEMENT]**
- [ ] Bare `<div>` or `<span>` elements acting as buttons are replaced with `<button>` or `<a>` with correct `role`, `aria-label`, and keyboard handlers — **[IMPLEMENT]**
- [ ] Every destructive action (Delete, Reset, Leave Session) requires a confirmation dialog before execution — **[IMPLEMENT]**

### 2E. Feedback States
- [ ] Data-fetch operations > 300ms show a spinner or skeleton — **[IMPLEMENT]** for missing states, **[SUGGEST]** where architectural change is required
- [ ] Errors surface a user-readable message, not a raw Firebase error code — **[IMPLEMENT]**
- [ ] Save/submit success shows a brief toast or inline confirmation — **[IMPLEMENT]**

### 2F. Dimensional Consistency
- [ ] Equivalent component variants use consistent dimensions (button heights, input heights, icon button sizes, card paddings, radii) unless a documented variant intentionally differs — **[IMPLEMENT]**
- [ ] Repeated controls in the same region align to a shared baseline/width rule (`auto`, `--btn--full`, or grid constraint) with no one-off pixel widths — **[IMPLEMENT]**

### 2G. Brand Wordmark Consistency
- [ ] The `TomeVault` wordmark styling remains consistent anywhere it appears as brand text (gold emphasis, subtle glow treatment, heading font usage, and no off-brand color drift) — **[IMPLEMENT]** when class/token fixes are clear, **[SUGGEST]** if conflicting legacy variants need design decision

### 2H. Motion Uniformity & Polish
- [ ] Add or normalize subtle, professional motion where missing on key interactions (screen enter, modal open/close, primary button hover/press, panel reveal), using existing motion tokens only — **[IMPLEMENT]**
- [ ] Remove inconsistent easing/duration usage and align to `var(--tv-ease)` + `var(--tv-dur-fast/mid/slow)` tiers — **[IMPLEMENT]**
- [ ] Ensure all new or adjusted motion paths include reduced-motion fallbacks — **[IMPLEMENT]**

---

## Phase 3 — Execution Rules

**Implement immediately** (no confirmation needed) — items classified **[IMPLEMENT]**:
- DM → GM string replacements (Phase 1)
- Missing or incorrect `type` attributes on `<input>` elements
- Missing ARIA labels on icon-only buttons
- Missing `:focus-visible` styles on interactive elements
- Spacing corrections that violate the 8-point grid and have no layout side effects
- Replacing `<div role="button">` with `<button>` where behavior is unchanged
- GM/Player mode awareness indicator (Phase 2C) using existing CSS tokens
- Viewport-fit fixes that keep each screen within device-visible bounds by default
- Size/width/radius normalization for equivalent controls where intent is unambiguous
- Brand wordmark token/class consistency fixes where the canonical style already exists
- Motion token/easing/duration normalization and reduced-motion coverage
- Asset query version bumps in `index.html` when CSS/JS assets are changed
- Post-edit diagnostics checks on all touched files, with relevant error fixes before final report

**Pause and verify with the user before acting** when:
- The correct element, selector, or variable name to change is ambiguous
- A fix could affect Firebase auth, session state, or real-time data flow
- The only viable implementation requires touching more than 2 files at once
- Any doubt exists about intent — ask one clear, specific question before proceeding

**Do NOT implement without explicit user approval** — items classified **[SUGGEST]**:
- Reordering, merging, or removing panels or major UI sections
- Changing Firebase query logic, auth flow, or session state
- Adding entirely new UI components not currently in the codebase

### Loop & Stop Rule
After completing Phases 1–3, produce a Phase 4 report. If that report surfaces new
**[IMPLEMENT]** findings that were only revealed by earlier fixes (e.g., a semantic HTML
fix exposes a missing ARIA label), you may begin a second pass — but only for those
newly-uncovered items.

**Maximum 3 passes total.** After the third report, stop unconditionally regardless of
remaining findings. Move any outstanding items into the "Suggested Improvements" section
and wait for explicit user instruction before continuing.

---

## Phase 4 — Post-Audit Report

Output a concise report after completing Phases 1–3:

### Files Changed
One line per file: filename → what changed.

### Implemented Fixes
Bullet list of everything applied directly.

### Suggested Improvements (Require Approval)
Bullet list of **[SUGGEST]** findings with brief rationale.
Only include changes that would materially improve UX or accessibility.
If none meet that bar, state: **"No further improvements necessary."**
Do not list speculative or cosmetic changes.

### Shared Output Contract
- Severity: Critical, High, Medium, Low
- Confidence: High, Medium, Low
- Safe-to-auto-fix: Yes or No
- Decision: Implemented, Suggested, Needs Confirmation, Deferred
- Evidence: short rationale with affected file(s)

### Validation Evidence (Required)
- Diagnostics status for touched files (errors fixed or none found)
- Asset version update confirmation when CSS/JS changed
- Deployment verification note: expected version string and changed selector/behavior present in live assets (or explicitly marked as not yet deployed)

---

## Post-run — Update the Audit Log

After delivering the Phase 4 report, update [./AUDIT_LOG.md](./AUDIT_LOG.md):

1. For every item that was **implemented** this run, add or update an entry under
   `## Completed Items` using this format:
   ```
   - [DONE] <checklist item ID> — <one-line description of what was fixed> — <date YYYY-MM-DD>
   ```
2. For every item that was **suggested but not yet implemented**, add or update under
   `## Pending Suggestions`:
   ```
   - [PENDING] <checklist item ID> — <one-line rationale>
   ```
3. If an item was previously `PENDING` and has now been implemented, move it to
   `## Completed Items` and change its status to `DONE`.
4. Do not remove old entries — the log is append-only except for status promotions.
5. Update the `Last run:` date at the top of the file.

## Cross-Skill Routing

- If audit uncovers deeper performance/scalability/storage durability concerns, route to `code-cleanup`.
- If audit surfaces repeated feature demand or roadmap uncertainty, route to `function-suggestions`.
- If a blocker is caused by customization-file behavior or agent config loading, route to `agent-customization` or `troubleshoot`.

