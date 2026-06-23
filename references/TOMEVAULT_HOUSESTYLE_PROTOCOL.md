# TomeVault Housestyle Protocol

## Purpose

This document is the binding protocol for TomeVault's visual system.
It defines how every screen, panel, modal, control, rail, toolbar, and responsive breakpoint must behave.

The goal is not isolated beautification.
The goal is one enforceable interface language.

## Scope

This protocol governs:

- screen composition
- responsive behavior
- theme interaction
- action semantics
- tokens
- typography
- spacing
- borders
- shadows
- radius
- overlays
- effects
- buttons
- forms
- toolbars
- cards
- rails
- modals
- empty states
- state communication
- interaction density
- overlap rules
- placement rules
- scaling rules
- text limitation rules
- info reveal patterns
- clickable function rules

## Precedence

When UI decisions conflict, use this order:

1. feature behavior must remain correct
2. shared protocol beats local preference
3. screen recipe beats one-off composition
4. readability beats decoration
5. content priority beats action density
6. uniformity beats novelty

## Core Laws

1. TomeVault is a modern dark fantasy app, not a HUD and not a generic admin dashboard.
2. The UI must be theme-aware through semantic tokens, never through random feature-level theme colors.
3. Shared primitives own style decisions; feature components consume them.
4. Every screen gets one primary shell and one primary header.
5. Embedded content blocks may not reintroduce a second hero header unless they are rendered standalone.
6. On constrained widths, the app must remove or collapse utility chrome before compressing core content.
7. Every control must expose obvious hover, focus, press, disabled, and error behavior.
8. Every view must feel intentionally framed even when empty.
9. Effects are support material, not the main visual language.
10. If a user changes the house style, the app must be able to absorb that change through shared layers.
11. Functional affordances must be standardized, not improvised per modal or per screen.
12. Copy should default to the shortest version that preserves comprehension.
13. Secondary explanation belongs behind purposeful reveal patterns when it would otherwise bloat the interface.

## Token Protocol

All theme-sensitive styling must resolve through semantic tokens.

Required token groups:

- app backgrounds
- panel surfaces
- recessed surfaces
- subtle borders
- strong borders
- primary text
- secondary text
- muted text
- accent solid
- accent soft
- accent text
- accent ring
- danger soft
- danger text
- success soft
- success text
- panel shadow
- floating shadow

Rules:

1. Feature components may not hardcode palette intent with raw accent colors unless the color is content data, not interface chrome.
2. A theme change must be able to happen primarily in `src/index.css` and shared primitives.
3. Brightness settings may lift or dim surfaces, but may not destroy hierarchy.
4. Accent is a highlight language, not a full-surface default.

## Typography Protocol

There are only two font roles.

1. UI Sans
2. Fantasy Serif

Usage rules:

1. Sans is the default for navigation, buttons, forms, filters, badges, helper text, metadata, timestamps, list items, tabs, and toolbars.
2. Serif is reserved for brand, page titles, modal titles, select section titles, and occasional ceremonial numeric emphasis.
3. Do not use serif for dense utility controls.
4. Do not mix multiple decorative treatments inside one compact toolbar.

Approved scale:

- 10px for micro labels
- 12px for metadata and support copy
- 14px for standard body and button text
- 16px for strong values and emphasized body
- 20px for section titles
- 28px for page titles

Case and spacing rules:

1. Uppercase is allowed for micro labels, chips, and utility captions.
2. Uppercase may not be the dominant case style of long copy.
3. Tracking must be restrained and consistent.
4. Truncation is allowed for titles only when the surrounding structure still preserves meaning.

## Spacing Protocol

The interface follows a 4px grid.

Approved spacing values:

- 4
- 8
- 12
- 16
- 20
- 24
- 32

Rules:

1. Default panel padding is `p-4`, `p-5`, or `p-6` depending on density and breakpoint.
2. Dense utility groupings use `gap-2` or `gap-3`.
3. Standard screen stacks use `gap-4` or `gap-6`.
4. Arbitrary padding values are forbidden unless a component recipe documents them.
5. If two adjacent screens need different padding rules, one of them is probably not following the shared recipe.

