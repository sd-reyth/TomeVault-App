# Third-Party Notices

This project uses third-party libraries, SDKs, and CDN-hosted resources.

This file is for tracking and release hygiene, not legal advice. Re-check upstream terms before each public release.

## NPM dependencies

### cheerio (^1.2.0)
- Where used: project scripts/tooling in this workspace.
- Source: npm registry.
- License context: package-lock entries are permissive (MIT / BSD-2-Clause / ISC in current lockfile tree).

## CDN scripts/fonts used by the app

### Google Fonts (Open Sans)
- Hosts: fonts.googleapis.com, fonts.gstatic.com
- Where used: `index.html`

### qrcodejs
- Host: jsDelivr
- Where used: `index.html`

### html5-qrcode
- Host: cdnjs
- Where used: `index.html`

### tesseract.js
- Host: jsDelivr
- Where used: `index.html`

### Firebase JS SDK (ESM)
- Host: gstatic
- Where used: `index.mjs`

## Practical compliance reminders
- Keep dependency versions and CDN URLs pinned and reviewed.
- Keep this file updated when adding/removing third-party code.
- Include attribution/notice text when a license requires it.

## Pre-publish checklist
- [ ] Re-check license terms for all dependencies and CDN resources currently used.
- [ ] Confirm required notices/attributions are included.
- [ ] Archive proof links/screenshots of license pages used for verification.
