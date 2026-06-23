# TomeVault Implementation Audit — Evidence-Based Status

## Audit Date: 2026-06-23

This document is the evidence-based audit result for all TomeVault surfaces.
It references exact file paths, line numbers, and concrete issues tied to governance violations.
Use this to prioritize centralization and fixes.

## Audit Scoring

- ✅ PASS: meets protocol
- ⚠️  DRIFT: minor inconsistency
- ❌ FAIL: clear violation
- 🔧 DEBT: known centralization gap

---

## Screen-By-Screen Audit Results

### 1. CampaignHub.tsx

**Recipe:** Library Screen with Featured Primary Content  
**Location:** `src/components/CampaignHub.tsx`

#### Header And Hierarchy
- **Title:** `text-4xl font-fantasy` (line 74) ✅
- **Subtitle:** `text-[var(--tv-text-secondary)] mt-1` (line 75) ✅
- **Primary Action (Create Campaign):** `bg-[var(--tv-accent)] hover:bg-[var(--tv-accent)]/90` (line 76-81) ✅

#### Button Protocol
- **Confirm (Maak Campaign):** `bg-[var(--tv-accent)] text-white disabled:opacity-50` (line 215-216) ✅
- **Cancel (Annuleren):** `border border-[var(--tv-border)] hover:bg-[var(--tv-bg-modal)]` (line 210-213) ⚠️ **DRIFT**: Cancel is secondary but hover uses surface color instead of consistent ghost recipe

#### Text Economy
- **Campaign Description:** `line-clamp-2` (line 104) ✅
- **Helper text on reveal:** `'Zichtbaar voor spelers' : 'Klik om te revealen'` (line 157-158) ✅
- **Empty state:** `"Nog geen reveals gedeeld. Deel je eerste reveal om het journal te vullen."` (line 175) ⚠️ **DRIFT**: Slightly verbose, could truncate or reveal behind info affordance

#### Theme Compliance
- **Modal background:** `bg-black/60` hardcoded (line 197) ❌ **FAIL**: Should use `bg-[var(--tv-overlay)]`
- **Modal surface:** `tv-surface` class (line 198) ✅
- **All colors use tokens:** ✅ No hardcoded palette colors in feature layer

**Issues Found:** 2 minor, 1 theme drift  
**Priority:** Medium (modal overlay fix + cancel consistency)

---

### 2. HandoutsPage.tsx

**Recipe:** Library Screen  
**Location:** `src/components/HandoutsPage.tsx`

#### Header And Hierarchy
- **Title:** `text-4xl font-fantasy tracking-tight` (line 26) ✅
- **Subtitle:** `text-[var(--tv-text-secondary)] mt-1` (line 27) ✅
- **Primary Action (Nieuw Handout):** `bg-[var(--tv-accent)] hover:bg-[var(--tv-accent)]/90` (line 28) ✅

#### Search And Filter Behavior
- **Search input:** `rounded-2xl pl-11 py-3 text-sm` (line 40-43) ✅
- **Filter buttons:** Stacked horizontally (line 45-53) ✅ but could benefit from collapse on very narrow screens
- **Filter summary:** `{filteredHandouts.length} van {handouts.length} handouts zichtbaar` (line 57) ✅

#### Card Family Consistency
- **Title:** `font-medium text-lg` (line 67) ✅
- **Preview:** `text-sm text-[var(--tv-text-secondary)] mt-1 line-clamp-2` (line 68) ✅
- **Type badge:** Hardcoded color branches: `bg-red-500/10 text-red-400`, `bg-amber-500/10`, `bg-blue-500/10` (line 69-70) ⚠️ **DRIFT**: Should use semantic token-based type system, not hardcoded palette branches
- **Metadata row:** `text-xs text-[var(--tv-text-secondary)]` (line 74) ✅

#### Text Economy
- **Empty state:** `"Geen handouts gevonden die aan je zoekopdracht voldoen."` (line 85) ✅ Concise

#### Theme Compliance
- **Hardcoded colors in badges:** `red-500`, `amber-500`, `blue-500` (line 69-70) ❌ **FAIL**: Not theme-aware. In Dawn theme these will clash.

**Issues Found:** 2 failures (hardcoded type colors)  
**Priority:** High (theme safety blocker for Dawn)

---

### 3. Modal Footer Pattern (CampaignHub.tsx, line 207-218)

**Recipe:** Confirm/Cancel Footer  
**Location:** `src/components/CampaignHub.tsx` lines 207-218

