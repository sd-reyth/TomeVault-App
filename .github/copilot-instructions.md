# TomeVault — Design System & UX/UI Rules

**Single source of truth** for all visual tokens, component patterns, motion, layout, accessibility,
and responsive rules. This file governs every CSS and HTML change in the project.  
No design decision may contradict what is written here without explicitly updating this file first.

---

## 1. Brand Identity

| Property | Value |
|---|---|
| Product name | **TomeVault** — capital T, capital V, one word, always |
| Role name | **GM** (Game Master) — never "DM" in any UI-visible string |
| Visual DNA | Dark-fantasy tabletop RPG. Deep void backgrounds, antique gold accents, amethyst undertones, parchment text |
| Tone | Premium, atmospheric, trustworthy. No neon, no flat minimalism, no pastel |

### 1.1 Wordmark Usage
- Rendered in `var(--font-heading)` (Cinzel) with `color:var(--gold)` on the accented syllable
- Gold glow: `text-shadow: 0 0 14px rgba(212,175,55,.32)`
- Never rendered in a sans-serif or with an off-brand color
- Shimmer sweep animation on hover using `.brand__title::after` (existing class)

---

## 2. Design Tokens

All tokens are CSS custom properties on `:root` in `style.css`.  
**Never hard-code a hex value** that is already expressed as a token below.

### 2.1 Color Palette

#### Backgrounds
| Token | Value | Use |
|---|---|---|
| `--bg` | `#0e0614` | Page background, deepest void |
| `--bg2` | `#160c2a` | Secondary background layer |
| `--surface` | `#1e1040` | Cards, panels, raised surfaces |
| `--surface-2` | `#271454` | Slightly lifted card variant |
| `--surface-3` | `#130a28` | Recessed / inset wells |
| `--card` | `#1e1040` | Semantic alias for card backgrounds |

#### Text
| Token | Value | Use |
|---|---|---|
| `--text` | `#f4e4bc` | Primary body text — warm parchment |
| `--muted` | `rgba(196,180,148,.7)` | Secondary / supporting text |
| `--text-on-gold` | `#1a1206` | Text on gold-filled button surfaces |

#### Gold Accent Scale
| Token | Value | Use |
|---|---|---|
| `--gold` | `#d4af37` | Primary accent — borders, headings, icons |
| `--gold-2` | `#a68521` | Darker gold for gradient bottom stop |
| `--gold-gradient` | `linear-gradient(180deg, var(--gold), var(--gold-2))` | Filled primary buttons |
| `--gold-tint` | `rgba(212,175,55,.06)` | Subtle gold-tinted backgrounds |
| `--gold-border` | `rgba(212,175,55,.18)` | Resting border on gold-adjacent elements |
| `--gold-hover` | `rgba(212,175,55,.28)` | Hover border state |
| `--gold-strong` | `rgba(212,175,55,.42)` | Active / focused border state |
| `--gold-shadow` | `0 2px 10px rgba(212,175,55,.18)` | Ambient glow shadow |
| `--screen-gold-border` | `rgba(212,175,55,.48)` | Outer border on full-screen panels |
| `--screen-gold-glow` | `rgba(212,175,55,.14)` | Radial glow behind screen panels |

#### Purple / Amethyst
| Token | Value | Use |
|---|---|---|
| `--amethyst` | `#3b1b5e` | Deep amethyst — scrollbar, secondary fills |
| `--amethyst-light` | `#5c2c91` | Hover state for amethyst elements |
| `--muted-purple` | `#c8b8f0` | Light purple text on dark amethyst |
| `--crimson` | `#8a1c1c` | Background crimson — decorative only |

#### Borders & Lines
| Token | Value | Use |
|---|---|---|
| `--line` | `rgba(92,44,145,.28)` | Default UI borders — amethyst-tinted |
| `--line-strong` | `rgba(212,175,55,.5)` | Focused/active borders |
| `--card-border` | `rgba(255,255,255,.08)` | Glass highlight on elevated cards |

#### Semantic
| Token | Value | Use |
|---|---|---|
| `--danger` | `#dc2f2f` | Destructive actions, error states |
| `--danger-light` | `#ff7b7b` | Error headings on dark surfaces |
| `--warning` | `#ff8b1a` | Cautionary / leave actions |
| `--warning-light` | `#ffb870` | Warning text on dark surfaces |
| `--steel` | `#94a9c7` | Cool-blue inventory accent |

