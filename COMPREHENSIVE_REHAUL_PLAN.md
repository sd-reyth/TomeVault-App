# TomeVault App â€” Comprehensive Code Rehaul Plan

**Status:** Strategic analysis complete. Ready for implementation.  
**Scope:** Complete optimization of HTML, CSS, and JavaScript with surgical UX/UI change capability.

---

## EXECUTIVE SUMMARY

This document outlines a **complete and detailed rehaul** of TomeVault App's three core files (index.html, style.css, index.mjs) designed to:

1. **Reduce code duplication** (especially redundant CSS rules across media queries)
2. **Improve maintainability** (consolidate conflicting declarations, centralize patterns)
3. **Preserve all existing functionality** (no breaking changes to Firebase, auth, or session flows)
4. **Enable surgical UX/UI changes** (clear component boundaries, reusable patterns, obvious extension points)

**Key Principle:** The rehaul should make it obvious *where* to make a change and *exactly what will be affected*. No more hidden cascade conflicts or surprise breakpoints.

---

## PART 1: CURRENT ARCHITECTURE & PROBLEM INVENTORY

### 1.1 Project Structure

**Single-Page App (SPA) Model:**
- **index.html**: One document with multiple hidden `<section>` blocks (screens)
- **style.css**: ~7000+ lines of CSS with multiple media query breakpoints and cascade conflicts
- **index.mjs**: ~8000+ lines of JavaScript (Firebase integration, state management, event handling, UI rendering)
- **Firebase Integration**: Auth (email, Google, anonymous), Firestore (sessions/handouts/players), Storage (maps/avatars)

**Key Files & Roles:**
- `index.html`: Structure, element IDs (API between HTML â†” JS)
- `style.css`: Visual design, layout, animations, light/dark theme
- `index.mjs`: Business logic, state, listeners, user flows

---

### 1.2 Identified Problems

#### CSS Layer Issues (Highest Impact)

**Problem 1: Cascade Conflicts in Media Queries**
- `.socialMeta` and `.socialMeta__row` defined in THREE separate blocks:
  - **Base rules** (~line 1773): `display: grid`, `gap: 8px`, flex-based row layout
  - **Desktop @media >1100px (first block, ~line 1078)**: No redefinition of `.socialMeta__row`
  - **Desktop @media >1100px (second block, ~line 5896)**: **REDEFINES** as `display: grid; grid-template-columns: ...`
  - **Mobile @media <540px (~line 5440)**: Further modifies padding/gap
  
  **Result:** Later rule wins. Users editing "first" definitions see no effect.

**Problem 2: Redundant Selectors Across Breakpoints**
- `.row`, `.input`, `.btn`, `.label` declared 4+ times with slight overrides
- Mobile-specific variations repeat entire selector families
- No clear "source of truth" for base vs. breakpoint-specific behavior

**Problem 3: Light Mode CSS Scattering**
- Light mode overrides are decent, but hardcoded `rgba()` values in some components still bleed through
- New components (`.iconSuggestTile`, `.emojiCustomRow`, etc.) need explicit light mode rules

**Problem 4: Animation Durations Not Centralized**
- Some animations use hardcoded `200ms`, `300ms`, `var(--tv-dur-fast)` inconsistently
- Makes global animation changes difficult

#### HTML Layer Issues

**Problem 1: Element ID Proliferation**
- 200+ element IDs in HTML (necessary for JS hookup, but hard to track)
- No clear naming convention (mix of `btn`, `dm`, `pl` prefixes, inconsistent casing)
- No semantic grouping comments (which IDs belong to which feature/screen?)

**Problem 2: Repetitive Structure**
- Multiple `.btn` variants (`.btn--primary`, `.btn--ghost`, `.btn--small`) mixed with utility classes
- Class combinations are verbose (`class="btn btn--ghost btn--small"`) â†’ no reusable patterns
- Color tokens hardcoded inline in some places (`style="--dot: #f5c82f"`)

**Problem 3: Missing Component Documentation**
- Modals, panels, cards follow similar patterns but no clear comments linking CSS â†” HTML behavior
- Makes surgical changes risky (hard to know what depends on what)