#### Cancel Button
```tsx
<button 
  onClick={() => setShowCreateModal(false)}
  className="flex-1 py-3 rounded-2xl border border-[var(--tv-border)] hover:bg-[var(--tv-bg-modal)]"
>
  Annuleren
</button>
```
- ⚠️ **DRIFT**: No consistent ghost button recipe. Uses inline styles instead of shared `.tv-button-ghost` or `.tv-button-secondary`.

#### Confirm Button
```tsx
<button 
  onClick={createCampaign}
  disabled={!newCampaignName.trim()}
  className="flex-1 py-3 rounded-2xl bg-[var(--tv-accent)] text-white disabled:opacity-50"
>
  Maak Campaign
</button>
```
- ⚠️ **DRIFT**: Missing focus ring, transitions are not applied to disabled state clearly.

**Findings:**  
- No `.tv-button-primary`, `.tv-button-secondary` shared classes used
- Modal footer button layout is inline flex instead of using a shared footer recipe
- Multiple modals will repeat this pattern locally

**Priority:** Critical (foundation for all modal work)

---

### 4. App.tsx Theme Layer

**Location:** `src/App.tsx` and `src/index.css`

#### Theme Selector Display (App.tsx lines 39-67)
- Theme switcher built into header ✅
- Brightness slider present ✅
- **Issue:** Brightness slider hidden when Dawn is selected: `{theme !== 'dawn-parchment' && (` (line 60) ✅ Correct

#### Brightness Application (index.css line 93)
```css
.tv-app, .tv-surface, .tv-backdrop { filter: brightness(var(--tv-brightness)); }
```
- ⚠️ **DRIFT**: Brightness filter applied globally via filter, not just surfaces. Could affect text readability.

#### Token Definition (index.css lines 1-93)
- All five themes defined ✅
- All required token groups present ✅
- **Critical Issue in Dawn Theme (lines 12-19):**
  ```css
  [data-theme="dawn-parchment"] {
    --tv-bg-canvas: #f8f1e3;
    --tv-bg-surface: #f0e6d2;
    --tv-bg-modal: #f8f1e3;
    --tv-text-primary: #2c2218;
    --tv-text-secondary: #5c4630;
    --tv-border: #d4c3a8;
    --tv-accent: #9c6f2e;
  ```
  - Modal background is the same as canvas (`#f8f1e3`) ❌ **FAIL**: No depth. Should be slightly darker or have visual separator.

#### Hardcoded Colors In Code
- **Badge colors in HandoutsPage (line 69-70):** Hardcoded `red-500`, `amber-500`, `blue-500` ❌ FAIL
- **Character status badge in App.tsx (line 152):** `bg-emerald-500/10 text-emerald-400` ⚠️ DRIFT: Not theme-token
- **Campaign status badge in CampaignHub.tsx (line 107):** `bg-emerald-500/10 text-emerald-400` ⚠️ DRIFT: Same hardcoded green

**Theme Drift Detector Result:** 🔴 HIGH RISK
- Multiple hardcoded semantic colors will fail in light themes
- Dawn especially will show contrast and depth issues

---

## Cross-Cutting Issues

### Issue 1: No Shared Button Recipes

**Evidence:**
- Cancel button in CampaignHub (line 210-213): uses border + hover surface
- Modal footer pattern repeated in multiple files
- No `.tv-button-secondary`, `.tv-button-ghost` CSS classes exist

**Violation:** TOMEVAULT_HOUSESTYLE_PROTOCOL.md § Button And Actions Protocol (rule 6)

**Fix:** Create shared button variant classes in `src/index.css`

### Issue 2: Theme Drift In Hardcoded Colors

**Evidence:**
- HandoutsPage type badges: `bg-red-500/10`, `bg-amber-500/10`, `bg-blue-500/10` (line 69-70)
- Campaign/Character status: `bg-emerald-500/10 text-emerald-400` (repeated in 2+ files)
- Modal overlay: `bg-black/60` hardcoded (CampaignHub line 197)

**Violation:** TOMEVAULT_UI_PROPAGATION_PROTOCOL.md § If colors, borders, contrast, or focus styling changes

**Impact:** In Dawn theme, badges become invisible or unreadable.

**Fix:** Create semantic `--tv-status-success`, `--tv-type-secret`, etc. tokens

### Issue 3: Text Not Limited

**Evidence:**
- Handout preview text: could be long multi-line (line 68 uses `line-clamp-2` but preview could still sprawl)
- Campaign description in list (line 104: `line-clamp-2`) is only applied sometimes
- Helper text like `"Nog geen reveals gedeeld. Deel je eerste reveal om het journal te vullen."` is multi-sentence

**Violation:** TOMEVAULT_HOUSESTYLE_PROTOCOL.md § Text Limitation Protocol

