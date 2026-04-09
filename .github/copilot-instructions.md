# TomeVault UX Contract

Use these instructions for all future feature work in TomeVault App. This document is the authoritative developer reference — all values, class names, and function names are sourced directly from the live codebase (`style.css`, `index.mjs`).

---

## Product Vision

TomeVault is a **premium digital tabletop companion**: cinematic, readable, tactile, and fast. The aesthetic is a living fantasy artefact — deep midnight void and ancient parchment, illuminated by antique gold. Every interaction should feel intentional, weighty, and polished.

Preserve existing Firebase and app flow behavior. Every new feature must match the same visual language, interaction hierarchy, and animation system already in place.

---

## 1. CSS Token System (Source of Truth)

**Always use existing CSS variables from `style.css`. Never invent new hex codes, rgba values, or durations.**
When in doubt, search the `:root` block in `style.css` before writing any color, shadow, or timing value.

### 1a. Color Tokens

| Token | Dark Mode Value | Purpose |
|-------|----------------|---------|
| `--bg` | `#0e0614` | Page background (deep void) |
| `--bg2` | `#160c2a` | Slightly lighter background layer |
| `--surface` | `#1e1040` | Panels, drawers, primary surfaces |
| `--surface-2` | `#271454` | Raised surface variant |
| `--surface-3` | `#130a28` | Recessed/dark surface variant |
| `--card` | `#1e1040` | Card backgrounds (same as `--surface`) |
| `--text` | `#f4e4bc` | Primary body text (warm parchment) |
| `--muted` | `rgba(196,180,148,.7)` | Secondary/supporting text (70% parchment) |
| `--text-on-gold` | `#1a1206` | Text placed directly on gold backgrounds |
| `--gold` | `#d4af37` | Primary accent (antique gold) |
| `--gold-2` | `#a68521` | Muted gold variant (shadows, gradients) |
| `--amethyst` | `#3b1b5e` | Purple tone (scrollbar thumb, surfaces) |
| `--amethyst-light` | `#5c2c91` | Lighter purple (hover states) |
| `--crimson` | `#8a1c1c` | Red accent surfacing |
| `--danger` | `#dc2f2f` | Error / destructive action red |
| `--warning` | `#ff8b1a` | Cautionary orange |
| `--warning-light` | `#ffb870` | Light orange (warning text) |
| `--steel` | `#94a9c7` | Cool-blue inventory accent |
| `--muted-purple` | `#c8b8f0` | Light purple tone |
| `--line` | `rgba(92,44,145,.28)` | Standard border (amethyst tint) |
| `--line-strong` | `rgba(212,175,55,.5)` | Strong/gold-tinted border |
| `--card-border` | `rgba(255,255,255,0.08)` | Card/panel glass highlight border |

### 1b. Gold Scale (Use for Tints, Hovers, Glows)

These are pre-built alpha steps — always use these instead of inventing a one-off gold rgba:

| Token | Value | Use |
|-------|-------|-----|
| `--gold-tint` | `rgba(212,175,55,.06)` | Subtle background wash |
| `--gold-border` | `rgba(212,175,55,.18)` | Default gold-tinted border |
| `--gold-hover` | `rgba(212,175,55,.28)` | Hover state border/background |
| `--gold-strong` | `rgba(212,175,55,.42)` | Active/focus gold highlight |
| `--gold-gradient` | `linear-gradient(180deg, var(--gold), var(--gold-2))` | Primary button fill |
| `--gold-shadow` | `0 2px 10px rgba(212,175,55,.18)` | Soft gold glow |
| `--screen-gold-border` | `rgba(212,175,55,.48)` | Screen section border |
| `--screen-gold-glow` | `rgba(212,175,55,.14)` | Screen section glow pseudo-element |

### 1c. Shadow Scale

| Token | Value | Use |
|-------|-------|-----|
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,.12)` | Subtle card lift |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,.15)` | Panels, list items |
| `--shadow-lg` | `0 12px 36px rgba(0,0,0,.2)` | Drawers, overlays |
| `--shadow-xl` | `0 26px 70px rgba(0,0,0,.5)` | Modals (deep atmosphere) |

### 1d. Spacing Scale (8-Point Grid — Strictly Enforced)

**ALL `padding`, `margin`, `gap`, `top/right/bottom/left` values MUST use one of these tokens or a multiple of 4/8. No arbitrary pixel values.**