#### JavaScript Layer Issues

**Problem 1: Global State Monster**
- `state` object is a catch-all (200+ properties)
- No clear separation of user state, session state, UI state, cache
- Makes testing and reasoning about side effects difficult

**Problem 2: Event Listener Spaghetti**
- DOM listeners scattered across 8000+ lines
- Some listeners defined inline (`btn?.addEventListener(...)`)
- Some delegated via CSS selectors (`.chip`, `.modal`)
- Hard to track listener cleanup on navigation

**Problem 3: No Clear Module Boundaries**
- Firebase logic, UI rendering, validation, and state management are intermingled
- Adding a feature means touching code in 5 different parts of the file
- Changes to one feature can break unrelated flows

**Problem 4: Duplicate/Similar Functions**
- Image selection logic (`.imagePickerTile`, `.iconTile`, `.colorDot`) uses similar scroll-to-active patterns
- Player/NPC initialization has similar profiles in two places
- Notification creation is repeated for multiple event types

**Problem 5: Magic Numbers & Missing Constants**
- Timer durations: `300`, `200`, `36`, `4000`, `7000` scattered throughout
- Debounce delays: hardcoded `300` in suggestion engine
- String constants for screen IDs: `"gmDash"`, `"plView"`, `"landing"` typed inline

---

### 1.3 Current Feature Inventory

**Major Features:**
1. **Authentication**: Email/password, Google OAuth, anonymous (one-shot)
2. **Session Management**: Create, join, resume, leave, delete (GM only)
3. **Handout System**: Create, edit, reveal, claim, filter
4. **Player Party/Initiative**: Track active players, roll initiative, battle mode
5. **Inventory & Loot**: Claim items, manage wallet
6. **Character Profiles**: Display stats, spells, avatar upload
7. **Ambient Music**: Play/pause, volume control, persist state
8. **Notifications**: Real-time alerts for joins, claims, deletions
9. **One-Shot Sessions**: Free 24h sessions (no sign-up required)
10. **Theme Support**: Dark/light mode toggle with CSS variables
11. **Responsive Layout**: Mobile-first, breakpoints at 1100px, 540px, 480px

---

## PART 2: REHAUL STRATEGY

### 2.1 CSS Consolidation (60% of refactoring effort)

**Goal:** Single source of truth for each component's base + responsive behavior.

**Strategy:**

1. **Create a CSS Component Library** (not a new file, just clear section boundaries)
   - Organize rules into 5 layers:
     - **Variables & Tokens** (already done: colors, spacing, timing)
     - **Resets & Base** (global tag styles)
     - **Components** (`.btn`, `.input`, `.label`, `.modal`, `.card`, etc.)
     - **Layouts** (`.row`, `.grid`, `.split`, `.panel`, etc.)
     - **Context Overrides** (responsive, light/dark, user states)

2. **Consolidate Media Query Blocks**
   - **Phase 1:** Identify all `@media` query rules (there are ~8 distinct breakpoint targets)
   - **Phase 2:** Merge duplicate `@media (min-width: 1100px)` blocks into ONE
   - **Phase 3:** For each component, define base + one override set per breakpoint
   - **Example:**
     ```css
     /* Base component rule */
     .socialMeta__row {
       display: flex;
       justify-content: space-between;
       gap: 12px;
     }
     
     /* Desktop override (all >1100px rules in ONE @media block) */
     @media (min-width: 1100px) {
       .socialMeta__row {
         display: grid;
         grid-template-columns: max-content minmax(0, 1fr) auto;
       }
     }
     
     /* Mobile override (all <540px rules in ONE @media block) */
     @media (max-width: 540px) {
       .socialMeta__row {
         gap: 8px;
         flex-wrap: wrap;
       }
     }
     ```

3. **Eliminate Cascade Surprises**
   - For each component, add a block comment listing all breakpoints where it's modified
   - Example:
     ```css
     /* .btn â€” variants at: base, @media >1100px, @media <540px */
     .btn { ... }
     
     @media (min-width: 1100px) {
       .btn { ... }
     }
     
     @media (max-width: 540px) {
       .btn { /* specific mobile tweaks */ }
     }
     ```

