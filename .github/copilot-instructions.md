# TomeVault UX Contract

Use these instructions for all future feature work in TomeVault App.

## Product Goal
TomeVault should feel like a premium digital tabletop companion: cinematic, readable, tactile, and fast.

Keep the existing feature depth and Firebase behavior, but make every new feature match the same visual language, interaction hierarchy, and animation system.

## Visual System (Strict Constraints)
- ALWAYS use the existing CSS variables in `style.css` as the single source of truth. NEVER invent new hex codes.
- **Dark Mode Backgrounds:** Deep void surfaces (`#0e0614`, `#1e1040`). 
- **Light Mode Backgrounds:** Warm parchment surfaces (`#f4efe3`, `#f2ecde`). Never cold white, lavender, or sterile gray.
- **Accents:** Antique gold — `#d4af37` in dark mode, `#b8941a` in light mode.
- **Dark Mode Text:** Warm parchment (`#f4e4bc`) for body text, muted for secondary.
- **Light Mode Text:** Dark espresso (`#2a2118`) for body text, `rgba(74,62,48,.65)` for secondary.
- **Typography:**
  - Headings/Titles: MUST use a Serif font (e.g., `Cinzel` or `Playfair Display`).
  - Body/UI: MUST use a Sans-Serif font (e.g., `Open Sans`).
- **Geometry & Spacing:**
  - Enforce a strict `12px` border-radius on ALL inputs, buttons, and modals (via `--radius-sm/md/lg/xl`). Do not use random radii.
  - Borders should be subtle and semi-transparent — amethyst-tinted in dark mode (`rgba(92,44,145,.28)`), sepia-tinted in light mode (`rgba(120,100,60,.18)`).
- **Scrollbars:** ALWAYS use custom `::-webkit-scrollbar` styling. Dark mode: dark muted thumb. Light mode: sepia thumb (`rgba(160,130,70,.30)`). No default browser scrollbars.

## Light Mode Design System ("Illuminated Manuscript")
The light mode is a **warm parchment** theme — the daylight face of TomeVault's fantasy aesthetic. Think sunlit scholar's study, aged paper, illuminated gold leaf. **Never** cold whites, washed lavenders, or sterile modern grays.

**Architecture:**
- Light mode is activated via `body[data-theme="light"]` set by JS (`index.mjs`).
- All light mode CSS lives in **one organized section** at the end of `style.css` under the `LIGHT MODE — Illuminated Manuscript` heading.
- **Strategy:** Override CSS custom properties in `body[data-theme="light"]` so 80%+ of components auto-correct. Only add targeted component overrides where hardcoded `rgba()` values or gradients would bleed through.
- **Never scatter** light mode rules throughout the file. All overrides stay in the dedicated section.

**Key Token Mappings (Dark → Light):**
| Token | Dark Mode | Light Mode |
|-------|-----------|------------|
| `--bg` | `#0e0614` | `#f4efe3` |
| `--surface` | `#1e1040` | `#f8f4ea` |
| `--card` | `#1e1040` | `#f2ecde` |
| `--text` | `#f4e4bc` | `#2a2118` |
| `--gold` | `#d4af37` | `#b8941a` |
| `--line` | `rgba(92,44,145,.28)` | `rgba(120,100,60,.18)` |
| Shadows | Black-based | Warm sepia (`rgba(120,90,40,...)`) |

**When adding new components:**
1. Use CSS variables for all colors — they flip automatically.
2. If your component uses hardcoded dark `rgba()` backgrounds (e.g., glassmorphism), add a `body[data-theme="light"]` override in the light mode section at the end of `style.css`.
3. Use warm parchment tones (`rgba(248,244,234,...)`, `rgba(242,236,222,...)`) for light mode surface overrides.
4. Use sepia border tones (`rgba(120,100,60,...)`) instead of amethyst.
5. Never use pure white (`#fff` or `#ffffff`) as a background surface.

... [Keep your Interaction Hierarchy section exactly as it is] ...

## Interaction Hierarchy
- One primary action per panel.
- Advanced or risky controls belong in secondary sections or modals.
- Every feature must provide:
  - loading state
  - empty state
  - success feedback
  - error feedback
- Mobile-first layout is required, with desktop enhancement rather than separate design language.

## Motion System (Strict Constraints)
Classify every animation into one of these tiers:
- Micro: press, hover, toggle, copied state (Strictly `200ms ease-in-out` or `cubic-bezier(0.4, 0, 0.2, 1)`).
- Standard: screen swaps, list entry, chips, panel toggles (Strictly `300ms`).
- Dramatic: modal entrance/exit, drawer movement. (Modals MUST scale from `0.95` to `1` while fading in).
- Cinematic: rare atmosphere moments only.