## Radius Protocol

Approved radius families:

- major shells: `rounded-2xl` or equivalent
- standard cards: `rounded-xl`
- inputs and buttons: `rounded-xl` or `rounded-lg`
- pills and chips: `rounded-full`

Rules:

1. Sharp corners are not part of the TomeVault system.
2. Radius should communicate hierarchy, not randomness.
3. Button and input radius should feel related.

## Border And Shadow Protocol

Rules:

1. Standard borders are 1px.
2. Standard borders are low-contrast separators, not decorative strokes.
3. Bright or thick borders are reserved for active, focus, error, or deliberate emphasis states.
4. Panel shadows create depth quietly.
5. Floating shadows belong to elevated actions, menus, and modals.
6. Do not invent new shadow recipes inside features when shared ones suffice.

## Motion And Effects Protocol

Allowed motion families:

- fade
- lift
- subtle slide
- restrained glow

Timing rules:

- hover: 140ms to 180ms
- press: 80ms to 120ms
- enter: 220ms to 280ms
- panel fade: 180ms to 220ms

Effect rules:

1. Hover states may brighten, lift, or add soft contrast.
2. Press states must compress slightly.
3. Persistent glows are only for active states, urgent states, or theme-driven focal emphasis.
4. Blur is structural atmosphere, not decoration spam.
5. If an effect competes with text legibility, remove the effect.

## Responsive Protocol

Breakpoints are not just width switches.
They are behavior switches.

Rules:

1. A layout may not remain split if either column loses functional readability.
2. When content and utilities compete, utilities collapse first.
3. Full-width stacked actions are allowed on small screens only when they serve one clear task cluster.
4. Dense filter sets must collapse behind a summary or drawer before they consume the first viewport.
5. Split-screen sidebars must become overlay or bottom-sheet behavior before the main content becomes cramped.
6. Screen headers on small screens must show only the primary information and one primary action cluster.
7. Icon-only buttons must still meet minimum touch targets.

Minimum targets:

- touch target minimum: 40px, prefer 44px for primary taps
- icon-only action button minimum: 40px
- compact micro-action minimum: 32px only inside dense rails, never for primary actions

## Placement And Alignment Protocol

Rules:

1. Every screen needs a clear reading path from title to control cluster to content.
2. Primary actions live in the header or footer, not both, unless the screen is long and task-driven.
3. Data cards align values consistently within a family.
4. Titles align with their content region; they should not appear detached from the block they describe.
5. Utility clusters align as a group; random floating controls are forbidden.
6. If two small buttons visually punch outside the parent block, the parent layout is wrong.

## Functional Affordance Protocol

Interactive surfaces are divided into these families:

- primary buttons
- secondary buttons
- ghost buttons
- destructive buttons
- icon-only actions
- clickable text
- clickable rows and cards
- toggles and switches
- reveal actions
- confirm and cancel actions

Rules:

1. Every family must have one shared visual grammar.
2. The same user intent must look the same across the app.
3. Confirm and cancel actions may not reinvent themselves in each modal.
4. Clickable text is allowed only when it is genuinely lighter than a button and still clearly interactive.
5. Cards and rows that open detail views must feel tappable as a whole, not rely on hidden hotspots.
6. Reveal actions like info, help, or advanced settings must look quieter than primary actions.

## Cancel And Confirm Protocol

Rules:

1. Cancel is never the primary visual weight unless canceling is itself the safest core action.
2. Cancel must use one shared secondary or ghost grammar across confirms and modals.
3. Confirm must map to the action type: primary, destructive, or neutral commit.
4. End-combat, delete, leave-session, and similar dangerous commits must never style cancel ambiguously.
5. Button order must stay consistent within the same device pattern.

## Clickable Text Protocol

Rules:

1. Clickable text must be visually distinct from inert copy.
2. It should use underline, accent tint, or another shared affordance pattern, not random styling.
3. It must expose hover, focus, and active states.
4. It should be used for lightweight reveal, navigation, or contextual actions, not for core destructive commits.
5. If a text action becomes too important or too long, it should become a button or row action instead.