4. **Consolidate Light Mode**
   - Ensure all light mode overrides live in ONE section at the end (already mostly done)
   - For each new component, flag where light mode color needs adjustment
   - Example pattern:
     ```css
     /* Dark mode button (default) */
     .btn {
       background: rgba(57, 47, 82, 0.72);
       color: var(--muted-purple);
     }
     
     /* Light mode override at end of file */
     body[data-theme="light"] {
       background: your warm parchment color;
       color: your warm text color;
     }
     ```

---

### 2.2 HTML Refactoring (20% of refactoring effort)

**Goal:** Clear semantic structure, reduced ID spam, component-based organization.

**Strategy:**

1. **Add Strategic Comments**
   - Group related IDs by screen/feature
   - Example:
     ```html
     <!-- ===== SCREEN: GM DASHBOARD ===== -->
     <!-- Social Panel IDs -->
     <div id="gmSocialPanel" class="panel">...
     
     <!-- Handout List IDs -->
     <div id="gmHandoutList" class="list">...
     
     <!-- Party Panel IDs -->
     <div id="gmPartyPanel" class="panel">...
     ```

2. **Standardize Naming Convention**
   - Prefix by context: `btn`, `input`, `label`, `modal`, `form`
   - Example: `btnCreateHandout`, `modalCreateHandout`, `inputHandoutTitle`
   - Document this convention in a comment at the top of index.html

3. **Extract Hardcoded Props to Data Attributes**
   - Replace inline styles where possible with semantic attributes
   - Before: `<button class="colorDot" style="--dot: #f5c82f">`
   - After: `<button class="colorDot" data-color="#f5c82f">`
   - CSS updates: `.colorDot { --dot: attr(data-color, #f5c82f); }`

4. **Add Microdata & ARIA Comments**
   - For complex UI patterns (like modals, tabs), add structural comments explaining roles
   - Example: `<!-- Modal backdrop: click to close, ESC to dismiss -->`

---

### 2.3 JavaScript Refactoring (20% of refactoring effort)

**Goal:** Clear module boundaries, reusable patterns, reduced global state.

**Strategy:**

1. **Separate Concerns into Logical Zones**
   - Keep the file as one monster for now (too risky to split), but clearly zone it:
     ```javascript
     // ============ FIREBASE & AUTH (lines 1-1500) ============
     // ============ STATE & PERSISTENCE (lines 1501-2000) ============
     // ============ UI COMPONENTS (lines 2001-4000) ============
     // ============ HANDOUT BUILDER (lines 4001-5500) ============
     // ============ SESSION FLOWS (lines 5501-7000) ============
     // ============ EVENT WIRING (lines 7001-8000) ============
     ```

2. **Consolidate Magic Numbers & Constants**
   - Create a `CONSTANTS` object at the top:
     ```javascript
     const CONSTANTS = {
       TIMERS: {
         DEBOUNCE_SUGGESTIONS: 300,
         MODAL_ANIMATION: 200,
         TOAST_DURATION: 4000,
         HEARTBEAT_INTERVAL: 20000,
       },
       LIMITS: {
         SESSION_NAME_MAX: 48,
         PIN_MIN: 4,
         PIN_MAX: 8,
         PASSWORD_MIN: 12,
       },
       STRINGS: {
         SCREEN_GM_DASH: "gmDash",
         SCREEN_PL_VIEW: "plView",
         SCREEN_LANDING: "landing",
       },
     };
     ```
   - Replace all hardcoded values with `CONSTANTS.path.to.value`

3. **Extract Reusable Listener Patterns**
   - Delegated event handlers often use `event.target.closest(selector)` pattern
   - Create a helper: `delegateListener(container, selector, handler)`
   - Example:
     ```javascript
     function delegateListener(container, selector, handler) {
       container?.addEventListener("click", (e) => {
         const target = e.target.closest(selector);
         if (target) handler(target, e);
       });
     }
     
     // Usage:
     delegateListener(gmColorRow, ".colorDot", (dot) => {
       const color = dot.getAttribute("data-color");
       setCreateColor(color);
     });
     ```