| Token | Value |
|-------|-------|
| `--spacing-xs` | `4px` |
| `--spacing-sm` | `8px` |
| `--spacing-md` | `12px` |
| `--spacing-lg` | `16px` |
| `--spacing-xl` | `20px` |
| `--spacing-2xl` | `24px` |

### 1e. Border Radius (Strict — All 12px)

All interactive elements use the same radius family. **Never use arbitrary values like `4px`, `6px`, or `8px`.**

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | `12px` | Buttons, inputs, small cards |
| `--radius-md` | `12px` | Standard cards, panels |
| `--radius-lg` | `12px` | Modals, drawers |
| `--radius-xl` | `12px` | Full-bleed containers |
| `--radius-full` | `999px` | Pills, circular avatars/icons |

### 1f. Typography Scale

| Token | Value | Use |
|-------|-------|-----|
| `--text-xs` | `12px` | Helper text, badges |
| `--text-sm` | `14px` | Secondary labels, small buttons |
| `--text-base` | `15px` | Default body/UI text |
| `--text-lg` | `16px` | Emphasized body, button labels |
| `--text-xl` | `18px` | Subheadings |
| `--text-2xl` | `20px` | Section headings |
| `--text-3xl` | `24px` | Page headings |
| `--text-4xl` | `32px` | Hero/display headings |

### 1g. Icon Button Sizing

| Token | Value |
|-------|-------|
| `--icon-btn-sm` | `40px` (`.iconBtn`) |
| `--icon-btn-md` | `44px` (`.iconBtnLarge`) |
| `--icon-btn-lg` | `48px` (speed-dial, FAB) |

---

## 2. Typography System

**Fonts are loaded via Google Fonts. No other font families are permitted.**

| Role | Font | Weights | Use |
|------|------|---------|-----|
| Headings / Titles | **Cinzel** (serif) | 400, 600, 700, 900 | h1–h4, brand title, section headers, profile names |
| Body / UI | **Open Sans** (sans-serif) | 400, 500, 600, 700 | All other text: labels, buttons, inputs, body copy |

CSS variables: `--font-heading: 'Cinzel', 'Georgia', serif` and `--font-ui: 'Open Sans', system-ui, sans-serif`.

**Rules:**
- Section or panel titles → `font-family: var(--font-heading)`, gold color
- All UI controls, form labels, button text → `font-family: var(--font-ui)`
- Never use a system font as a heading font — Cinzel is always available
- Heading text should be bold (`font-weight: 700`) and use `var(--gold)` for visual hierarchy
- Body/secondary text must be muted: `var(--muted)` in dark mode, `rgba(74,62,48,.65)` in light mode

### Brand Wordmark Consistency (`TomeVault`)

When the brand wordmark is shown, it must use one canonical treatment everywhere:
- Font family: `var(--font-heading)` (Cinzel)
- Base color: `var(--text)`
- Emphasis letters `T` and `V`: `var(--gold)`
- Subtle glow/highlight only via existing gold tokens (`--gold-shadow`, `--gold-tint`, `--gold-border`) or existing brand-title classes
- Do not introduce alternate brand colors, one-off glows, or duplicate wordmark class variants with different styling

If a second wordmark variant exists, consolidate to the canonical style rather than creating a third variation.

---

## 3. Motion System

### Animation Tokens

| Token | Value | Use |
|-------|-------|-----|
| `--tv-ease` | `cubic-bezier(.22, 1, .36, 1)` | Standard smooth deceleration — use for everything |
| `--tv-ease-bounce` | `cubic-bezier(.34, 1.56, .64, 1)` | Playful overshoot — use sparingly, atmosphere only |
| `--tv-dur-fast` | `.2s` | Micro-interactions |
| `--tv-dur-mid` | `.3s` | Standard transitions |
| `--tv-dur-slow` | `.36s` | Dramatic entrances/exits |

### Animation Tiers

**Micro** (`--tv-dur-fast` / `.2s`): Button press, hover, toggle, copy confirmation. Always `--tv-ease`.

**Standard** (`--tv-dur-mid` / `.3s`): Screen swaps (`.screen-enter` keyframe), list item entry, chip/filter toggles, panel reveals. Always `--tv-ease`.

**Dramatic** (`--tv-dur-slow` / `.36s`): Modal entrance/exit (`.modal--entering` / `.modal--leaving`), drawer slide-in. Modals MUST scale from `0.95 → 1.0` while fading `0 → 1`. Exit reverses both.