**Fix:** Create text-limit utility classes and apply consistently

### Issue 4: Modal Footer Not Shared

**Evidence:**
- CampaignHub uses inline flex layout (line 207)
- No `.tv-modal-footer` class used
- Confirm/cancel styles not reusable across modals

**Violation:** TOMEVAULT_HOUSESTYLE_PROTOCOL.md § Modal And Sheet Protocol (rule 2)

**Fix:** Extract shared ModalFooter component

### Issue 5: Cancel Button Semantics Ambiguous

**Evidence:**
- CampaignHub cancel: `border border-[var(--tv-border)] hover:bg-[var(--tv-bg-modal)]`
- No clear visual hierarchy between cancel and confirm
- Disabled state on confirm button doesn't use shared pattern

**Violation:** TOMEVAULT_HOUSESTYLE_PROTOCOL.md § Cancel And Confirm Protocol (rule 2)

**Fix:** Enforce secondary button recipe for cancel

---

## Prioritized Fixes

### 🔴 CRITICAL (Blocks Theme Safety)

1. **Create Theme-Aware Semantic Status/Type Tokens**
   - Remove hardcoded `emerald-500`, `red-500`, `amber-500`, `blue-500`
   - Add `--tv-status-active`, `--tv-status-inactive`, `--tv-type-secret`, `--tv-type-map`, `--tv-type-lore`
   - Update HandoutsPage, CampaignHub, App.tsx to use new tokens
   - **Estimated Scope:** 5-10 component updates

2. **Fix Dawn Theme Depth**
   - Update modal surface background to have visual separation from canvas
   - Verify all elements have sufficient contrast in lightest theme
   - **Estimated Scope:** index.css token refinement

### 🟠 HIGH (Breaks Consistency)

3. **Centralize Button Recipes**
   - Create `.tv-button-secondary`, `.tv-button-ghost`, `.tv-button-destructive` in CSS
   - Replace all inline button styles with class-based approach
   - **Estimated Scope:** 3-5 components, add 4 CSS recipes

4. **Create Shared Modal Footer**
   - Extract `<ModalFooter confirm={...} cancel={...} />` component
   - Replace all modal footer patterns
   - **Estimated Scope:** 2 new components (ModalFooter + ModalHeader)

5. **Apply Text Limits**
   - Add utility classes for text truncation and reveal patterns
   - Apply to preview fields, helper text, descriptions
   - **Estimated Scope:** 5-10 component updates

### 🟡 MEDIUM (Polish)

6. **Modal Overlay Consistency**
   - Replace hardcoded `bg-black/60` with token-based overlay
   - **Estimated Scope:** 1 update (CampaignHub line 197)

---

## Surface Coverage Matrix

| Surface | Location | Recipe | Header | Buttons | Text Limits | Theme Safe | Status |
|---------|----------|--------|--------|---------|-------------|-----------|--------|
| Campaign Hub | CampaignHub.tsx | Library | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ DRIFT |
| Handouts | HandoutsPage.tsx | Library | ✅ | ✅ | ✅ | ❌ | ❌ FAIL |
| Modal Footer | CampaignHub.tsx | Modal | N/A | 🔧 | N/A | ✅ | 🔧 DEBT |
| Theme System | index.css | Core | N/A | N/A | N/A | ⚠️ | ⚠️ DRIFT |

---

## Recommended Implementation Order

1. Add shared token definitions for status/type colors (all themes)
2. Add shared CSS button recipes
3. Create ModalFooter and ModalHeader shared components
4. Update CampaignHub and HandoutsPage to use shared components
5. Verify all in Dawn theme
6. Deploy

**Estimated Total Work:** 2-3 focused implementation sessions

---

## Evidence Summary For Other Agents

When referencing this audit:
- **Issue:** Exact file and line number
- **Violation:** Which governance rule
- **Root Cause:** Lack of shared primitive
- **Fix Category:** Token, Component, or Recipe change
- **Impact Zone:** All [list of files affected]

Example:
> **ISSUE:** Modal footer buttons inconsistent  
> **LOCATION:** `src/components/CampaignHub.tsx` lines 207-218  
> **VIOLATION:** TOMEVAULT_HOUSESTYLE_PROTOCOL.md § Modal And Sheet Protocol § Footer actions use the standardized button system (line 2 of that rule)  
> **ROOT CAUSE:** No shared ModalFooter component exists; pattern is repeated inline  
> **FIX:** Create `src/components/ModalFooter.tsx` accepting `confirmLabel`, `onConfirm`, `cancelLabel`, `onCancel` props  
> **IMPACT:** CampaignHub, all future modals