> **No new colors may be introduced.** All UI must use the tokens above. If a new color is
> genuinely needed, add it to this table and `:root` simultaneously.

---

### 2.2 Typography

#### Font Families
| Token | Value | Use |
|---|---|---|
| `--font-heading` | `'Cinzel', 'Georgia', serif` | Titles, brand wordmark, section labels |
| `--font-ui` | `'Open Sans', system-ui, sans-serif` | Body, buttons, inputs, labels |

**Google Fonts load order** (index.html `<head>`):
```
Cinzel: 400, 600, 700, 900
Open Sans: 400, 500, 600, 700
```

#### Type Scale
| Token | Value | When to use |
|---|---|---|
| `--text-xs` | `12px` | Captions, meta labels, badges |
| `--text-sm` | `14px` | Helper text, secondary labels |
| `--text-base` | `15px` | Default body / button text |
| `--text-lg` | `16px` | Primary body paragraphs |
| `--text-xl` | `18px` | Sub-headings, large labels |
| `--text-2xl` | `20px` | Section headings, input text |
| `--text-3xl` | `24px` | Screen headings |
| `--text-4xl` | `32px` | Brand title, hero display |

**Rules:**
- Headings use `--font-heading` (Cinzel) — never `--font-ui`
- Body/UI copy uses `--font-ui` (Open Sans) — never `--font-heading`
- Minimum readable size: `--text-sm` (14px). Never go below this in live UI
- `letter-spacing` on headings: `0.02em` to `0.06em` depending on scale
- Line height for body: `1.45`–`1.6`. For headings: `1.0`–`1.2`

---

### 2.3 Spacing Scale (8-point grid)

All spacing must be a multiple of 4px. Use the named tokens.

| Token | Value |
|---|---|
| `--spacing-xs` | `4px` |
| `--spacing-sm` | `8px` |
| `--spacing-md` | `12px` |
| `--spacing-lg` | `16px` |
| `--spacing-xl` | `20px` |
| `--spacing-2xl` | `24px` |

> One-off pixel values (e.g. `margin:13px`) are a code smell. Always use a token or a
> multiple of 4px with a comment explaining the exception.

---

### 2.4 Border Radius Scale

All corners in the app use **12px** as the base unit. This creates a consistently modern,
soft-but-structured feel across all components.

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `12px` | Buttons, inputs, chips, small cards |
| `--radius-md` | `12px` | Standard cards, modals, panels |
| `--radius-lg` | `12px` | Large cards, auth surfaces |
| `--radius-xl` | `12px` | Screen-level panels |
| `--radius-full` | `999px` | Pills, avatar rings, circular buttons |

---

### 2.5 Shadow Scale

| Token | Value | Use |
|---|---|---|
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,.12)` | Slight lift — inline card |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,.15)` | Standard card elevation |
| `--shadow-lg` | `0 12px 36px rgba(0,0,0,.2)` | Floating panel |
| `--shadow-xl` | `0 26px 70px rgba(0,0,0,.5)` | Modal overlay depth |
| `--gold-shadow` | `0 2px 10px rgba(212,175,55,.18)` | Gold ambient glow |

**3D button shadows** are defined inline per component (not via the scale above) to allow
the `translateY` press effect to work correctly. See Button section.

---

### 2.6 Icon Button Sizes

| Token | Value | Use |
|---|---|---|
| `--icon-btn-sm` | `40px` | Compact toolbar icons |
| `--icon-btn-md` | `44px` | Standard icon buttons |
| `--icon-btn-lg` | `48px` | Prominent icon buttons |

All icon buttons must be **square** — same `width` and `height`. Never clip below 40×40px.

---

## 3. Motion System

### 3.1 Easing Functions
| Token | Value | Character |
|---|---|---|
| `--tv-ease` | `cubic-bezier(.22,1,.36,1)` | Smooth deceleration — feels natural, premium |
| `--tv-ease-bounce` | `cubic-bezier(.34,1.56,.64,1)` | Slight overshoot — playful pop for confirmations |

