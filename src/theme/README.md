# src/theme — Design tokens + ThemeProvider

Single source of truth for all CSS custom properties.

Target (Wave 1):
- `tokens.css` — all --tv-* custom properties (extracted from index.css)
- `themes/` — per-theme overrides (ember-forge.css, midnight-tome.css, etc.)
- `ThemeProvider.jsx` — data-theme + brightness management

Rule: index.css imports only tokens.css + ui/primitives.css + Tailwind.
No feature-specific CSS in tokens.