Rules:
- NEVER use linear animations. Always use ease-in-out or the defined cubic-bezier.
- Reuse the shared modal open/close path in `index.mjs`.
- Respect `prefers-reduced-motion: reduce`.
- Avoid decorative motion that slows core tasks (snappy > bouncy).

## TomeVault Screen Rules
- GM dashboard should prioritize handouts, party state, and invite/session controls.
- Player flows should prioritize clarity, reveal state, and low-friction interaction.
- Settings should remain sectioned and clearly separated from destructive actions.
- Modals should feel consistent regardless of content type.

## Definition Of Done For New Features
A feature is not done until it:
1. Matches TomeVault tokens and component styling.
2. Uses the shared motion system.
3. Works on mobile and desktop.
4. Includes keyboard/focus-safe interactions.
5. Includes loading, empty, success, and error states where relevant.
6. Does not break GM/player session flows.

## Reusable Build Prompt
When adding a new feature, follow this template:

Build this feature for TomeVault App and keep it fully consistent with the existing TomeVault UX contract.

Feature:
[describe feature]

Role:
[GM / Player / both]

Flow:
[entry -> action -> result]

Requirements:
- Preserve existing Firebase and app flow behavior unless explicitly changing it.
- Reuse existing TomeVault visual tokens and interaction patterns.
- Use the established motion hierarchy and reduced-motion support.
- Keep one primary action per panel and use progressive disclosure for advanced controls.
- Provide loading, empty, success, and error states.
- Verify mobile and desktop usability.

Output expectations:
- Explain UX decisions briefly.
- Explain motion decisions briefly.
- List files changed.
- Confirm verification performed.

## Avoid
- Introducing a new visual style for a single feature.
- Adding hardcoded durations, colors, or spacing when tokens already exist.
- Mixing multiple modal behaviors.
- Over-animating utility flows.
- Rewriting stable data logic unless required by the feature.

## Button & Layout System (Strict Constraints)
Never guess button styles or placements. Every button and layout must strictly follow these rules:

**1. Button Hierarchy & Colors:**
- **Primary Buttons:** Used ONLY for the single most important action on a screen (e.g., Save, Create, Submit). Must use a solid `--accent-gold` background with dark text. 
- **Secondary Buttons:** Used for alternative actions (e.g., Cancel, Go Back). Must have a transparent background with a subtle semi-transparent border and text.
- **Danger Actions:** Used for destructive actions (e.g., Delete). Must use a muted crimson/red tone.
- **Ghost/Icon Buttons:** Used for utility actions (e.g., edit icon, close X). No background, icon only.

**2. Sizing & Scales:**
- NEVER use random hardcoded widths like `width: 143px` or `width: 60%`.
- All buttons must use standardized padding (e.g., `padding: 8px 16px` or `12px 24px`).
- On Desktop: Buttons should hug their content (auto-width). 
- On Mobile: Primary/Secondary buttons should span `width: 100%` for easy tapping.

**3. Spatial Placement:**
- **Modals/Forms:** Action buttons must ALWAYS be grouped at the bottom in a flex container. Primary button goes on the RIGHT. Secondary button ("Cancel") goes on the LEFT.
- **Top Bar:** Navigation and utility actions belong at the top.
- Never place a solitary floating button in a random corner unless it's a fixed Floating Action Button (FAB).

## Micro-Polish & Depth (Strict Constraints)
To achieve a AAA professional feel, all CSS must strictly adhere to these polish rules:

**1. The 8-Point Spacing Grid:**
- NEVER use arbitrary pixel values for spacing. 
- ALL `padding`, `margin`, `gap`, `top/bottom/left/right` values MUST be multiples of 4 or 8 (e.g., 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px).

**2. Dark Mode Elevation & Borders:**
- All cards, panels, and modals MUST have a subtle border to lift them off the background: `border: 1px solid rgba(255, 255, 255, 0.08);`.
- Use `box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);` for floating elements (modals, dropdowns) to create deep atmosphere.

**Light Mode Elevation & Borders:**
- Use sepia-tinted borders: `border: 1px solid rgba(120, 100, 60, 0.12);`.
- Use warm sepia shadows: `box-shadow: 0 4px 16px rgba(120, 90, 40, 0.09);` for floating elements.

**3. Typographic Contrast:**
- Primary headings (Serif) should be bold and bright gold.
- **Dark Mode:** Secondary/Body text MUST be muted. Use `color: rgba(196,180,148,.7);` (70% opacity parchment) so it doesn't compete with headings. Never use pure white text.
- **Light Mode:** Secondary/Body text uses `color: rgba(74,62,48,.65);` (warm brown muted). Never use pure black text.

**4. Atmosphere (Glassmorphism):**
- Modals, sticky headers, and tooltips should use a semi-transparent surface background combined with `backdrop-filter: blur(16px);`.