### 3.2 Duration Tiers
| Token | Value | When to use |
|---|---|---|
| `--tv-dur-fast` | `0.2s` | Hover, press, toggle — micro feedback |
| `--tv-dur-mid` | `0.3s` | Screen transitions, panel reveals, tab switches |
| `--tv-dur-slow` | `0.36s` | Modal entrance, drawer open, onboarding heroes |

### 3.3 Rules
1. **Every** transition must use a duration token and `var(--tv-ease)` unless `--tv-ease-bounce` is explicitly warranted.
2. `transition-duration: 0.01ms` must be applied in `@media (prefers-reduced-motion: reduce)` — the global rule in `style.css` handles this but new `@keyframes` must be tested.
3. Screen enter animation: `opacity:0 → 1` + `translateY(6px → 0)` at `--tv-dur-mid`.
4. Modal/drawer entrance: same pattern at `--tv-dur-slow`.
5. Button press: `translateY(3–4px)` + shadow collapse at `--tv-dur-fast`. Never skip this on primary actions.
6. Background glow animation: `tvBackgroundGlow` — 28s loop on `body::before`. Do not touch.

---

## 4. Layout Architecture

### 4.1 App Shell
```
html / body          ← min-height:100dvh, overflow-x:hidden
  └── .app-shell     ← width:min(1480px, 98vw), flex column, z-index:1
        ├── .topbar  ← position:sticky, top:0, z-index:60 (hidden on landing)
        ├── .layout  ← display:grid, gap:var(--spacing-sm), padding-bottom for chrome
        │     └── section#screen*  ← one active at a time, shown via JS
        ├── .bottom-bar   ← position:fixed (hidden on landing)
        └── .ambience-bar ← position:fixed (hidden on landing)
```

### 4.2 Screen Visibility
- Only the active screen section is visible; all others have `.hidden` class
- JS sets `body[data-screen="<name>"]` to control which screen is shown
- Active screens get `min-height/max-height: calc(100dvh - top-chrome - bottom-chrome)` and `overflow:auto`
- **Exception — Landing screen:** topbar + bottom-bar are `display:none !important`, so `#screenLanding` gets `min-height:100dvh; max-height:none` and the body itself scrolls

### 4.3 Chrome Height Variables
| Token | Desktop | Mobile (≤800px) |
|---|---|---|
| `--tv-chrome-top` | `76px` | `68px` |
| `--tv-chrome-bottom` | `96px` | `88px` |

### 4.4 Z-Index Stack
| Layer | z-index | Element |
|---|---|---|
| Background | `0` | Body pseudo-elements |
| Content | `1` | `.app-shell`, `.topbar`, `.card` |
| Topbar | `60` | `.topbar` |
| FAB | `61` | `.settings-fab` |
| Speed dial | `62` | `.hamburger-speed-dial` |
| Settings drawer | `110` | `.settings-drawer` |
| Session peek | `120` | `.sessionPeek` |
| Auth loading overlay | `9999` | `.authLoadingOverlay` |
| Lightbox | `10001` | `.lightboxModal` |
| Blocking modal | `10000` | `.blockingModal` |

> Never use ad-hoc z-index values. If a new layer is needed, document it here first.

### 4.5 Layout Padding
- `.layout` carries `padding-bottom: calc(var(--tv-chrome-bottom) + var(--spacing-lg) + env(safe-area-inset-bottom))`
- On landing screen: `.layout` overrides to `padding-bottom: env(safe-area-inset-bottom, 0px)` — no chrome offset needed
- Horizontal padding: `0` desktop, `8px` at ≤800px, `6px` at ≤480px

---

## 5. Component System

### 5.1 Buttons

#### Primary — `.btn`
```css
background: var(--gold-gradient)
color: var(--text-on-gold)
border: 1px solid transparent
border-radius: var(--radius-sm)
min-height: 44px
padding: 10px 18px
font-size: var(--text-base)
font-weight: 700
box-shadow: 0 4px 0 rgba(20,12,1,.88), 0 8px 20px rgba(10,8,18,.34)
```
- Hover: `filter:brightness(1.06)` + gold glow ring
- Active/Press: `translateY(3px)` + shadow collapses to `0 1px 0`
- Disabled: `opacity:.45`, `cursor:not-allowed`, no shadow

