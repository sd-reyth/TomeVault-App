# TomeVault UI Spec v1

## Purpose

This document defines the presentation-layer standard for TomeVault.
It is the single source of truth for visual consistency, interaction quality, spacing, typography, theming, and component structure.

The goal is not cosmetic cleanup. The goal is product-grade consistency.
TomeVault must feel:

- modern and app-like
- premium and atmospheric
- intuitive at first touch
- visually disciplined
- unmistakably TomeVault

Target feeling:

- the calm geometry and affordance clarity of Duolingo, Lifesum, and polished consumer SaaS
- the thematic atmosphere of Pocket Bard
- the clarity and utility of a serious tabletop tool

This spec intentionally allows drastic visual changes if they improve uniformity, professionalism, and intuitiveness.

## Non-Negotiables

1. Business logic, state management, and event behavior must remain intact during UI refactors.
2. Theme support must remain dynamic. Do not collapse the app into a single hardcoded color scheme.
3. The UI must be built from shared patterns, not one-off visual decisions.
4. Fantasy styling must be restrained. Theme should enhance usability, not compete with it.
5. Uniformity wins over novelty.

## Current UI Problems To Correct

Observed in the live app and current components:

1. Too many surfaces use slightly different borders, shadows, and background treatments.
2. Too many buttons look like custom one-offs instead of belonging to one system.
3. Fantasy typography is overused in navigation and utility areas where modern sans would feel cleaner and more legible.
4. Text sizes and letter spacing are inconsistent between sidebar, top bar, modals, chat, and cards.
5. Some components feel ornamental rather than efficient.
6. Interactive states are not consistently obvious.
7. The shell feels assembled from strong pieces, but not yet governed by one visual grammar.

## Design North Star

TomeVault is a modern dark fantasy SaaS, not a game HUD and not a generic admin dashboard.

That means:

- the shell should feel professional and quiet
- key actions should feel obvious and tactile
- panels should feel layered and deep, not heavy and muddy
- typography should create hierarchy without visual clutter
- the interface should still feel usable at speed during a live session

## Refactor Governance

During implementation, the following may change freely:

- Tailwind class composition
- JSX layout structure
- wrapper elements
- spacing
- typography classes
- surface hierarchy
- motion and transitions
- icon treatment
- visual grouping

The following must be preserved unless explicitly requested otherwise:

- hooks
- prop names and flow
- event handlers
- conditional rendering logic
- Firestore interactions
- state shape
- feature behavior

## Theme Architecture

### Rule

Do not style core UI directly with one-off theme colors like `amber-500` or `purple-500` in feature components.
Use semantic tokens derived from the active theme.

### Existing Foundation

The app already has theme and brightness infrastructure in [src/index.css](src/index.css).
That foundation should be extended, not bypassed.

### Required Semantic Token Groups

The following token groups should exist at the shell level:

- `--tv-bg-app`
- `--tv-bg-surface-1`
- `--tv-bg-surface-2`
- `--tv-bg-surface-3`
- `--tv-bg-recessed`
- `--tv-border-subtle`
- `--tv-border-strong`
- `--tv-text-primary`
- `--tv-text-secondary`
- `--tv-text-muted`
- `--tv-accent-solid`
- `--tv-accent-soft`
- `--tv-accent-ring`
- `--tv-accent-text`
- `--tv-danger-soft`
- `--tv-danger-text`
- `--tv-success-soft`
- `--tv-success-text`
- `--tv-shadow-panel`
- `--tv-shadow-floating`

### Token Philosophy

1. Accent color is a supporting actor, not the whole palette.
2. Surface depth comes from layered dark values, blur, and restrained contrast.
3. Borders should separate, not shout.
4. Brightness settings should continue to affect surface lift without changing the core hierarchy.

## Typography System

### Font Roles

Use only two font roles in the application UI.

1. UI Sans
- use for 90% of interface text
- labels, buttons, inputs, tabs, metadata, helper text, timestamps, navigation