## Text Economy Protocol

Rules:

1. Every line of support copy must justify its presence.
2. Screens should prefer short subtitles over multi-sentence intros.
3. Repeated explanation must be removed from repeated cards and rows.
4. Dense operational screens should show status first and explanation second.
5. Long descriptive copy should be hidden behind information reveal patterns when it interferes with action or scan speed.

## Text Limitation Protocol

Rules:

1. Buttons should usually use one or two words.
2. Chips, badges, and pills must stay extremely short.
3. Titles should truncate before breaking layout.
4. Micro surfaces must not hold verbose helper text inline.
5. Long text belongs in a dedicated detail surface, expandable region, tooltip-like helper, or modal.
6. If information is important but infrequent, default to summary plus reveal.

## Information Reveal Protocol

Approved reveal patterns:

- info button
- collapsible section
- secondary details drawer or sheet
- tooltip-like helper pattern
- expandable inline details block

Rules:

1. Reveal patterns exist to protect the main layout from explanatory overload.
2. Reveal actions must be visually quieter than the primary task path.
3. Hidden information must still be easy to discover.
4. A screen may not use reveal patterns to hide critical safety information.
5. Repeated long helper text should be converted to one reveal source, not repeated on every item.

## Overlap And Layering Protocol

Rules:

1. Overlap is opt-in, never accidental.
2. Text may not lose readable width because a decorative or utility element sits on top of it.
3. Floating badges may overlap media, not dense text columns, unless reserved space exists.
4. Sticky or floating panels must preserve safe spacing from shell edges.
5. Backdrops, menus, sheets, and modals must have a clear z-index hierarchy.
6. A control may not visually sit outside its parent intent unless it is a deliberate anchored overlay.

## Screen Anatomy Protocol

Every primary view must follow one of these screen recipes.

### Recipe A: Library Screen

Use for handouts, preparations, searchable collections, and similar browse-heavy views.

Structure:

1. screen shell
2. one connected header
3. header action cluster
4. search row
5. collapsible or summarized filter row
6. result summary
7. result region

Rules:

1. Search is first-class.
2. Filters must not dominate the first viewport on mobile.
3. View switchers are secondary utilities.
4. Create action is the primary CTA.

### Recipe B: Ledger Screen

Use for inventory, wallets, and value-driven resource views.

Structure:

1. screen shell
2. header with title, subtitle, aggregate value, primary CTA
3. content section immediately under header
4. embedded resource blocks without their own hero header
5. lists or cards below

Rules:

1. Aggregate value belongs to the screen header when it is the screen's main metric.
2. Embedded wallet or section components must support standalone and embedded modes.
3. Resource cards may not recreate another header hierarchy inside the screen header zone.

### Recipe C: Conversation Or Editor Screen

Use for chat, notes, and writing-heavy views.

Structure:

1. shell
2. quiet header
3. primary content plane
4. composer or editor footer if needed

Rules:

1. Controls stay quiet.
2. Content legibility is dominant.
3. The shell should feel continuous, not stacked from loose cards.

### Recipe D: Rail Or Tactical Screen

Use for right sidebar, combat, initiative, and fast-operating rails.

Structure:

1. rail shell
2. compact status block
3. optional contextual help or join panel
4. list of tactical cards
5. footer actions only when required

Rules:

1. Status and content get priority over utilities.
2. A rail card may not spend more width on action chrome than on character information.
3. Repeated stats must be consolidated.
4. Dense destructive actions must move into overflow when width is constrained.

### Recipe E: Modal Or Sheet Screen

Use for all modals, drawers, and sheets.

Structure:

1. modal shell
2. title row
3. optional intro copy
4. structured content sections
5. footer actions

Rules:

1. All modal chrome comes from the shared modal primitive.
2. Footer action layout is consistent across forms.
3. Mobile modals must feel like premium sheets, not squeezed dialogs.

## Header Protocol

Rules:

1. A screen gets one primary title.
2. A screen header may contain title, subtitle, one aggregate metric cluster, and one primary action cluster.
3. If more than one toolbar row exists, one of them must become collapsible on small screens.
4. Embedded components inside the screen body may not start by visually competing with the screen header.