#### Secondary — `.btn--ghost`
```css
background: rgba(57,47,82,.7)
color: var(--text)
border: 1px solid var(--line)
box-shadow: 0 4px 0 rgba(0,0,0,.55)
```
- Hover: `border-color:var(--gold-border)` + gold tint glow
- Active/Press: `translateY(4px)` + shadow collapses

#### Small variant — `.btn--small`
- `font-size: var(--text-sm)`, `padding: 8px 14px`, `min-height: 40px`

#### Semantic aliases
- `.btn--primary`, `.btn--gold` → identical to `.btn`
- `.btn--danger` → ghost variant, `danger` border + color
- `.btn--danger-fill` → filled red for final destructive confirms
- `.btn--warning` → ghost variant, `warning` border + color
- `.btn--link` → no border/background, underlined text, `cursor:pointer`

#### Rules
- Every primary CTA on a screen must use `.btn` (gold)
- Cancel / Back / secondary must use `.btn--ghost`
- Destructive actions: `.btn--danger` on first prompt, `.btn--danger-fill` on confirm dialog
- `width:100%` is applied globally at ≤800px — do not fight this with inline widths
- `.btn--full` forces full width at any breakpoint

### 5.2 Icon Buttons — `.iconBtn`
- Square: `width/height = var(--icon-btn-sm)` (40px) default
- Use `--icon-btn-md` (44px) for prominent in-context actions
- Use `--icon-btn-lg` (48px) for hero-level icon buttons
- SVG icons inside: `width:18–22px`, `height:18–22px`
- Focus ring: `outline:2px solid var(--gold); outline-offset:2px`

### 5.3 Form Inputs — `.input`

```css
width: 100%
min-height: 48px
border-radius: var(--radius-sm)
border: 1px solid var(--line)
background: rgba(38,31,57,.94)
color: var(--text)
padding: 10px 14px
font-size: var(--text-2xl)
font-family: var(--font-ui)
```
- Placeholder: `color: rgba(196,180,148,.42)`
- Hover: `border-color: rgba(212,175,55,.35)`
- Focus: `border-color: var(--line-strong)`, `box-shadow: 0 0 0 3px var(--gold-border)`, `outline:none`
- Textarea: `resize:vertical`, `min-height:120px`
- Always pair with a `.label` above: `color:var(--gold)`, `font-size:var(--text-sm)`
- Correct `type` attribute is mandatory: `email`, `password`, `text`, `number`, `tel`, `url`, `search`

### 5.4 Cards — `.card`
```css
background: linear-gradient(180deg, rgba(24,12,52,.97), rgba(18,8,42,.95))
border: 1px solid var(--card-border)   /* rgba(255,255,255,.08) */
border-radius: var(--radius-xl)
box-shadow: 0 4px 24px rgba(0,0,0,.4)
padding: 16px
```
- Do not override the background gradient — it creates the depth illusion
- Card within a card (nested): reduce padding to `var(--spacing-md)`, use `--surface-3` background

### 5.5 Chips — `.chip`
- Active/press: `transform:scale(.97)` at `--tv-dur-fast`
- Focused: gold `outline:2px solid var(--gold); outline-offset:2px`
- Used for filter toggles, tag selection — never for primary actions

### 5.6 Pills — `.pill`
```css
border: 1px solid var(--line)
background: rgba(30,16,64,.75)
height: 44px
padding: 0 14px
font-size: var(--text-lg)
border-radius: var(--radius-md)
```
- Nugget variant (`.pill--nugget`): gold color, gold border, gradient background
- Status pills are informational only — not interactive unless they carry `.pill--clickable`

### 5.7 Modals

#### Structure
```
.modal (position:fixed, inset:0, z-index varies by type)
  ├── .modal__backdrop (blur overlay)
  └── .modal__card (content)
```

#### `modal__card` sizing
- Max height: `var(--tv-modal-max-height)` = `calc(100dvh - 40px)`
- Tight: `var(--tv-modal-max-height-tight)` for small confirm dialogs
- Form: `var(--tv-modal-max-height-form)` for tall form modals
- Mobile: `var(--tv-modal-max-height-mobile)` = `calc(100dvh - 16px)`

#### Animation
- Enter: `opacity:0 → 1` + `translateY(8px → 0)` at `--tv-dur-slow`
- Exit: reverse at `--tv-dur-mid`
- Classes: `.modal--entering` / `.modal--leaving` toggled by JS