2. Fantasy Serif
- use sparingly
- product wordmark
- page titles
- modal titles
- selected large numbers
- selective thematic accents

### Typography Rules

1. Navigation labels use sans, not fantasy.
2. Buttons use sans, not fantasy, except for rare high-drama hero CTA cases.
3. Utility menus use sans.
4. Form labels use sans.
5. Serif is for hierarchy, not decoration.

### Scale

Primary UI text scale:

- 10px: micro labels
- 12px: metadata, timestamps, compact support copy
- 14px: standard body, button text, nav text
- 16px: emphasis body, key values
- 20px: section titles
- 28px: page-level titles

### Standard Micro Label Recipe

Use this for captions like field labels and section eyebrow text:

```txt
text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--tv-text-muted)]
```

### Standard Body Recipe

Use this for most functional text:

```txt
text-sm font-medium text-[color:var(--tv-text-primary)]
```

### Standard Long Copy Recipe

Use this for modal subtitles, guidance text, or descriptive copy:

```txt
text-sm leading-relaxed text-[color:var(--tv-text-secondary)]
```

## Geometry and Spacing

### Radius Rules

- Primary panels and modals: `rounded-2xl` or `rounded-[1.5rem]`
- Standard cards and grouped blocks: `rounded-xl`
- Inputs and buttons: `rounded-xl` or `rounded-lg`
- Tiny chips and pills: `rounded-full`
- Avoid sharp edges entirely

### Spacing Grid

The entire app should follow a 4px grid.

Preferred spacing values:

- 4px
- 8px
- 12px
- 16px
- 20px
- 24px
- 32px

### Layout Rhythm

1. Shell spacing should be roomy, never cramped.
2. Modal bodies should default to `p-5` or `p-6`.
3. Cards should not mix arbitrary padding values unless a component recipe defines them.
4. Stacked content should usually use `gap-4` or `gap-6`.

## Surface System

### Surface Hierarchy

There should only be four standard surface types.

1. App background
- deepest layer
- visually quiet

2. Surface 1
- main panels and rails
- shell framing

3. Surface 2
- nested cards and controls
- secondary containers

4. Recessed surface
- inputs, wells, message fields, sub-panels

### Surface Recipes

#### App Background

```txt
bg-[color:var(--tv-bg-app)]
```

#### Main Panel

```txt
rounded-2xl border border-[color:var(--tv-border-subtle)] bg-[color:var(--tv-bg-surface-1)]/88 backdrop-blur-md shadow-[var(--tv-shadow-panel)]
```

#### Secondary Panel

```txt
rounded-xl border border-[color:var(--tv-border-subtle)] bg-[color:var(--tv-bg-surface-2)]/86 backdrop-blur-sm
```

#### Recessed Field Surface

```txt
rounded-xl border border-[color:var(--tv-border-subtle)] bg-[color:var(--tv-bg-recessed)] shadow-inner
```

### Border Rules

1. Borders should generally be 1px.
2. Border contrast should be soft.
3. Borders should reinforce grouping, not become decoration.
4. Avoid thick or overly bright borders except active/focus states.

## Motion System

### Timing

- hover: 140ms to 180ms
- press: 80ms to 120ms
- modal enter: 220ms to 280ms
- panel fade: 180ms to 220ms

### Easing

- standard: `ease-out`
- exit: `ease-in`

### Motion Rules

1. Use motion to confirm interaction, not to entertain.
2. Keep motion families limited: fade, lift, subtle slide.
3. Respect reduced motion preferences.
4. Every interactive control gets transition states by default.

### Standard Interaction Recipe

```txt
transition-all duration-200 ease-out active:scale-[0.985]
```

## Shell Architecture

## Top Bar

Top bar goals:

- immediate orientation
- clear session context
- fast access to critical actions
- restrained, premium glass treatment

### Top Bar Rules