## Toolbar Protocol

Rules:

1. Toolbar items are grouped by priority.
2. Primary action comes last visually on left-to-right layouts unless a different flow is functionally stronger.
3. View toggles, filter toggles, and sort toggles are secondary utilities.
4. On mobile, toolbar controls stack only if they still read as one cluster.
5. If the toolbar becomes taller than the first useful content block, it is too heavy.

## Buttons And Actions Protocol

Button sizes:

- small: h-9
- medium: h-10
- large: h-11 or h-12 for mobile-heavy CTAs

Rules:

1. Primary, secondary, ghost, and destructive variants are shared system variants.
2. Buttons of the same meaning must look the same across screens.
3. Icon-only buttons must have clear hover, focus, pressed, and disabled states.
4. A primary button should not appear weaker than a nearby secondary control.
5. Gradients are variant-level decisions, not feature-level improvisation.
6. Micro action buttons belong in rails or inline utilities, not as substitutes for main actions.
7. Icon-only buttons must default to shared sizes and may not create their own spacing geometry.
8. If a compact action forces a title, stat, or main value to compress, the action must collapse, move, or hide first.

## Forms And Filter Controls Protocol

Rules:

1. Inputs, selects, and textareas are one family.
2. Labels, help text, and error text follow one spacing system.
3. Error communication requires both color and text.
4. Filter rows should feel like tooling, not like separate content cards.
5. Search, sort, and filter controls must remain visually related even when stacked.

## Card Protocol

Rules:

1. Cards belong to families.
2. Cards in the same family share padding, title scale, metadata placement, and stat alignment.
3. Tactical cards prioritize identity, critical stats, then utilities.
4. Decorative badges may not steal width from content.
5. Cards may glow only when state meaning justifies it.

## Rail Card Protocol

Rules:

1. A rail card must work in narrow widths before enhancements are added.
2. Identity block comes first.
3. Critical stats come second.
4. Utilities come last and may collapse.
5. Initiative, HP, AC, conditions, and turn state must use one consistent grammar across all tactical cards.

## Modal And Sheet Protocol

Rules:

1. The close affordance is consistent across all modals.
2. Footer buttons align consistently.
3. Long forms must scroll inside the body, not break the outer shell.
4. Mobile button stacks use large tap targets.
5. Modal bodies use structured sections, not arbitrary piles of fields.

## State Communication Protocol

Every interactive element must define:

- default state
- hover state
- focus state
- active state
- disabled state
- loading state when applicable
- error state when applicable
- selected state when applicable

Rules:

1. State changes must be visually obvious but not loud.
2. A selected control must feel related to the current theme.
3. Disabled controls must remain legible enough to explain themselves.
4. Busy state may not masquerade as broken state.

## Empty, Error, And Loading Protocol

Rules:

1. Empty states must feel framed and intentional.
2. Error states must be calm, clear, and actionable.
3. Loading states should preserve layout shape when possible.
4. Empty states may not look like unfinished screens.

## Theme Interaction Protocol

Rules:

1. Theme changes must propagate through tokens first.
2. Contrast must remain readable in every theme.
3. Accent usage must remain sparse enough that changing accent does not destroy hierarchy.
4. Danger, success, warning, and info states must remain semantically distinct from the active theme accent.
5. Brightness controls may not flatten all surfaces into the same value.
6. Light themes, especially Dawn, must be used as drift detectors for stray dark-surface CSS and hardcoded panel colors.
7. Middle-canvas surfaces and right-rail surfaces must preserve separation and depth in both dark and light themes.
8. If a theme only works because of feature-level overrides, the token system is incomplete.

## Enforcement Workflow

For every future UI task:

1. identify the screen recipe involved
2. identify whether the issue belongs to tokens, primitive, shell, layout recipe, or feature markup
3. fix the highest reusable layer first
4. check whether the change cascades to sibling screens
5. update shared docs if a new rule is introduced
6. validate the touched slice

If a change cannot be centralized yet, it must be documented as technical design debt in the propagation protocol.