#### Action footer — `.modal-actions`
- Layout: `display:flex; gap:12px; margin-top:16px`
- Button order: `[Cancel / Secondary]` ← left, `[Primary CTA]` ← right
- On mobile (`≤800px`): `flex-direction:column-reverse` so primary is visually on top

### 5.8 Settings Drawer
- Position: `position:fixed; inset:0; z-index:110`
- Panel: `right:0`, width `min(420px, 92vw)` — full width on mobile
- Backdrop: `rgba(0,0,0,.5)` + `backdrop-filter:blur(6px)`
- Enter: `translateX(100% → 0)` at `--tv-dur-slow`
- Exit: `translateX(0 → 100%)` at `--tv-dur-mid`

### 5.9 Skeleton Loading — `.skeleton`
- Shimmer: `90deg gradient` animated over `1.4s ease-in-out`
- Border radius matches the element being loaded (use `.skeleton--card` or `.skeleton--line`)
- Show for any data fetch that may take > 300ms

### 5.10 Empty States — `.emptyState`
- Centered column layout, icon + title + hint
- Icon: `font-size:40px; opacity:.55`
- Title: `--text-2xl`, `opacity:.7`
- Hint: `--text-lg`, `max-width:260px`
- Always include a CTA button if there is a next action available

### 5.11 Toast Notifications
- Position: `position:fixed` — defined by JS placement
- Duration: short (3s), medium (6s), long (10s) — values from `UI_TIMERS`
- Types: `success`, `error`, `info`, `warning` — always user-readable text, never raw error codes
- Undo variant (`.toast--undo`): ghost gold button inline

---

## 6. Landing Screen

The landing screen (`#screenLanding`) is a special case:

- **No topbar, no bottom-bar, no ambience-bar** — all `display:none !important`
- The screen itself is `min-height:100dvh; max-height:none` — body handles scroll
- `.layout` padding-bottom is `env(safe-area-inset-bottom, 0px)` (no chrome offset)
- `.landingCard` is a flex column that grows to natural content height

### 6.1 Hero Section — `.landingHero`
- Width: `min(960px, 100%)`
- Padding: `clamp(40px,7vh,72px)` top, `clamp(24px,6vw,80px)` sides, `clamp(24px,5vh,40px)` bottom
- Gap: `var(--spacing-lg)`
- Logo: `140×140px` with `logoFloat` animation (5s ease-in-out)
- Title `.landingTitle`: Cinzel, `clamp(var(--text-3xl), 5vw, 46px)`
- Lead `.landingLead`: Open Sans, `var(--text-lg)`, `color:var(--muted)`, `max-width:640px`

### 6.2 Auth Card — `.auth-card`
- Width: `100%`, `max-width:720px`, centered
- Background: `rgba(42,35,61,.85)` + `backdrop-filter:blur(12px)`
- Border: `1px solid var(--line)` with gradient shimmer pseudo-element
- Padding: `28px 32px` → `20px 16px` at ≤800px → `14px 12px` at ≤480px
- Auth card is hidden when signed in — `landingHome` shows instead

### 6.3 Post-login Home — `.landing-home`
- Desktop: `display:grid; grid-template-columns:1fr 1fr` (actions left, sessions right)
- Mobile: single column
- Session items (`.landingSessionItem`): gold tint for GM role, steel for player role

---

## 7. Responsive Breakpoints

The design is **desktop-first**. Overrides are applied as `max-width` queries.

| Breakpoint | Query | Strategy |
|---|---|---|
| Tablet | `≤1200px` | Reduce typography, narrow controls |
| Mobile | `≤800px` | Stack layouts, full-width buttons, compact chrome |
| Small phone | `≤480px` | Aggressive compaction, hide decorative text |

### 7.1 Key Mobile Overrides (≤800px)
- `--tv-chrome-top: 68px`, `--tv-chrome-bottom: 88px`
- `.btn { width:100%; font-size:var(--text-base); min-height:44px }`
- `.auth-card { padding:20px 16px }`
- `.landing-logo { width:60px; height:60px; animation:none }`
- `.landingHero { padding:14px clamp(16px,4vw,24px) 10px; gap:10px }`
- `.row { flex-direction:column; align-items:stretch }`

