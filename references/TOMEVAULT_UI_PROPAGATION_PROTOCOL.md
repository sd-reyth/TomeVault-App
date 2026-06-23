# TomeVault UI Propagation Protocol

## Purpose

This document defines how TomeVault's house style must propagate through the codebase.
It exists to prevent the app from drifting into per-screen styling.

If the house style changes, this file defines what else must change with it.

## System Model

TomeVault must be styled in layers.
Changes should propagate from the highest reusable layer downward.

### Layer 1: Tokens

Source of truth:

- `src/index.css`

Owns:

- semantic colors
- global surface recipes
- border recipes
- shadow recipes
- focus rings
- button primitives
- clickable text primitives
- input primitives
- utility geometry helpers
- motion helpers

If this layer changes, every screen using those tokens should update automatically.

### Layer 2: Shell Primitives

Current or target owners:

- `src/App.jsx`
- `src/components/TopBar.jsx`
- `src/components/Sidebar.jsx`
- `src/components/ModalFrame.jsx`
- `src/components/RightSidebar.jsx`

Owns:

- app shell layout
- top bar structure
- navigation rail structure
- modal chrome
- sidebar docking and overlay behavior

If shell geometry changes, every screen rendered inside the shell must still preserve readable content width.

### Layer 3: Screen Recipes

Current or target owners:

- library screens
- ledger screens
- conversation screens
- tactical rail screens
- modal and sheet screens

Current file examples:

- `src/components/HandoutsView.jsx`
- `src/components/InventoryView.jsx`
- `src/components/PreparationsView.jsx`
- `src/components/NotesView.jsx`
- `src/components/RightSidebar.jsx`

Owns:

- header structure
- toolbar order
- search and filter placement
- metric placement
- result region ordering
- footer action usage

### Layer 4: Shared Content Families

Current or target owners:

- `src/components/WalletSection.jsx`
- tactical member cards inside `src/components/RightSidebar.jsx`
- modal form layouts
- list cards and data cards

Owns:

- repeated block structure
- stat alignment
- content density
- action density
- standalone versus embedded modes
- text reveal patterns
- confirm and cancel layout behavior

### Layer 5: Feature-Specific Composition

Current owners:

- screen-level view files
- small modal files
- feature cards

Owns only:

- feature-specific copy
- feature-specific data binding
- feature-specific conditions or badges when those are true domain concepts

This layer may not invent new foundational UI grammar.

## House Style Change Cascade

When a design decision changes, use this cascade.

### If colors, borders, contrast, or focus styling changes

Update first:

- `src/index.css`

Then audit:

- all `.tv-*` utilities
- any component using hardcoded accent or danger classes
- combat condition badges and tactical state chips
- modal footers
- toolbar pills

### If button geometry or action hierarchy changes

Update first:

- shared button classes in `src/index.css`

Then audit:

- `src/components/TopBar.jsx`
- `src/components/Sidebar.jsx`
- `src/components/HandoutsView.jsx`
- `src/components/InventoryView.jsx`
- `src/components/NotesView.jsx`
- all modal footers
- right sidebar utility actions
- confirmation dialogs and end-combat flows

### If clickable text or reveal patterns change

Update first:

- shared text-link or reveal-action primitives in `src/index.css`

Then audit:

- notes empty states
- handout helper copy and secret reveal affordances
- settings helper copy
- modal helper text
- any inline help, info, or advanced-detail control

### If input styling or field density changes

Update first:

- shared input classes in `src/index.css`

Then audit:

- search bars
- filter selects
- modal forms
- inline stat editing fields

### If header composition changes

Update first:

- screen recipe definitions

Then audit:

- `src/components/HandoutsView.jsx`
- `src/components/InventoryView.jsx`
- `src/components/PreparationsView.jsx`
- `src/components/NotesView.jsx`
- any modal with a top action cluster

### If breakpoint or responsive policy changes

Update first:

- shell layout rules in `src/App.jsx`
- sidebar behavior in `src/components/RightSidebar.jsx`

Then audit:

- top bar
- sidebar
- handouts toolbar and filters
- inventory header and embedded wallet sections
- modal footer stacking
- any two-column view

### If tactical card composition changes

Update first:

- shared roster-card recipe or the interim tactical-card block in `src/components/RightSidebar.jsx`

Then audit:

- HP placement
- AC placement
- initiative badge placement
- condition badge placement
- action rail density
- current-turn emphasis

### If modal shell or footer rules change

Update first:

- `src/components/ModalFrame.jsx`

Then audit:

- `src/components/AddItemModal.jsx`
- `src/components/AddNpcModal.jsx`
- `src/components/DamageModal.jsx`
- `src/components/PreparationModal.jsx`
- `src/components/ShareModal.jsx`
- `src/components/SettingsModal.jsx`
- `src/components/SessionManageModal.jsx`
- end-combat and related confirm flows inside `src/components/RightSidebar.jsx`
- all remaining modal and sheet surfaces

### If text economy rules change

Update first:

- screen recipe guidance and shared copy standards

Then audit:

- screen subtitles
- empty states
- helper blocks
- repeated card metadata
- combat explanatory copy
- filter and toolbar labels

## Required Centralization Work

These are the structural changes still needed so house-style changes can propagate cleanly.

### 1. Create A Shared Screen Header Primitive

Need:

- title
- subtitle
- metric slot
- primary action slot
- secondary action slot
- mobile stacking rules

Why:

- Handouts, Inventory, Preparations, and future screens currently solve header composition locally.

### 2. Create A Shared Toolbar And Filter Pattern

Need:

- search row
- sort control
- filter summary or drawer trigger
- view mode toggle slot
- mobile collapse behavior

Why:

- Handouts and similar browse screens still risk toolbar sprawl.

### 3. Split WalletSection Into Standalone And Embedded Modes

Need:

- standalone hero mode
- embedded content-only mode
- shared metric formatting
- shared coin card sizing

Why:

- Inventory should own the screen header metric, while wallet content should not recreate a second screen intro.

### 4. Extract A Shared Tactical Card Primitive

Need:

- identity slot
- stat row
- initiative slot
- condition slot
- action overflow slot
- narrow-width behavior

Why:

- RightSidebar currently carries too much one-off tactical layout logic.

### 5. Centralize Sidebar Docking Rules

Need:

- content minimum width threshold
- overlay threshold
- pinned-mode threshold
- drag width limits

Why:

- The current rail can remain visible too long beside squeezed content.

### 6. Centralize Icon Action Sizes

Need:

- primary icon action
- standard icon action
- micro rail action
- destructive icon action

Why:

- Fixed square actions currently retain space even when content should win.

### 7. Centralize Confirm And Cancel Grammar

Need:

- one cancel style
- one safe confirm style
- one destructive confirm style
- one footer order rule

Why:

- confirmation flows drift quickly and currently reveal inconsistency first.

### 8. Create Shared Text-Reveal And Help Patterns

Need:

- inline info action style
- collapsible details style
- helper text summary rule
- tooltip or popover-like lightweight help rule

Why:

- text sprawl otherwise reappears independently in each feature.

## Current Cross-App Remediation Targets

### Inventory

Files:

- `src/components/InventoryView.jsx`
- `src/components/WalletSection.jsx`

Needed:

- fully embedded wallet mode with no competing hero block
- one connected ledger header recipe
- unified aggregate metric behavior

### Handouts

Files:

- `src/components/HandoutsView.jsx`

Needed:

- secondary utilities collapsed behind a cleaner mobile filter or utility summary
- toolbar density reduction
- library screen recipe enforcement

### Right Sidebar

Files:

- `src/components/RightSidebar.jsx`
- `src/App.jsx`

Needed:

- tactical card primitive
- overflow strategy for narrow widths
- docking threshold correction
- one consistent stat grammar
- consistent confirm and cancel styling for combat-critical flows

### Theme Drift Detection

Files:

- `src/index.css`
- `src/App.jsx`
- `src/components/RightSidebar.jsx`
- primary screen view files

Needed:

- Dawn verification pass
- audit for hardcoded dark-surface backgrounds and borders
- shared middle-canvas and right-rail contrast recipes

### Notes

Files:

- `src/components/NotesView.jsx`

Role:

- reference implementation for a calm connected shell
- should remain aligned if shared header or shell primitives evolve

### Modals

Files:

- `src/components/ModalFrame.jsx`
- modal children

Needed:

- one footer action grammar
- one mobile stacking rule
- one field section grammar

## Change Protocol For Future UI Tasks

When a style change request arrives:

1. classify the change by layer
2. update the highest reusable owner first
3. consult every dependent file listed in this protocol
4. update screens that consume the changed primitive
5. add new dependencies here if the system expands
6. validate the touched slice and the shared-style fallout

## Definition Of Done For House Style Work

A house-style task is not done unless:

1. the local screen looks correct
2. the change lives in the right layer
3. sibling screens using the same pattern were checked
4. new one-off style duplication was not introduced
5. the relevant protocol files still describe reality
