# TomeVault UI Surface Inventory

## Purpose

This document inventories the known presentation surfaces in TomeVault so future audits and style work do not ignore hidden or low-frequency UI.

The inventory is organized by surface type.

## Primary Shell And Session Entry Surfaces

### App Shell

- `src/App.jsx`
- `src/components/TopBar.jsx`
- `src/components/Sidebar.jsx`
- `src/components/RightSidebar.jsx`

### Entry And Session Access

- `src/components/LandingScreen.jsx`
- `src/components/QRJoinScreen.jsx`
- `src/components/PlaceholderView.jsx`
- `src/components/RuntimeBadge.jsx`

## Primary Screen Views

### Conversation And Writing

- `src/components/ChatView.jsx`
- `src/components/NotesView.jsx`

### Library And Collection Screens

- `src/components/HandoutsView.jsx`
- `src/components/PreparationsView.jsx`

### Ledger And Resource Screens

- `src/components/InventoryView.jsx`
- `src/components/WalletSection.jsx`

### Tactical And Rail Surfaces

- `src/components/RightSidebar.jsx`
- `src/components/EditableStat.jsx`

## Modal, Sheet, And Dialog Surfaces

### Shared Modal Chrome

- `src/components/ModalFrame.jsx`

### Inventory And Resource Flows

- `src/components/AddItemModal.jsx`

### Combat Flows

- `src/components/AddNpcModal.jsx`
- `src/components/DamageModal.jsx`
- `src/components/InitiativeSwapModal.jsx`

### Character And Preparation Flows

- `src/components/CharacterProfileModal.jsx`
- `src/components/PreparationModal.jsx`
- `src/components/PreparationOfferModal.jsx`
- `src/components/PlayerPickerModal.jsx`

### Handout And Lore Flows

- `src/components/HandoutModal.jsx`
- `src/components/SourcelistModal.jsx`

### Session, Sharing, And Settings Flows

- `src/components/SessionManageModal.jsx`
- `src/components/ShareModal.jsx`
- `src/components/SettingsModal.jsx`

## Embedded Utilities And Secondary Panels

### Dice And Shared Rolling

- `src/components/DiceRoller.jsx`
- `src/components/DiceRollerSheet.jsx`

### Session Control And Admin

- `src/components/OwnerAdminPanel.jsx`
- `src/components/TopBar.jsx`

### Ambience And Music Credits

- `src/components/AmbiencePanel.jsx`
- `src/components/SourcelistModal.jsx`

## Confirmation, Alternate, And Hidden States To Audit

These surfaces are easy to miss and must be checked during style work.

### Combat Alternate States

- idle combat state
- paused combat state
- active combat state
- player not in combat state
- initiative entry state
- end-combat confirmation state
- NPC removal and roster-management state

### Library Alternate States

- empty results
- revealed versus hidden handout state
- claimed handout visibility state
- grid versus list view
- secret visibility controls

### Ledger Alternate States

- empty wallet state
- GM party wallet mode
- player wallet mode
- add item flow

### Notes Alternate States

- no notes state
- active note editor state
- delete note action reveal state

### Modal Alternate States

- long form scrolling state
- confirm and cancel footer state
- upload or image-preview state
- error or validation state

### Theme QA States

- darkest theme baseline
- Dawn light-theme verification
- brightness extremes
- focus-ring visibility
- hardcoded dark-surface regression check

## Current Known Screen Recipes By Surface

### Library Recipe

- HandoutsView
- PreparationsView

### Ledger Recipe

- InventoryView
- WalletSection when standalone

### Conversation Or Editor Recipe

- ChatView
- NotesView

### Tactical Rail Recipe

- RightSidebar

### Modal Or Sheet Recipe

- all ModalFrame consumers
- DiceRollerSheet

## Inventory Maintenance Rule

Whenever a new screen, modal, confirm flow, or embedded panel is added:

1. add it here
2. assign a recipe
3. identify hidden states worth auditing
4. reference any shared primitive it depends on