### 7.2 Key Small Phone Overrides (≤480px)
- `.landing-logo { width:48px; height:48px }`
- `.landingTitle { font-size:var(--text-xl) }`
- `.landingLead { display:none }` — tagline hidden on tiny screens
- `.auth-card { padding:14px 12px }`
- `.auth-divider { margin:10px 0 }`
- `.auth-guest-btn { min-height:44px; padding:10px 12px }`

### 7.3 Touch Target Minimum
Every interactive element must be **≥44×44px** on mobile. Use `min-height:44px` and `min-width:44px` explicitly for icon-only controls.

---

## 8. Accessibility Rules

- All interactive elements have `:focus-visible` with `outline:2px solid var(--gold); outline-offset:2px`
- No element uses `outline:none` without a replacement focus indicator
- Every `<button>` that contains only an icon must have an `aria-label`
- Every `<input>` must have an associated `<label>` (via `for`/`id` pair)
- Color contrast: text must meet WCAG 2.1 AA (4.5:1 for body, 3:1 for large headings)
  - `--text` `#f4e4bc` on `--bg` `#0e0614` ✓ passes AA
  - `--muted` `rgba(196,180,148,.7)` — borderline, use only for supplemental text
- Destructive actions (Delete, Leave, Reset) require a confirmation modal before execution
- `@media (prefers-reduced-motion: reduce)` — all `@keyframes` must be suppressed via the global rule in style.css

---

## 9. Page Background

The `body` background is a layered composition that must not be modified without updating this document:

```css
body {
  background:
    linear-gradient(158deg, rgba(12,6,20,.96) 0%, rgba(16,8,28,.95) 42%, rgba(8,4,14,.98) 100%),
    radial-gradient(ellipse 66% 52% at 18% 24%, rgba(78,30,124,.34), transparent 72%),
    radial-gradient(ellipse 58% 44% at 82% 72%, rgba(115,24,24,.23), transparent 68%),
    url('backgrounds/background02.JPG');
  background-attachment: fixed;
}
```

`body::before` adds a slow `tvBackgroundGlow` animation (28s, `--tv-ease`, infinite alternate) — a subtle ambient shift. This is the primary "alive" quality of the interface. Do not remove it.

---

## 10. reCAPTCHA

- reCAPTCHA v3 script is loaded but `RECAPTCHA_VERIFY_ENDPOINT = ""` — tokens are never submitted
- The `.grecaptcha-badge` injected by Google's script is hidden: `visibility:hidden !important`
- Do not remove the script — the integration is ready for when an endpoint is wired up

---

## 11. Auth Flow

Firebase Auth (`v12.9.0 ESM`) with email/password + Google OAuth:
- `onAuthStateChanged` fires on page load; if a valid (non-anonymous) session exists, it is restored automatically — this is expected behavior, not a bug
- Anonymous sessions are force-signed-out on init unless `tv_devBypass` flag is set on localhost
- `processRedirectAuthResult()` handles Google OAuth redirect flow on mobile browsers
- `updateLandingAuthState()` toggles `#authCard` / `#landingHome` visibility based on `state.isSignedIn`

---

## 12. Naming Conventions

| Pattern | Convention |
|---|---|
| CSS classes | `kebab-case` — `.landing-home`, `.auth-card` |
| CSS BEM modifier | `--modifier` suffix — `.btn--ghost`, `.pill--nugget` |
| CSS BEM element | `__element` suffix — `.landing-action-card__icon` |
| JS state classes | `is-` prefix — `.is-active`, `.is-loading`, `.is-open` |
| HTML element IDs (JS API) | `camelCase` — `#authCard`, `#btnSignIn` — **do not rename**, they are JS API |
| Screen sections | `#screen<Name>` pattern — `#screenLanding`, `#screenGMDash` |

---

## 13. What Is Forbidden

1. Hard-coding hex colors not in the token table
2. Introducing new font families — only Cinzel and Open Sans
3. Adding `z-index` values not in the z-index stack table
4. Using `!important` except in `display:none` visibility toggles and the reCAPTCHA badge suppression
5. One-off pixel margins not on the 4px grid (except with a comment)
6. Renaming HTML element IDs — they are bound to JS
7. `outline:none` without a replacement focus indicator
8. Putting destructive actions without a confirmation dialog
9. Using blue, silver, pastel, or any color not in the token system
10. Removing the `@media (prefers-reduced-motion)` fallback block