**Cinematic**: Reserved for rare atmosphere moments only (ambient background glow, tavern overlay). Never use for core task flows.

### Rules
- **Never use `linear`** easing. Always `--tv-ease` or `--tv-ease-bounce`.
- **Never hardcode durations** — use `var(--tv-dur-fast/mid/slow)`.
- **Always wrap** new animations in `@media (prefers-reduced-motion: reduce) { animation: none; transition: none; }`.
- Use `--tv-ease-bounce` only for decorative moments — never on a critical flow.
- Avoid bounce/spring on modals, toasts, and form validation — those must be snappy (`--tv-ease`).
- Normalize inconsistent existing motion when touched: align easing, duration tier, and enter/exit behavior to this section.
- Every primary interactive surface should have at least one subtle motion affordance (hover/press/enter), but avoid decorative over-animation.

---

## 4. Button Component Catalog

Every button in TomeVault maps to one of these CSS classes. **Never create a custom button from scratch.**

### Primary Action — `.btn`
- Background: `var(--gold-gradient)` (gold top-to-bottom gradient)
- Text color: `var(--text-on-gold)` (`#1a1206` dark espresso)
- Border: none (transparent)
- Min-height: `44px`, padding: `10px 18px`
- Border-radius: `var(--radius-sm)` (12px)
- Font: `var(--font-ui)`, weight 700, `var(--text-base)`
- Shadow: `0 4px 0 rgba(20,12,1,.88), 0 8px 20px rgba(10,8,18,.34)` (3D depth)
- `:hover` → `filter: brightness(1.06)` + deeper shadow
- `:active` → `transform: translateY(3px)`, shadow flattens to `0 1px`
- `:disabled` → `opacity: .45`, `cursor: not-allowed`
- Used for: the single primary action per screen/modal (Save, Create, Submit, Join)

### Secondary Action — `.btn--ghost`
- Background: `rgba(57,47,82,.7)` (muted purple)
- Text color: `var(--text)`
- Border: `1px solid var(--line)`
- Min-height: `44px`, padding: `10px 18px`
- Shadow: `0 4px 0 rgba(0,0,0,.55)` (dark depth)
- `:hover` → gold border `var(--line-strong)` + gold tint shadow
- `:active` → `transform: translateY(4px)`, shadow collapses to zero
- Used for: Cancel, Go Back, secondary options

### Destructive — `.btn--danger`
- Border + text: `var(--danger)` (`#dc2f2f`)
- Background: transparent
- Shadow: `0 4px 0 rgba(100,15,15,.7)`
- Used for: irreversible delete/remove actions (show with confirmation)

### Destructive Fill — `.btn--danger-fill`
- Background: `var(--danger)`, text: white
- Shadow: `0 5px 0 #7a1010`
- Used for: final confirmed delete action within a confirmation modal

### Warning — `.btn--warning`
- Border + text: `var(--warning)` / `var(--warning-light)`
- Shadow: `0 4px 0 rgba(140,70,0,.6)`
- Used for: risky but reversible actions

### Size Variants
| Class | Padding | Min-height | Font |
|-------|---------|------------|------|
| (default) | `10px 18px` | `44px` | `--text-base` (15px) |
| `.btn--small` | `8px 14px` | `40px` | `--text-sm` (14px) |

### Layout Variants
- `.btn--full` — `display: block; width: 100%` — use in modals and stacked mobile forms
- `.btn--link` — transparent, text-only, underline on hover — for tertiary actions like "Forgot password?"

### Icon Buttons (Utility)
- `.iconBtn` — `40px` min-height square, `rgba(57,47,82,.72)` bg, `var(--line)` border, 3D shadow. Use for inline edit, copy, toggle icons.
- `.iconBtnLarge` — `44px` variant of `.iconBtn`
- `.closeIconBtn` — inline-flex icon-only close button (no background, icon only)

### Button Placement Rules
- **Modals/Forms:** Buttons always grouped at the bottom in a flex row. Primary RIGHT, Cancel (`.btn--ghost`) LEFT.
- **Desktop:** Buttons hug content (`auto` width). **Mobile:** `.btn--full` for primary and secondary actions.
- Never place a solo button floating in a random corner unless it is a designated FAB.
- Every screen has exactly **one** `.btn` (primary). All others must be `.btn--ghost`, `.btn--danger`, or icon variants.

