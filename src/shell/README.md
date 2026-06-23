# src/shell — Layout shell components

Purely layout: TopBar, Sidebar, RightRail, ScreenScaffold.
No business logic. Consumes ui/* primitives.

Rules:
- No Firestore calls.
- No handlers except forwarding callbacks.
- No feature-specific markup.

Planned (Wave 2b+):
- `RightRail.jsx` — replaces RightSidebar layout shell
- `ScreenScaffold.jsx` — one-header recipe (Wave 5)
