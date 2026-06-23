# TomeVault Refactoring Roadmap

## Overview

This document maps which components need changes based on the evidence-based audit (`TOMEVAULT_IMPLEMENTATION_AUDIT.md`), in priority order.

All changes tie to specific governance violations with line numbers and required fixes.

---

## Phase 1: Foundation (Critical Path)

### Task 1.1: Update CampaignHub Modal Footer

**File:** `src/components/CampaignHub.tsx`  
**Violations:**
- Line 197: `bg-black/60` hardcoded overlay ❌ Should use token
- Line 210-213: Cancel button uses inline border style ⚠️ Should use `.tv-button-secondary`
- Line 215-216: Confirm button uses inline style ⚠️ Should use `.tv-button-primary`

**Changes:**
```tsx
// BEFORE (line 197)
<div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">

// AFTER
<div className="fixed inset-0 bg-[color:var(--tv-overlay)] flex items-center justify-center p-4">
// Note: Add --tv-overlay token to index.css if missing

// BEFORE (line 210-213)
<button className="flex-1 py-3 rounded-2xl border border-[var(--tv-border)] hover:bg-[var(--tv-bg-modal)]">

// AFTER
<button className="tv-button-secondary flex-1 py-3 rounded-2xl">

// BEFORE (line 215-216)
<button className="flex-1 py-3 rounded-2xl bg-[var(--tv-accent)] text-white disabled:opacity-50">

// AFTER
<button className="tv-button-primary flex-1 py-3 rounded-2xl">
```

**Replace entire footer section (lines 207-218) with:**
```tsx
import ModalFooter from './ModalFooter'

// Inside render, replace lines 207-218:
<ModalFooter
  cancelLabel="Annuleren"
  confirmLabel="Maak Campaign"
  onCancel={() => setShowCreateModal(false)}
  onConfirm={createCampaign}
  confirmDisabled={!newCampaignName.trim()}
/>
```

**Test Criteria:**
- ✅ Modal closes on cancel
- ✅ Campaign is created on confirm
- ✅ Cancel and confirm buttons render with correct styles
- ✅ Modal overlay is visible in all 5 themes
- ✅ In Dawn theme, modal has depth against canvas

**Estimated Time:** 15 minutes

---

### Task 1.2: Fix HandoutsPage Type Badges (Theme Safety)

**File:** `src/components/HandoutsPage.tsx`  
**Violations:**
- Line 69-70: Hardcoded type colors `red-500`, `amber-500`, `blue-500` ❌ Bypass theme system
- Will fail in Dawn light theme (colors become invisible/clash)

**Current Code (line 69-70):**
```tsx
const typeBadgeColor = {
  'Geheim': 'bg-red-500/10 text-red-400',
  'Kaart': 'bg-amber-500/10 text-amber-400',
  'Verhaal': 'bg-blue-500/10 text-blue-400'
}
```

**Required Changes:**
```tsx
// BEFORE
<span className={`px-2 py-1 rounded-lg text-xs font-medium ${typeBadgeColor[handout.type]}`}>

// AFTER
const badgeClass = {
  'Geheim': 'badge-type-secret',
  'Kaart': 'badge-type-map',
  'Verhaal': 'badge-type-lore'
}

<span className={`px-2 py-1 rounded-lg text-xs font-medium ${badgeClass[handout.type]}`}>
```

**Test Criteria:**
- ✅ Badges render correctly in all 5 themes
- ✅ In Dawn theme, badges have readable contrast
- ✅ Type colors are consistent across app (if used in other components)

**Estimated Time:** 10 minutes

---

### Task 1.3: Fix Character Status Badges in App.tsx

**File:** `src/App.jsx`  
**Violations:**
- Line 152 (approx): `bg-emerald-500/10 text-emerald-400` hardcoded ❌ Bypasses status token system

**Required Changes:**
```tsx
// BEFORE
<div className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg text-xs font-medium">

// AFTER
<div className="badge-status-active px-2 py-1 rounded-lg text-xs font-medium">
  Active
</div>
```

**Test Criteria:**
- ✅ Character status badges use token-based colors
- ✅ Works in all 5 themes
- ✅ In light themes, status is still visible

**Estimated Time:** 10 minutes

---

## Phase 2: Consistency (Parallel Work)

### Task 2.1: Standardize ScreenHeader Usage (All Primary Views)

**Files to Update:**
- `src/components/CampaignHub.tsx` (line 74-81)
- `src/components/HandoutsPage.tsx` (line 26-28)
- Any other primary screen headers

**Pattern to Extract:**
Each screen currently uses:
```tsx
<h1 className="text-4xl font-fantasy tracking-tight">Title</h1>
<p className="text-[var(--tv-text-secondary)] mt-1">Subtitle</p>
<button>Primary Action</button>
```

**Replace With:**
```tsx
import ScreenHeader from './ScreenHeader'

<ScreenHeader
  title="Oude Geschriften"
  subtitle="Documenten, kaarten en magische voorwerpen ontdekt tijdens de reis."
  primaryAction={{
    label: 'Nieuw Handout',
    onClick: () => setShowCreateModal(true)
  }}
/>
```