---

## 5. Modal System

### The One Rule
**Always use `setModalVisibility(el, isOpen)` from `index.mjs` to open and close modals.** Never toggle `.hidden` directly on a modal element. This function manages the animation lifecycle (`.modal--entering` / `.modal--leaving` classes and timing).

### Standard Modal Structure
```html
<div class="modal hidden" id="myModal">
  <div class="modal__card">
    <div class="modal__top">
      <!-- Sticky header: title + close button -->
    </div>
    <!-- Scrollable content -->
    <div class="row">
      <button class="btn--ghost">Cancel</button>
      <button class="btn">Primary Action</button>
    </div>
  </div>
</div>
```

- Modal container alignment: `place-items: center` (horizontally + vertically centered)
- Max-width: `min(760px, 96vw)`, max-height: `calc(100dvh - 40px)`
- Backdrop: `rgba(9,7,13,.74)` + `backdrop-filter: blur(4px)`
- Card background: `rgba(16,8,34,.88)` + `backdrop-filter: blur(16px)`
- Card border: `var(--card-border)` (`rgba(255,255,255,0.08)`)
- Card shadow: `var(--shadow-xl)`
- Entry animation: scale `0.95 → 1.0` + fade, `--tv-dur-slow`
- Exit animation: reverse, `--tv-dur-mid`
- `.modal__top` is `position: sticky; top: 0` — always use it for the title/close row

### Modal Type Catalog

| Type | Element | Use |
|------|---------|-----|
| Standard | `#modal` (shared global) | Handout details, confirmations, info |
| Create/Edit | `#createHandoutModal`, `#createInventoryModal` | Form-heavy creation flows |
| Blocking | `.blockingModal` | System messages, non-dismissible confirmations (z: 10000) |
| Settings Drawer | `.settings-drawer` | Right-side slide-in panel (z: 110) |
| Bottom Sheet | `.credits-modal` | Upward sheet from bottom edge (mobile-native feel) |
| Image Lightbox | `.lightboxModal` | Full-screen image viewer (z: 10001, highest) |

---

## 6. Screen Navigation System

### The One Rule
**Always use `showOnly(screenKey)` from `index.mjs` to navigate between screens.** Never manually toggle `.hidden` on screen elements. `showOnly` manages the `.screen-enter` animation class and ensures only one screen is visible.

### All Screen IDs

| Screen ID | Role | Purpose |
|-----------|------|---------|
| `#screenLanding` | Both | Auth + home dashboard (post-login) |
| `#screenGMCreate` | GM | Session creation form |
| `#screenGMDash` | GM | Main GM dashboard (handouts, party, atmosphere) |
| `#screenPlayerView` | Player | Live player view (party + revealed handouts) |
| `#screenInventory` | Both | Inventory management (party treasury + per-player items) |
| `#screenProfile` | Both | User profile (character stats, quick stats, appearance) |
| `#screenSettings` | Both | App settings (theme, account, destructive actions) |
| `#screenSettingsProfile` | Both | Profile customization within settings |

**Screen entry animation:** JS adds `.screen-enter` class on reveal → CSS `screenEnter` keyframe plays: `opacity 0→1` + `translateY 6px→0` at `--tv-dur-mid`.

---

## 7. Layout Component Catalog

Use these existing classes. Never create new one-off layout wrappers without good reason.

| Class | Purpose |
|-------|---------|
| `.panel` | Content container with padding, border (`var(--card-border)`), and shadow |
| `.card` | Elevated content block — same as `.panel` with slight background tint |
| `.item` | Row-format list entry (handout card, player row, inventory entry) |
| `.list` | Flex column container for `.item` children |
| `.chip` | Filter/toggle button (e.g., handout type filters) |
| `.pill` | Status badge (online count, nugget balance, labels) |
| `.formGrid` | Grid layout for aligned form fields (label + input pairs) |
| `.row` | Horizontal flex row for button groups or paired elements |
| `.railTabs` | Desktop tab container for stacked rail surfaces (e.g., Party/Chat); mobile uses stacked panels |

**Elevation rules (dark mode):**
- Cards/panels: `border: 1px solid var(--card-border)` + `var(--shadow-md)`
- Floating elements (modals, dropdowns): `var(--shadow-xl)`