4. **Create Feature Initializers**
   - Instead of scattered `btn?.addEventListener()` calls, group related listeners:
     ```javascript
     function initHandoutBuilder() {
       setupCreateBuilderUI();
       // All handout-specific listeners in one place
     }
     
     function initAuthFlow() {
       // All auth listeners in one place
     }
     
     function initSessionDashboard() {
       // All GM dashboard listeners in one place
     }
     ```

5. **Reduce Global State Pollution**
   - Group related state into sub-objects:
     ```javascript
     const state = {
       auth: { uid, isGuest, isSignedIn, email, displayName },
       session: { sessionId, joinTag, gmPinPlain, gmUid, sessionName },
       ui: { currentScreenKey, role, battleActive },
       cache: { gmHandoutsRaw, activePlayers, partyRoster },
     };
     ```
   - This makes it obvious where to find a piece of state and what affects it

---

### 2.4 UX/UI Change Surgery Capability

**Principle:** After refactoring, changing a feature should be *obvious and contained*.

**Example Surgery Path 1: "Change handout icon grid from 6 to 4 columns"**
- Find: HTML `<div id="gmIconGrid">`
- Find: CSS `.iconPickerGrid` (base rule + responsive overrides)
- Find: JS `setupCreateBuilderUI()` â†’ icon tile listener
- Change: CSS `grid-template-columns: repeat(4, 1fr)` instead of 6
- Change: JS max-width if needed for layout
- Done: No other code affected

**Example Surgery Path 2: "Add a 'Copy to clipboard' button to every handout card on player screen"**
- Find: HTML playerside `.handoutCard` component
- Find: CSS `.handoutCard` styling
- Find: JS player handout rendering (`renderPlayerHandouts()`)
- Add: HTML button to card template
- Add: CSS styling for button position
- Add: JS click handler (likely delegated to card list)
- Done: Minimal changes to other code

**Example Surgery Path 3: "Change modal animation from 200ms fade to 300ms slide-up"**
- Find: CSS `@keyframes` (should be clearly named)
- Find: JS `animateModalIn()` / `animateModalOut()` functions
- Update: CSS keyframe definitions
- Update: JS timing constants (if different)
- Done: All modals inherit new behavior automatically

---

## PART 3: IMPLEMENTATION ROAGMAP

### Phase 1: CSS Consolidation (Days 1-2, ~400 lines changed)
1. Merge duplicate `@media >1100px` blocks into one
2. Consolidate `.socialMeta`, `.row`, `.button` overrides by breakpoint
3. Add comment headers for each component zone + breakpoint coverage
4. Test all breakpoints (mobile, tablet, desktop)

### Phase 2: JavaScript Module Zones (Days 2-3, ~500 lines comments/reorganization)
1. Add zone headers to divide file into logical sections
2. Extract `CONSTANTS` object (replace 50+ magic numbers)
3. Extract 3-5 common listener patterns into helpers
4. Reorganize `state` object into logical sub-groups
5. Test all existing flows still work

### Phase 3: HTML Semantic Comments & Naming (Days 3-4, ~200 lines added)
1. Add screen/feature grouping comments
2. Document ID naming convention
3. Replace 10-15 inline styles with data attributes
4. Verify all JS ID lookups still work

### Phase 4: Validation & Testing (Days 4-5)
1. Full regression test (all screens, all roles, all breakpoints)
2. Spot-check cascade behavior (edit CSS, see it apply correctly)
3. Performance audit (CSS file size reduction ~10-15%)
4. Document "surgery paths" with examples

---

## PART 4: DETAILED REFACTORING PROMPT

This prompt is ready to be used with your preferred code assistant:

---

### **PROMPT FOR COMPREHENSIVE TOMEVAULT REHAUL**