1. Height is fixed and consistent by breakpoint.
2. Left area contains brand and campaign/session context.
3. Center area is optional, not overloaded.
4. Right area contains actions and quick utilities.
5. Icon buttons must use the same geometry and state behavior.
6. Utility dropdowns should look like the same family as modals.
7. Top bar uses sans for controls and serif only for the brand wordmark.

### Top Bar Recipe

```txt
border-b border-[color:var(--tv-border-subtle)] bg-[color:var(--tv-bg-surface-1)]/84 backdrop-blur-md
```

## Sidebar

Sidebar goals:

- instantly scannable navigation
- stronger active state
- cleaner typography
- more app-like and less ornamental

### Sidebar Rules

1. Navigation labels use sans 14px medium.
2. Icons share one visual size.
3. Active nav item uses one standard state:
- elevated surface
- accent hint
- stronger text
- subtle left rail or inset glow, not both if noisy
4. Inactive items should still be readable.
5. Settings item should look identical to other nav items.
6. Resize affordance should be visually cleaner and less intrusive.
7. Mobile nav should feel like the same system, not a separate style language.

### Sidebar Active Item Recipe

```txt
rounded-xl border border-[color:var(--tv-border-strong)] bg-[color:var(--tv-bg-surface-2)] text-[color:var(--tv-text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]
```

## Main Content Area

1. Every view should start from the same max width logic.
2. A faint atmospheric background is allowed, but content readability must dominate.
3. Empty or sparse screens should still feel intentionally framed.

## Right Rail and Combat Panel

1. Character cards must become a shared component family.
2. HP, AC, initiative, and state badges should be standardized.
3. Combat state block and party cards should share consistent spacing and label rules.
4. The right rail should feel quieter and more premium, less boxed-in.

## Component Standards

## Buttons

Buttons are the most urgent standardization target.

### Sizes

- small: h-9
- medium: h-10
- large: h-11 or h-12 on mobile-heavy CTAs

### Button Font

- sans
- 14px
- medium or semibold
- uppercase only when it adds intent clarity
- avoid fantasy font as the default button style

### Variants

#### Primary
Used for main action.

```txt
inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-transparent bg-[color:var(--tv-accent-solid)] px-4 text-sm font-semibold text-white shadow-[var(--tv-shadow-floating)] transition-all duration-200 ease-out hover:brightness-105 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tv-accent-ring)] disabled:cursor-not-allowed disabled:opacity-50
```

#### Secondary
Used for important but non-primary action.

```txt
inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[color:var(--tv-border-subtle)] bg-[color:var(--tv-bg-surface-2)] px-4 text-sm font-medium text-[color:var(--tv-text-primary)] transition-all duration-200 ease-out hover:bg-[color:var(--tv-bg-surface-3)] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tv-accent-ring)] disabled:cursor-not-allowed disabled:opacity-50
```

#### Ghost
Used inside dense utility clusters.

```txt
inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-[color:var(--tv-text-secondary)] transition-all duration-200 ease-out hover:bg-white/5 hover:text-[color:var(--tv-text-primary)] active:scale-[0.985]
```

#### Destructive
Used for delete, leave, remove.

```txt
inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-[color:var(--tv-danger-soft)] px-4 text-sm font-medium text-[color:var(--tv-danger-text)] transition-all duration-200 ease-out hover:bg-rose-500/16 active:scale-[0.985]
```

### Button Rules

1. Buttons with the same semantic role must look identical across the app.
2. Icon placement is always left of text unless icon-only.
3. Loading, disabled, and focus states are mandatory.
4. Avoid using a new gradient recipe for every action.
5. Save and confirm buttons should not look visually unrelated from one modal to another.

## Inputs

### Standard Input Recipe

```txt
h-10 w-full rounded-xl border border-[color:var(--tv-border-subtle)] bg-[color:var(--tv-bg-recessed)] px-4 text-sm text-[color:var(--tv-text-primary)] placeholder:text-[color:var(--tv-text-muted)] shadow-inner transition-colors duration-200 ease-out focus:border-[color:var(--tv-accent-ring)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tv-accent-ring)]/40 disabled:cursor-not-allowed disabled:opacity-50
```