**Elevation rules (light mode):**
- Cards/panels: `border: 1px solid rgba(120,100,60,.12)` + `box-shadow: 0 4px 16px rgba(120,90,40,.09)`
- Floating elements: `box-shadow: 0 4px 24px rgba(120,90,40,.14)`

---

## 8. Navigation Shell Components

| Element | Class/ID | Notes |
|---------|----------|-------|
| Sticky top bar | `.topbar` / `#topBar` | Hidden on landing screen, shown after auth |
| Mobile tab bar | `.bottom-bar` | Fixed, shows screen navigation icons |
| GM create FAB | `.gm-fab` | 56px circular, gold gradient, animated gold pulse glow |
| Hamburger menu | `.settings-fab` | Floating action button trigger |
| Speed-dial entries | `.speed-dial-btn` | Menu items expanding from hamburger; `42px` min-height |
| Settings variant | `.speed-dial-btn--settings` | Gold gradient, serif font, uppercase label |
| Rail tab bar | `.railTabs__bar` + `.railTabs__tab` | Desktop-only right-rail tab switcher for Party/Chat panels |

The `.gm-fab` uses `gmFabGoldPulse` keyframe (2.2s infinite) for persistent atmosphere pulse — never disable this.

---

## 9. Feedback & Toast System

### Toast Functions (from `index.mjs`)

**Always use these — never create custom notification elements.**

```javascript
// Ephemeral status feedback
showToast(message, type, timeoutMs)
// type: "info" (default) | "success" | "error"
// timeoutMs: default 2600ms

// Reversible action with undo
showUndoToast(message, onConfirm, timeoutMs)
// timeoutMs: default 5000ms
```

Toasts use the `toast-in` / `toast-out` CSS keyframes (200ms `--tv-ease`), stack in `.toastStack` (fixed bottom-right), and automatically dismiss.

### UI Timers (from `index.mjs` — `UI_TIMERS` constants)

**Never hardcode delay values in JS. Use these constants.**

| Constant | Value | Use |
|----------|-------|-----|
| `COPY_STATE_MS` | `360ms` | "Copied!" button state duration |
| `BUTTON_FLASH_MS` | `1800ms` | Success button flash |
| `MODAL_LEAVE_MS` | `420ms` | Wait after modal exit animation before DOM cleanup |
| `ROLL_ANIM_MS` | `500ms` | Dice roll animation duration |
| `TOAST_SHORT` | `3000ms` | Quick informational feedback |
| `TOAST_MED` | `5000ms` | Standard toast |
| `TOAST_LONG` | `7000ms` | Important persistent message |
| `ICON_SUGGEST_DEBOUNCE_MS` | `300ms` | Icon search debounce |
| `GM_SEARCH_DEBOUNCE_MS` | `250ms` | GM handout search debounce |

---

## 10. Keyboard & Accessibility

- **Focus ring:** All interactive elements MUST use `outline: 2px solid var(--gold); outline-offset: 2px` on `:focus-visible`. Never hide focus rings. Never use a custom non-gold focus style.
- Every modal must trap focus while open. Use `tab` to cycle through all interactive elements; `Escape` must close dismissible modals.
- All icon-only buttons must have an `aria-label`.
- Color contrast: headings (`var(--gold)`) on dark background passes WCAG AA. Muted text (`var(--muted)`) is intentionally de-emphasized secondary — ensure primary text always uses `var(--text)` for readability.
- Include `aria-live` regions for toasts and async state changes.

---

## 11. Scrollbar System

**All new scrollable containers must apply custom scrollbar styling. No default browser scrollbars.**