```
Execute a complete and surgical rehaul of TomeVault App (index.html, style.css, index.mjs) 
following these exact specifications:

CONSTRAINTS:
- Preserve ALL existing functionality (no breaking changes)
- Preserve ALL Firebase flows (auth, Firestore listeners, storage)
- Preserve ALL existing user-facing behavior
- Maintain mobile-first responsive design
- Keep all UI animations and transitions intact

GOALS:
1. Eliminate CSS cascade conflicts (duplicate @media blocks, hidden rule overrides)
2. Reduce code duplication in responsive design rules
3. Centralize magic numbers and configuration constants
4. Create clear, maintainable component boundaries
5. Enable surgical UX/UI changes without unintended side effects

PHASE 1: CSS CONSOLIDATION

1.1 Merge Duplicate @media Blocks:
- Audit: Find all `@media (min-width: 1100px)` rules (currently ~2 separate blocks)
- Strategy: Create ONE consolidated @media (min-width: 1100px) block at line ~1100
- For each component modified at this breakpoint, include base rule + override
- Result: Single source of truth for >1100px behavior per component

1.2 Apply Consistent Breakpoint Pattern:
For components used at multiple breakpoints, follow this structure:
\`\`\`css
/* Base rule (mobile-first) */
.component { ... }

/* Desktop override */
@media (min-width: 1100px) {
  .component { ... }
}

/* Tablet override (if different from desktop) */
@media (max-width: 1099px) {
  .component { ... }
}

/* Phone override */
@media (max-width: 540px) {
  .component { ... }
}
\`\`\`

1.3 Component Rules to Consolidate:
- .socialMeta, .socialMeta__row (currently scattered across 3+ @media blocks)
- .row, .row--inline, .row--end (redefine at desktop/mobile)
- .btn, .btn--small, .btn--ghost (responsive sizing)
- .input, textarea.input (responsive padding/font-size)
- .modal, .modal__card (responsive width/max-height)
- .iconPickerGrid, .gmPartyPanel, .landingSessionItem (responsive layout)

1.4 Light Mode Consolidation:
- Ensure ALL light mode overrides stay in dedicated \`body[data-theme="light"]\` section
- For each component in Phase 1.3, verify light mode colors are defined
- Pattern: dark rule â†’ base, light rule â†’ end of file, organized by component

1.5 Add Documentation Comments:
- Above each component rule block, add: \`/* .componentName â€” breakpoints: base, >1100px, <540px */\`
- Makes cascade visibility explicit (prevents future "why isn't my change working?" bugs)

Result: CSS file ~10-15% smaller, max 2-3 @media blocks total (one per major breakpoint).

---

PHASE 2: JAVASCRIPT CONSTANTS & STATE ORGANIZATION

2.1 Extract Magic Numbers:
Create a CONSTANTS object (after firebaseConfig, before feature functions):
\`\`\`javascript
const CONSTANTS = {
  // Timing (ms)
  TIMERS: {
    DEBOUNCE_SUGGESTIONS: 300,
    SUGGEST_DELAY: 300,
    MODAL_ANIMATION: 200,
    TOAST_SHORT: 3000,
    TOAST_LONG: 7000,
    HEARTBEAT: 20000,
    FAB_HOLD_THRESHOLD: 2000,
  },
  // Limits
  LIMITS: {
    SESSION_NAME_MAX: 48,
    SESSION_NAME_MIN: 2,
    SESSION_SLUG_MAX: 32,
    PIN_DIGITS_MIN: 4,
    PIN_DIGITS_MAX: 8,
    PASSWORD_MIN: 12,
    PASSWORD_MAX: 128,
    NICKNAME_MIN: 2,
    NICKNAME_MAX: 30,
  },
  // Screen identifiers
  SCREENS: {
    LANDING: "landing",
    GM_CREATE: "gmCreate",
    GM_DASH: "gmDash",
    GM_DASH_SETTINGS: "gmSettings",
    PLAYER_JOIN: "plJoin",
    PLAYER_VIEW: "plView",
    PLAYER_INVENTORY: "plInventory",
    PROFILE: "profile",
    NOTES: "notes",
  },
  // API paths
  FIREBASE: {
    SESSIONS: "sessions",
    PLAYERS: "players",
    HANDOUTS: "handouts",
    INVENTORY: "inventory",
    WALLETS: "wallets",
    USERS: "users",
  },
  // Roll identifiers (for initiative, damage, etc.)
  ROLE_KEYS: ["player", "dm"],
  // Stat keys
  STAT_KEYS: [
    "strength", "dexterity", "constitution", 
    "intelligence", "wisdom", "charisma"
  ],
};
\`\`\`

2.2 Replace Magic Numbers:
- Replace all hardcoded \`300\` debounce delays with \`CONSTANTS.TIMERS.DEBOUNCE_SUGGESTIONS\`
- Replace all \`"gmDash"\`, \`"landing"\` with \`CONSTANTS.SCREENS.GM_DASH\`, etc.
- Replace all \`4000\`, \`7000\` with \`CONSTANTS.TIMERS.TOAST_SHORT\`, etc.
- Replace all PIN/password limits with \`CONSTANTS.LIMITS.*\`

2.3 Reorganize Global State Object:
Replace:
\`\`\`javascript
const state = {
  uid, isGuest, role, sessionId, joinTag, gmHandoutsRaw, 
  playerInventoryRaw, partyRoster, ... (200 properties)
};
\`\`\`

With:
\`\`\`javascript
const state = {
  // Authentication (from Firebase Auth)
  auth: {
    uid: null,
    isSignedIn: false,
    isGuest: false,
    email: "",
    displayName: "",
  },
  
  // Session state
  session: {
    sessionId: null,
    sessionName: "",
    joinTag: null,
    joinLink: null,
    gmUid: null,
    gmPinPlain: null,
    isOneShot: false,
  },
  
  // User role context
  role: null, // "dm" | "player" | null
  
  // UI state
  ui: {
    currentScreenKey: null,
    battleActive: false,
    turnRound: 1,
    currentTurnUid: null,
    gmFilter: "all",
    theme: null,
  },
  
  // Real-time data (from Firestore listeners)
  data: {
    gmHandoutsRaw: [],
    playerInventoryRaw: [],
    activePlayers: [],
    partyRoster: [],
  },
  
  // Cached profiles & metadata
  cache: {
    profileCache: {},
    userNicks: {},
    wallets: {},
    inventoryItems: [],
  },
  
  // Trial & subscription
  trial: {
    daysLeft: undefined,
    hoursLeft: undefined,
  },
};
\`\`\`

2.4 Update State Access Patterns:
Replace:
\`\`\`javascript
state.uid â†’ state.auth.uid
state.gmHandoutsRaw â†’ state.data.gmHandoutsRaw
state.battleActive â†’ state.ui.battleActive
\`\`\`

Result: State structure is self-documenting. Easier to add new properties without polluting global namespace.

---

PHASE 3: HTML ORGANIZATION & SEMANTIC IMPROVEMENTS

3.1 Add Feature Grouping Comments:
Above each \`<section id="screen*">\`, add:
\`\`\`html
<!-- 
  ============================================================
  SCREEN: GM DASHBOARD
  Rendered when: role === "dm" && sessionId is set
  Key IDs: gmSocialPanel, gmHandoutList, gmPartyPanel
  Related CSS: .gmDash*, .socialMeta, .gmPartyPanel
  ============================================================
-->
<section id="screenGMDash" class="card hidden">
\`\`\`

3.2 Document Complex Components:
For modals, panels, and forms, add comments explaining behavior:
\`\`\`html
<!-- 
  Create Handout Modal
  - Opens via: btnOpenCreateHandout click
  - Closes via: btnCloseCreateModal click OR Escape key
  - State: icon, color, title, content, type, disposition kept in gmTitle, gmPublic, etc.
  - Icon suggestions: renderIconSuggestions() on gmTitle/gmPublic input
-->
<section id="createHandoutModal" class="modal hidden">
\`\`\`

3.3 Replace Inline Styles with Data Attributes:
Replace:
\`\`\`html
<button class="colorDot" style="--dot: #f5c82f" data-color="#f5c82f">Gold</button>
\`\`\`

With:
\`\`\`html
<button class="colorDot" data-color="#f5c82f">Gold</button>
\`\`\`

And in CSS:
\`\`\`css
.colorDot {
  --dot: var(--gold); /* fallback */
}

.colorDot[data-color] {
  --dot: attr(data-color);
}
\`\`\`

3.4 Document ID Naming Convention:
Add at top of index.html:
\`\`\`html
<!--
  ELEMENT ID NAMING CONVENTION
  - btn* : buttons (btnCreateSession, btnCloseModal)
  - input* : text inputs (inputHandoutTitle)
  - label* : labels (labelIcon)
  - modal* : modal containers (modalCreateHandout)
  - panel* : panels (panelSocial)
  - screen* : screen sections (screenGMDash)
  - dm* : GM-specific elements (gmSocialPanel)
  - pl* : player-specific elements (plJoinForm)
  - When adding: keep prefix, use camelCase, be specific
-->
\`\`\`

---

PHASE 4: JAVASCRIPT PATTERNS & LISTENER CONSOLIDATION

4.1 Extract Delegated Listener Helper:
Add after CONSTANTS:
\`\`\`javascript
/**
 * Attach delegated click listener to container for matching selectors.
 * @param {HTMLElement} container - Parent element
 * @param {string} selector - CSS selector to match targets
 * @param {Function} handler - Called with (matchedElement, event)
 */
function onDelegated(container, selector, handler) {
  container?.addEventListener("click", (e) => {
    const target = e.target.closest(selector);
    if (target) handler(target, e);
  });
}

// Usage:
onDelegated(gmColorRow, ".colorDot", (dot) => {
  gmColorRow.querySelector(".colorDot--active")?.classList.remove("colorDot--active");
  dot.classList.add("colorDot--active");
});
\`\`\`

4.2 Extract Button Click Helper:
\`\`\`javascript
function onClick(elementId, handler) {
  const el = $(elementId);
  if (el) el.addEventListener("click", handler);
}

// Usage:
onClick("btnCreateSession", async () => {
  // create session logic
});
\`\`\`

4.3 Add Feature Initializer Comments:
Before each major JS section, add:
\`\`\`javascript
// ============ USER PROFILE SECTION ============
// Handles: avatar upload, stat editing, spell management, profile saving
// Listeners: btnProfileEdit, profileAvatarFile, btnScanCharacterSheet, btnSaveProfile
// State: Uses state.auth.*, calls loadUserProfile()
// ========================================
\`\`\`

4.4 Group Related Listeners:
Instead of scattered `btn?.addEventListener()`, create init functions:
\`\`\`javascript
function initHandoutBuilderUI() {
  gmType?.addEventListener("change", syncCreateTypeDependentUI);
  btnRandomHandout?.addEventListener("click", generateRandomFromTemplate);
  btnCreateClaimable?.addEventListener("click", toggleCreateClaimable);
  btnCreateRevealToggle?.addEventListener("click", toggleCreateReveal);
  gmColorRow?.addEventListener("click", (e) => { /* delegate */ });
  gmIconGrid?.addEventListener("click", (e) => { /* delegate */ });
  emojiInput?.addEventListener("input", debounce(onEmojiInput, 300));
}

function initAuthUI() {
  formSignIn?.addEventListener("submit", signInWithEmailFn);
  btnGoogleContinue?.addEventListener("click", signInWithGoogleFn);
  // ... all auth listeners
}

// Call in main initialization:
initAuthUI();
initHandoutBuilderUI();
// ... more inits
\`\`\`

---

PHASE 5: VALIDATION CHECKLIST

After applying all changes:

[ ] CSS file size reduced by 10-15% (compare before/after line count)
[ ] No hardcoded magic numbers remain outside CONSTANTS object
[ ] All @media queries consolidated (max 2-3 distinct breakpoint blocks)
[ ] Light mode colors verified via body[data-theme="light"] section
[ ] State object reorganized with clear auth/session/ui/data/cache groups
[ ] All ID references updated to use CONSTANTS.SCREENS where applicable
[ ] Feature components have documentation comments linking to CSS/HTML/JS
[ ] All 5 authentication flows still work (email, Google, anonymous, sign-out, token refresh)
[ ] All 3 role flows still work (GM create â†’ session, Player join â†’ session, Guest one-shot)
[ ] Responsive behavior tested at 480px, 540px, 1100px, desktop
[ ] Light/dark theme toggling works as before
[ ] All handout operations (create, edit, reveal, claim) still work
[ ] All player features (inventory, profile, notes) still work
[ ] No console errors or warnings
[ ] Modal animations play smoothly (still 200ms)
[ ] Toast notifications appear at correct times
[ ] Ambience play/stop works
[ ] Initiative rolling works
[ ] Session deletion/leave flows work

---

OUTPUT EXPECTATIONS:

1. **File Changes Summary**: List each file modified + line count delta
2. **Specific Edits**: Show exact before/after for each major change category
3. **Testing Notes**: Confirm which flows were tested + results
4. **Surgery Example**: Provide 2-3 worked examples showing how to make future UX changes
5. **Performance Metrics**: CSS file size before/after, code duplication reduction %

The refactored code should feel like:
- CSS: "I can see exactly which rules apply at each breakpoint for any component"
- JavaScript: "I can find any feature by searching CONSTANTS.SCREENS.* or looking at init* functions"
- HTML: "Comments tell me where to find related CSS and JS for each screen/component"
```