### Textarea Recipe

```txt
w-full rounded-xl border border-[color:var(--tv-border-subtle)] bg-[color:var(--tv-bg-recessed)] px-4 py-3 text-sm leading-relaxed text-[color:var(--tv-text-primary)] placeholder:text-[color:var(--tv-text-muted)] shadow-inner transition-colors duration-200 ease-out focus:border-[color:var(--tv-accent-ring)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tv-accent-ring)]/40
```

### Input Rules

1. Inputs, selects, and textareas share the same family.
2. Label spacing is consistent everywhere.
3. Recessed treatment should make controls feel tactile, not flat.
4. Errors must use text plus color; never color only.

## Dropdowns and Menus

1. Menus should feel like mini floating panels.
2. Menu items use sans and compact spacing.
3. Hover states are subtle, not neon.
4. Divider lines are low-contrast.
5. Menus should visually connect to the shell.

## Cards

### Standard Data Card

```txt
rounded-xl border border-[color:var(--tv-border-subtle)] bg-[color:var(--tv-bg-surface-2)] p-4 shadow-[var(--tv-shadow-panel)]
```

### Card Rules

1. Cards should not invent their own typography scales.
2. Metadata and headline spacing must be consistent.
3. Cards can have accent glow only when it communicates importance.
4. Cards should be modular enough to appear in chat, side rails, and modal bodies.

## Badges and Chips

1. Small metadata only.
2. Use sans 11px or 12px.
3. Keep them quiet.
4. Use accent chips sparingly to avoid noisy UI.

## Empty States

### Empty State Recipe

```txt
rounded-2xl border-2 border-dashed border-[color:var(--tv-border-subtle)] bg-[color:var(--tv-bg-surface-2)]/55 p-6 text-center
```

### Empty State Rules

1. One muted icon.
2. Short headline.
3. Helpful next step.
4. Serif allowed only in headline if it enhances tone.
5. Never use loud illustrations that break the mood.

## Modal System

The modal shell already exists in [src/components/ModalFrame.jsx](src/components/ModalFrame.jsx). It should become the primary modal primitive and remain the only modal chrome pattern.

### Modal Rules

1. Title line uses serif.
2. Subtitle uses sans or readable body style.
3. Close button must share one recipe.
4. Footer actions use the standardized button system.
5. Internal layout should use section blocks, not random stacks.
6. Mobile modals must behave like premium sheets, not cramped dialogs.

### Modal Content Structure

Preferred structure:

1. Header
2. Intro / context text
3. Form or content section(s)
4. Footer actions

## Chat System

Chat is one of the most visible and active parts of the product. It must be both stylish and highly legible.

### Chat Problems To Correct

Based on current structure in [src/components/ChatView.jsx](src/components/ChatView.jsx):

1. Message color system is too custom and risks visual fragmentation.
2. Bubble geometry and metadata hierarchy need to be standardized.
3. Input area must feel more premium and more intentional.
4. Dice-result messages should be a named variant, not just another colored block.

### Chat Rules

1. Bubble shapes must be consistent.
2. Timestamp, author label, and metadata must use one hierarchy.
3. Author colors may vary, but structure must not.
4. Dice messages should use a shared stat-card visual language.
5. Message input area should always feel anchored and polished.
6. Composer actions use the global button and icon-button system.

### Chat Bubble Hierarchy

- author / metadata: 12px muted
- main message: 14px readable
- result total: 28px serif only for major dice outcomes
- breakdown: 12px or 13px sans

## Navigation and Utility Icons

1. Icon size should be standardized by context.
2. Icon buttons must use one shared recipe.
3. Decorative glow is allowed only for truly active or high-priority states.
4. Avoid mixed icon densities in the same row.

## Accessibility and Intuition Standards

1. All tap targets must be at least 40px tall.
2. Mobile critical actions should often be 44px to 48px.
3. Focus states must exist on all interactive components.
4. Text contrast should remain readable under all supported themes.
5. Important actions must be recognizable by shape and placement, not color alone.
6. Dense fantasy styling must never reduce scan speed.