**Test Criteria:**
- ✅ All primary views use shared ScreenHeader component
- ✅ Header scaling is consistent (text-4xl on desktop, text-3xl on mobile)
- ✅ Subtitle alignment matches across screens
- ✅ Primary action button placement consistent
- ✅ Mobile responsive stacking works

**Estimated Time:** 30 minutes (all screens)

---

### Task 2.2: Create TextReveal for Repeated Helper Text

**Files to Update:**
- `src/components/CampaignHub.tsx` (line 174-175 empty state)
- Any component with long description text

**Pattern to Extract:**
Before: Repeated full helper text inline
```tsx
<p>"Nog geen reveals gedeeld. Deel je eerste reveal om het journal te vullen."</p>
```

**Replace With:**
```tsx
import TextReveal from './TextReveal'

<TextReveal
  summary="Nog geen reveals gedeeld."
  details="Deel je eerste reveal om het journal te vullen en je spelers op de hoogte te houden van nieuwe ontdekkingen."
/>
```

**Test Criteria:**
- ✅ Summary is shown by default (short, no scrolling needed)
- ✅ Clicking "Meer informatie" reveals full text
- ✅ Mobile responsive layout
- ✅ Reveal state doesn't persist on page reload (appropriate)

**Estimated Time:** 20 minutes

---

## Phase 3: Audit & Validation

### Task 3.1: Run Full Surface Audit

Using `TOMEVAULT_UI_AUDIT_CHECKLIST.md`, audit each surface in `TOMEVAULT_UI_SURFACE_INVENTORY.md`:

**Quick Checklist Per Surface:**
1. ✅ Header uses `.font-fantasy` and tokens
2. ✅ Primary action uses `.tv-button-primary`
3. ✅ Cancel uses `.tv-button-secondary`
4. ✅ Confirm/destructive uses `.tv-button-destructive`
5. ✅ No hardcoded palette colors
6. ✅ All text limits applied (`line-clamp-*`)
7. ✅ Modal footer uses `<ModalFooter />`
8. ✅ Works in Dawn theme (text readable, depth preserved)

**Estimated Time:** 2-3 hours (all 30+ surfaces)

---

### Task 3.2: Deploy & Monitor

**Pre-Deploy Checklist:**
- [ ] All components use shared button recipes
- [ ] No hardcoded colors remain in feature code
- [ ] All modals use ModalFooter
- [ ] ScreenHeader used consistently
- [ ] Dawn theme verified visually

**Deploy Command:**
```bash
npm run build
firebase deploy --only hosting
```

**Post-Deploy Validation (1 hour):**
- [ ] Check all screens render correctly
- [ ] Test modal confirm/cancel flow
- [ ] Verify Dawn theme appearance
- [ ] Check mobile responsiveness
- [ ] Monitor console for errors

---

## File Dependency Graph

```
index.css (CSS recipes)
  ↓
ModalFooter.tsx (uses .tv-button-primary, .tv-button-secondary, .tv-button-destructive)
ScreenHeader.tsx (uses .tv-button-primary, .font-fantasy tokens)
TextReveal.tsx (uses .text-reveal-* utilities)
  ↓
CampaignHub.tsx (uses ModalFooter, needs status token fixes)
HandoutsPage.tsx (uses ScreenHeader, needs type badge token fixes)
App.jsx (needs status token fixes)
```

---

## Evidence Traceback Template

Use this template when referencing why a change is needed:

```
**CHANGE:** Replace line XX with token-based class  
**AUDIT ISSUE:** FAIL in TOMEVAULT_IMPLEMENTATION_AUDIT.md  
**ROOT CAUSE:** Hardcoded color bypasses theme system  
**GOVERNANCE:** TOMEVAULT_HOUSESTYLE_PROTOCOL.md § Token Protocol (rule X)  
**EVIDENCE:** In Dawn theme, color becomes [invisible/unreadable/clashes]  
**FIX:** Use `.badge-type-secret` (defined in index.css) instead
```

---

## Recommended Execution Order

1. **Start with Phase 1** (foundation fixes are blockers)
   - Task 1.1: ModalFooter usage
   - Task 1.2: Type badge tokens
   - Task 1.3: Status token fixes

2. **Then Phase 2** (consistency improvements)
   - Task 2.1: ScreenHeader rollout
   - Task 2.2: TextReveal for descriptions

3. **Finally Phase 3** (audit & deploy)
   - Task 3.1: Full surface audit
   - Task 3.2: Deploy when audit passes

**Total Estimated Time:** 4-5 hours of focused implementation

---

## Success Criteria

✅ All primary screens use ScreenHeader  
✅ All modals use ModalFooter  
✅ No hardcoded colors remain in feature code  
✅ All 30+ surfaces pass AUDIT_CHECKLIST  
✅ Dawn theme verified for contrast and depth  
✅ Governance files remain source of truth
