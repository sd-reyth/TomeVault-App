# Audit Log

Last run: 2026-03-31

## Completed Items
- [DONE] 2B-viewport-fit — Expanded the desktop app shell and player screen layout so core screens use more of the visible viewport without page-level overflow — 2026-03-31
- [DONE] 2B-player-view-balance — Rebalanced the desktop player view rail widths and row sizing so the party and chat side panels no longer feel undersized — 2026-03-31
- [DONE] 2E-player-feed-clutter — Removed claimed player loot from the revealed handouts feed so claimed items live in inventory instead of appearing twice — 2026-03-31
- [DONE] 2A-player-chat-density — Compacted the player mini-chat preview and suppressed redundant status copy during normal loaded state — 2026-03-31
- [DONE] 2H-turn-tracker-polish — Restyled the player turn tracker strip to read as a deliberate highlighted status element instead of muted metadata — 2026-03-31
- [DONE] 2B-gm-dashboard-balance — Widened and rebalanced the desktop GM dashboard columns and moved party scrolling into the inner list region — 2026-03-31
- [DONE] 2A-settings-hierarchy — Strengthened settings drawer hierarchy with a roomier panel, sticky header, and larger grouped section spacing — 2026-03-31
- [DONE] 2F-inventory-consistency — Normalized inventory panel spacing, item card alignment, and amount badge sizing for more consistent desktop readability — 2026-03-31
- [DONE] 2B-lightmode-drawer-header — Added a matching light-mode sticky drawer header background so the settings hierarchy holds in both themes — 2026-03-31
- [DONE] 2A-profile-edit-hierarchy — Improved profile edit-mode structure, save-status rhythm, and tab treatment so the profile screen reads as a cohesive editor — 2026-03-31
- [DONE] 2A-gm-social-hierarchy — Tightened the GM social panel metadata and invite action spacing for clearer session-info hierarchy — 2026-03-31
- [DONE] 2D-lightmode-profile-polish — Added light-mode overrides for new profile edit and tab surfaces so the same hierarchy works on parchment theme — 2026-03-31
- [DONE] 2A-settings-drawer-grouping — Reorganized the settings drawer into guidance, appearance, role, tools, and danger sections for clearer scanability — 2026-03-31
- [DONE] 2B-mobile-fit-polish — Added targeted small-screen layout refinements for settings drawer, GM social panel, profile, and inventory screens — 2026-03-31
- [DONE] 2A-player-party-action-cleanup — Removed duplicate player party-row chat action and initiative-order helper copy to reduce right-rail clutter — 2026-03-31
- [DONE] 2F-player-action-font-fix — Corrected player party action buttons to use UI control typography instead of heading typography — 2026-03-31
- [DONE] 2A-handout-modal-image-polish — Reworked shared handout modal image sizing/crop/frame so artwork no longer dominates the dialog — 2026-03-31
- [DONE] 2B-handout-modal-fit — Reduced shared handout modal title/image scaling and normalized conflicting mobile overrides to keep modal content within viewport — 2026-03-31
- [DONE] 2B-handout-modal-runtime-transform-fix — Disabled aggressive saved frame zoom/offset transforms for detail modal images to prevent oversized modal artwork — 2026-03-31
- [DONE] 2B-handout-modal-selector-consolidation — Unified shared handout modal image sizing into one variable-driven selector path across desktop/mobile breakpoints — 2026-03-31
- [DONE] 2H-modal-leave-idempotence — Made shared modal leave cleanup idempotent and aligned leave timeout to UI_TIMERS.MODAL_LEAVE_MS — 2026-03-31
- [DONE] 2B-asset-version-bump — Bumped style and module asset query versions after modal runtime/CSS fixes — 2026-03-31

- [DONE] 2B-whole-app-viewport-fit — Expanded viewport-fit block from 10 session screens to all 13 screens (added landing, gmCreate, plJoin) so every screen is height-constrained to the visible viewport — 2026-03-31
- [DONE] 2B-chrome-position-tokenization — Replaced hardcoded px values in toast stack (78px), speed-dial (140px), settings drawer padding (92px), and layout bottom padding (112px/desktop+mobile) with chrome token formulas so breakpoint changes propagate automatically — 2026-03-31
- [DONE] 2B-player-handouts-panel-surface — Normalized .playerHandoutsPanel to shared card surface tokens (--card, --card-border, --shadow-md) removing hardcoded role-specific gradient — 2026-03-31
- [DONE] 2B-asset-version-sync — Synced CSS (ui10→ui11) and JS (ui8→ui11) cache-bust version tokens to the same value in index.html — 2026-03-31
- [DONE] 2B-modal-height-tokenization — Replaced remaining shared modal and create/review modal height literals with tokenized viewport formulas so dialog fit behavior is consistent across desktop and mobile breakpoints — 2026-03-31
- [DONE] 2B-mobile-chrome-padding-tokenization — Replaced leftover mobile drawer, layout, and create-handout modal bottom padding literals with chrome-token formulas to keep bottom-bar clearance consistent at 800px and 480px breakpoints — 2026-03-31
- [DONE] 2B-asset-version-bump-ui12 — Bumped both frontend asset query strings to ui12 after the modal/chrome tokenization pass — 2026-03-31
- [DONE] 2B-phase5-static-verification — Re-ran static breakpoint and selector verification for 1280px+, 800px, and 480px CSS paths; no relevant diagnostics remained and the previous hardcoded viewport/chrome literals targeted by this pass were eliminated — 2026-03-31
- [DONE] 2B-gm-topbar-parity — Removed GM-only topbar accent overrides so GM and Player share the same topbar surface and border treatment in dark and light theme — 2026-03-31
- [DONE] 2B-gm-chat-action-dedup — Removed the duplicate GM party-bar Chat action so the Party Chat panel remains the single dashboard chat entry point — 2026-03-31
- [DONE] 2B-gm-dashboard-scroll-ownership — Moved the desktop GM dashboard toward the same overflow model as Player View by making the outer screen shell non-scrolling and shifting handout overflow into the handout list region — 2026-03-31
- [DONE] 2B-asset-version-bump-ui13 — Bumped both frontend asset query strings to ui13 after the GM parity and scroll-ownership fix pass — 2026-03-31
- [DONE] 2B-rail-tabs-desktop-gm-player — Added desktop-only right-rail tab switching (Party/Chat) for GM and Player views so chat remains reachable without vertical squeeze; mobile remains stacked — 2026-03-31
- [DONE] 2B-modal-center-alignment — Centered shared modal container alignment and preserved internal scroll so handout modals stay within viewport bounds more reliably — 2026-03-31
- [DONE] 2B-rail-tabs-lightmode-overrides — Added illuminated-manuscript light-mode overrides for rail tab borders/hover/active/badge states — 2026-03-31
- [DONE] 2B-asset-version-bump-ui14 — Bumped both frontend asset query strings to ui14 after desktop rail tab + modal alignment updates — 2026-03-31

## Pending Suggestions