## Tailwind Architecture Rules

This refactor should not produce more one-off class strings. It should reduce them.

### Rules

1. Shared recipes should be centralized.
2. Semantic class groups should be preferred over repeating huge utility bundles.
3. Surface, button, input, chip, and empty-state recipes should be reusable.
4. Theme-aware values should come from semantic variables whenever possible.
5. Component files should read like systems, not like visual experiments.

### Suggested Shared Recipe Families

- `tv-panel`
- `tv-panel-elevated`
- `tv-panel-recessed`
- `tv-btn-primary`
- `tv-btn-secondary`
- `tv-btn-ghost`
- `tv-btn-danger`
- `tv-icon-btn`
- `tv-input`
- `tv-textarea`
- `tv-label`
- `tv-empty-state`

## File Priorities For First Refactor Wave

### Wave 1: Shell and Visual Grammar

1. [src/components/TopBar.jsx](src/components/TopBar.jsx)
- normalize icon buttons
- simplify session menu chrome
- modernize action grouping
- reduce fantasy font usage in controls

2. [src/components/Sidebar.jsx](src/components/Sidebar.jsx)
- convert nav typography to sans
- unify active state
- improve resize affordance
- align mobile and desktop nav language

3. [src/components/ModalFrame.jsx](src/components/ModalFrame.jsx)
- convert to semantic surface recipes
- make close button and heading treatment canonical

### Wave 2: High-Frequency Interaction Surfaces

4. [src/components/ChatView.jsx](src/components/ChatView.jsx)
- standardize message cards
- standardize composer
- reduce noisy color variance
- improve metadata hierarchy

5. [src/components/SettingsModal.jsx](src/components/SettingsModal.jsx)
- convert to canonical form layout
- use shared button and input recipes

6. [src/components/SessionManageModal.jsx](src/components/SessionManageModal.jsx)
- improve primary action clarity
- simplify grouped information blocks

### Wave 3: Supporting Views and Cards

7. Inventory and handout cards
8. right rail / combat cards
9. preparation cards
10. empty states across all views

## Refactor Order

### Phase 1: Foundations

1. finalize semantic surface tokens
2. finalize typography scale
3. define button recipes
4. define input recipes
5. define icon-button recipe

### Phase 2: Shell

1. top bar
2. sidebar
3. modal shell
4. session menus and dropdowns

### Phase 3: Core Interaction Views

1. chat
2. session management
3. settings
4. right rail and combat cards

### Phase 4: Secondary Views

1. handouts
2. inventory
3. notes
4. preparations

### Phase 5: Quality Pass

1. motion polish
2. empty states
3. accessibility pass
4. mobile ergonomics pass
5. theme parity pass

## Definition of Done

The UI overhaul is not done when it looks better in one screenshot.
It is done when:

1. Every button belongs to one of the defined button families.
2. Every input belongs to one input family.
3. Serif is used intentionally, not habitually.
4. Sidebar, top bar, chat, and modals feel like one product.
5. Theme changes preserve hierarchy and quality.
6. Mobile and desktop feel like the same application.
7. There are no new one-off visual recipes unless intentionally added to the design system.
8. The interface looks premium without becoming busy.

## Anti-Rules

Do not do the following during the overhaul:

1. Do not invent a new button style for a single feature.
2. Do not use fantasy font for every label or utility control.
3. Do not rely on strong borders to create hierarchy.
4. Do not use pure black backgrounds.
5. Do not use random gradients as a substitute for component design.
6. Do not let color carry all the meaning.
7. Do not create a separate mobile style language.

## Final Creative Direction Summary

TomeVault should feel like this:

- serious enough for long-form campaign play
- soft and tactile like a high-end mobile app
- atmospheric without becoming theatrical
- modern first, fantasy second
- consistent enough that users trust it immediately

If a future design choice is stylish but inconsistent, the consistent choice wins.