**Dark Mode (default):**
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--amethyst); border-radius: var(--radius-md); }
::-webkit-scrollbar-thumb:hover { background: var(--amethyst-light); }
/* Firefox: */
scrollbar-width: thin;
scrollbar-color: var(--amethyst) var(--bg);
```

**Light Mode (add to light mode section in `style.css`):**
```css
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: rgba(160,130,70,.30); }
::-webkit-scrollbar-thumb:hover { background: rgba(160,130,70,.55); }
```

---

## 12. Light Mode Architecture — "Illuminated Manuscript"

Light mode is the warm-parchment daylight face of TomeVault. Think sunlit scholar's study, aged paper, gold leaf. **Never** cold whites, lavenders, or sterile grays.

### Architecture Rules
- Activated via `body[data-theme="light"]` (set by JS in `index.mjs`).
- **All light mode CSS lives in one organized block at the END of `style.css`** under the `LIGHT MODE — Illuminated Manuscript` heading.
- **Never scatter** isolated `[data-theme="light"]` rules throughout the file.
- **Strategy:** Override CSS custom properties in `body[data-theme="light"]` so ~80% of components auto-correct. Only add targeted overrides where hardcoded `rgba()` backgrounds or gradients bleed through.

### Key Token Overrides (Dark → Light)

| Token | Dark | Light |
|-------|------|-------|
| `--bg` | `#0e0614` | `#f4efe3` |
| `--surface` | `#1e1040` | `#f8f4ea` |
| `--card` | `#1e1040` | `#f2ecde` |
| `--text` | `#f4e4bc` | `#2a2118` |
| `--muted` | `rgba(196,180,148,.7)` | `rgba(74,62,48,.65)` |
| `--gold` | `#d4af37` | `#b8941a` |
| `--line` | `rgba(92,44,145,.28)` | `rgba(120,100,60,.18)` |
| `--card-border` | `rgba(255,255,255,.08)` | `rgba(120,100,60,.12)` |
| Shadows | Black-based | Warm sepia `rgba(120,90,40,...)` |

### When Adding a New Component
1. Use CSS variables for all colors — they flip automatically with zero extra work.
2. If your component uses **hardcoded dark `rgba()` backgrounds** (glassmorphism), you **must** add a `body[data-theme="light"]` override in the light mode section of `style.css`.
3. Light mode surfaces: `rgba(248,244,234,...)` or `rgba(242,236,222,...)` — warm parchment tones.
4. Light mode borders: `rgba(120,100,60,...)` — sepia, not amethyst.
5. Light mode shadows: `rgba(120,90,40,...)` — warm sepia, not black.
6. **Never use `#fff` or `#ffffff`** as any background surface in light mode.

---

## 13. Glassmorphism Pattern

Modals, sticky headers, and overlay surfaces use a consistent glassmorphism recipe:

```css
background: rgba(16, 8, 34, .88);   /* or appropriate surface tone */
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
border: 1px solid var(--card-border);
```

In light mode (add to the light mode section):
```css
background: rgba(248, 244, 234, .94);
border: 1px solid rgba(120, 100, 60, .12);
```

All `.modal__top` (sticky modal headers) use this pattern with a vertical gradient fade on the bottom edge.

---

## 14. Interaction Hierarchy

- **One primary action per panel** — every panel, screen, and modal has exactly one `.btn` (gold primary).
- Advanced, dangerous, or infrequent controls go in secondary sections or confirmation modals.
- Progressive disclosure: show only what the user needs at that moment. Reveal complexity on demand.
- Every feature must provide: **loading state**, **empty state**, **success feedback**, **error feedback**.
- Mobile-first layout. Desktop enhancements layer on top — never build desktop-only layouts.

---

## 15. TomeVault Screen Rules

- **GM Dashboard (`#screenGMDash`):** Prioritize handouts panel, party state, and session invite/controls. Atmosphere controls are secondary.
- **Player View (`#screenPlayerView`):** Prioritize clarity of revealed handouts and party status. Low friction. No clutter.
- **Inventory (`#screenInventory`):** Party treasury is primary; individual player items are secondary.
- **Profile (`#screenProfile`):** Character identity first (avatar, name, quick stats), then details.
- **Settings (`#screenSettings`):** Sectioned clearly. Destructive actions (account delete, leave session) always at the bottom, visually separated, behind a confirmation modal.
- **Modals:** All modals must feel consistent regardless of content — same card shape, same animation, same close behavior.
- **Viewport Fit (all screens):** In default (unexpanded) state, each screen should fit inside the visible device viewport and feel full-screen without unintended page overflow. Prefer internal scroll regions for long content over global page overflow.
- **Viewport Fit Exemption:** `position: fixed` overlays (modals, drawers, lightboxes, toasts) are exempt from screen viewport-fit checks; validate viewport-fit against active screen containers, not overlay layers.

---

## 16. Definition of Done (New Features)

A feature is **not done** until all of the following are true:

1. Uses existing CSS variables — no invented hex values, rgba, or timing literals.
2. All class names match this document's component catalog.
3. `showOnly()` and `setModalVisibility()` used for all navigation and modal control.
4. Motion tiers applied correctly with `var(--tv-dur-*)` and `var(--tv-ease)`.
5. `@media (prefers-reduced-motion: reduce)` disables all new animations.
6. Works on mobile (375px+) and desktop (1280px+).
7. All interactive elements have `:focus-visible` gold ring.
8. Loading, empty, success, and error states are implemented.
9. Does not break GM/player session flow.
10. Light mode tested: no dark surfaces bleeding through.
11. Equivalent controls maintain consistent dimensions (height/radius/padding/width behavior) unless intentionally variant by catalog.
12. Brand wordmark (`TomeVault`) style is consistent (Cinzel, gold `T`/`V`, canonical glow treatment).
13. Key interactions use consistent motion tiers and reduced-motion fallbacks.
14. If `style.css` or `index.mjs` is changed, `index.html` asset query versions are updated for affected assets.
15. Deployment verification confirms live assets include the expected version string and latest selector/function changes.

---

## 17. Execution Consistency (Mandatory)

For uniform future execution, follow this sequence for every UI task:

1. **Context load:** Read `style.css`, `index.mjs`, and this contract section before editing.
2. **Viewport-fit standard:** Use the app shell pattern already in code (`body[data-screen]` active screen constraints with internal scroll regions) and avoid introducing page-level horizontal overflow.
3. **Token-only implementation:** Use existing variables/classes only; no ad-hoc color/timing/radius values.
4. **Validation pass:** Run diagnostics on edited files and fix relevant errors before final output.
5. **Versioning + verification:** If CSS/JS changed, bump cache-bust query strings in `index.html` and verify the expected version appears in deployed assets.

---

## 18. Build Prompt Template

Use this template when requesting a new feature:

```
Build this feature for TomeVault App. Keep it fully consistent with the TomeVault UX Contract.

Feature: [describe feature]
Role: [GM / Player / both]
Flow: [entry → action → result]

Requirements:
- Preserve existing Firebase behavior unless explicitly changing it.
- Use existing CSS variables and class names from the UX Contract — no new tokens.
- Use showOnly() for screen navigation, setModalVisibility() for modals.
- Apply the correct motion tier (micro/standard/dramatic) with var(--tv-dur-*) and var(--tv-ease).
- Include prefers-reduced-motion support.
- One primary .btn per panel; secondary actions use .btn--ghost.
- Provide loading, empty, success, and error states.
- Light mode must work: add overrides to the light mode section of style.css if hardcoded surfaces are used.

Output expectations:
- List files changed.
- Confirm all class names match the UX Contract catalog.
- Confirm light mode tested.
- Confirm mobile (375px+) and desktop (1280px+) usability verified.
- Confirm cache-bust version bump performed when CSS/JS changed.
- Confirm deployment verification evidence (version string + changed selector/behavior present live).
- Explain any non-obvious UX decisions briefly.
```

---

## 19. What Not to Do

These are direct violations — catch and fix immediately:

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `transition: all 300ms ease-in-out` | `transition: all var(--tv-dur-mid) var(--tv-ease)` |
| `animation-duration: 200ms` | `animation-duration: var(--tv-dur-fast)` |
| `border-radius: 8px` | `border-radius: var(--radius-sm)` |
| `color: #d4af37` | `color: var(--gold)` |
| `background: rgba(92,44,145,.28)` | `background: var(--line)` or relevant variable |
| `font-family: 'Playfair Display'` | `font-family: var(--font-heading)` (Cinzel only) |
| `background: --accent-gold` | `background: var(--gold-gradient)` or `var(--gold)` |
| `el.classList.toggle('hidden')` on modal | `setModalVisibility(el, true/false)` |
| `document.getElementById('screenX').classList.remove('hidden')` | `showOnly('screenX')` |
| `setTimeout(fn, 300)` for modal cleanup | `setTimeout(fn, UI_TIMERS.MODAL_LEAVE_MS)` |
| Custom `<div>` notification element | `showToast(msg, 'success')` |
| `width: 143px` on a button | Hug content (auto) on desktop, `.btn--full` on mobile |
| `border-radius: 4px;` anywhere | `var(--radius-sm)` (12px) — no exceptions |
| Adding light-mode rules mid-file | All light mode overrides go in the `LIGHT MODE` section at end of `style.css` |
| `background: #ffffff` in light mode | Use `var(--surface)` or `rgba(248,244,234,...)` parchment tones |