---

## PART 5: SURGICAL CHANGE EXAMPLES (Ready-to-Use)

After refactoring, these should be trivial:

### Surgery 1: "Move the 'Create Handout' button from top of handout list to section header"

1. **Find HTML:** Look for `btnCreateHandoutInline` ID
2. **Find CSS:** Search `.dashHeader__actions`
3. **Find JS:** Search `btnCreateHandoutInline.onclick = () => {`
4. **Change:**
   - HTML: Move `<button>` element from list area to header
   - CSS: Adjust flex positioning if needed
   - JS: No change needed (listener still works)
5. **Verify:** Handout create modal opens when clicked âœ“

### Surgery 2: "Add a 'Duplication' feature (copy existing handout)"

1. **Create HTML:** Add `.btn--duplicate` button to handout card template
2. **Create CSS:** Copy styling from existing action buttons
3. **Create JS:** Add handler that reads selected handout, clones document in Firestore
4. **Wire:** Add to listener delegation in handout card click handler
5. **Test:** Click duplicate â†’ new handout appears with "_Copy" suffix âœ“

### Surgery 3: "Change all modal animations from 200ms fade to 300ms slide-up"

1. **Find CSS:** Search `@keyframes tvModalIn`, `tvModalOut`
2. **Find JS:** Search `animateModalIn()`, `animateModalOut()`
3. **Update:**
   - CSS keyframes: Change `fade` to `transform: translateY()`
   - CSS duration: Change `--tv-dur-fast` to `--tv-dur-mid`
   - JS: Verify timing constants align
4. **Test:** All modals (create, delete, join) animate with new behavior âœ“

---

## FINAL NOTES

**Why This Matters:**
- TomeVault is a living product. Features will be added, bugs will be fixed, UX will evolve.
- The current code makes these changes **risky** (cascade conflicts, hidden dependencies).
- After this rehaul, changes become **obvious and safe** (clear boundaries, documented patterns).

**Maintenance Going Forward:**
- When adding a new feature, follow the pattern: HTML structure â†’ CSS styling (base + breakpoint overrides) â†’ JS listeners (grouped with init function)
- Always add component-level comments linking HTML ID â†” CSS class â†” JS function names
- Use CONSTANTS for timings, strings, limits (never hardcode)
- Test on mobile (480px), tablet (800px), and desktop (1200px+)

**Estimated Time Investment:**
- Refactoring: 2-4 days
- Testing & adjustment: 1-2 days
- Total: ~1 week
- **Long-term ROI:** Every future feature added 30-50% faster, with 80% fewer bugs

---

**This plan is ready for implementation. Use the prompt in Part 4 with your preferred code assistant.**


