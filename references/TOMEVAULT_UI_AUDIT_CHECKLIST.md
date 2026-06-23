# TomeVault UI Audit Checklist

## Purpose

This checklist is used to audit every TomeVault screen, panel, modal, sheet, rail, and hidden flow.
It exists to catch drift before it becomes visible inconsistency.

Use it for:

- screen polish passes
- responsiveness fixes
- theme QA
- modal cleanup
- house-style refactors
- pre-release visual review

## How To Use This Checklist

For each surface in `references/TOMEVAULT_UI_SURFACE_INVENTORY.md`:

1. identify the surface type
2. identify the screen recipe it should follow
3. audit the categories below
4. record pass, fail, or debt
5. centralize fixes where possible

## Audit Categories

### 1. Shell And Recipe

- Does the screen follow the correct recipe: library, ledger, conversation, rail, or modal?
- Is there exactly one primary header?
- Does the screen feel like one connected shell rather than stacked unrelated boxes?
- Are embedded components behaving as embedded content instead of standalone hero blocks?

### 2. Header And Hierarchy

- Is the title clearly the primary heading?
- Is the subtitle short and useful?
- Is the primary metric placed in the header only when it is a core screen metric?
- Is the primary action obvious?
- Are secondary actions reduced or grouped?

### 3. Content Priority

- Is the most important content visible without first fighting utility chrome?
- On smaller widths, do utilities collapse before content is compressed?
- Are data, text, and states more prominent than decorative or admin-only actions?

### 4. Button And Action Protocol

- Do primary actions use the shared primary button variant?
- Do cancel actions use the shared secondary or ghost variant consistently?
- Do destructive actions look destructive but not louder than necessary?
- Are icon-only actions reserved for well-understood utilities?
- Do icon-only actions preserve a proper touch target?
- Are action clusters visually ordered by importance?
- Are dense clusters reduced to overflow when width is constrained?

### 5. Clickable Text And Interactive Copy

- Is clickable text unmistakably interactive?
- Is it visually differentiated without becoming noisy?
- Does it have hover, focus, and active states?
- Is clickable text used only when a button or list row would be heavier than needed?
- Is destructive text never disguised as ordinary copy?

### 6. Text Economy And Information Reveal

- Is default copy minimal and scannable?
- Is repeated explanatory copy removed where context already explains it?
- Is long help text moved behind an info action, collapsible section, help block, or tooltip-style pattern?
- Are labels, subtitles, and helper text free of rambling language?
- Are empty states concise and actionable?

### 7. Text Limitation Rules

- Do titles truncate gracefully when necessary?
- Do badges and chips stay short?
- Do buttons avoid verbose labels when icon-plus-short-text or icon-only is clearer?
- Do compact surfaces avoid multiline utility labels?
- Is overflow handled intentionally instead of leaking or colliding?

### 8. Spacing, Padding, And Borders

- Does the surface use shared spacing values?
- Do stacked groups use consistent gaps?
- Does padding match the component family?
- Are borders soft and thematic instead of random or harsh?
- Are borders aligned with grouping and state meaning?

### 9. Overlap And Layout Safety

- Do badges, buttons, or floating indicators steal space from content?
- Does any control appear to sit outside its parent block accidentally?
- Are overlays and chips anchored intentionally?
- Is there safe spacing near edges and corners?

### 10. Inputs, Filters, And Forms

- Do inputs, selects, and textareas use the same family?
- Are labels and helper text consistently spaced?
- Do filter rows feel like one tool cluster?
- On mobile, do filters collapse before taking over the whole first viewport?
- Are form actions aligned consistently in footers?

### 11. Card Families

- Does the card clearly belong to a known family?
- Are title, stats, and utilities aligned consistently?
- Are repeated stat recipes shared across sibling cards?
- Are decorative glows reserved for meaningful state?

### 12. Responsive Behavior

- Does the layout stop splitting before readability breaks?
- Do headers simplify on mobile?
- Do secondary actions collapse or move into overflow?
- Do footer actions stack cleanly in modals?
- Do cards reflow without crushed text?

### 13. Theme QA

- Does the surface still work in the darkest theme?
- Does the surface still work in the lightest theme?
- In Dawn specifically, do the middle canvas and right rail still preserve depth and contrast?
- Are there any surfaces that reveal hardcoded dark or light CSS values?
- Do danger, success, and accent states stay semantically distinct from the theme accent?

### 14. State Clarity

- Are hover, focus, pressed, disabled, loading, selected, and error states all obvious?
- Is current, active, or selected state clear without overwhelming the screen?
- Are busy states distinguishable from disabled states?

### 15. Modal And Sheet Quality

- Does the surface use the shared modal shell?
- Is the header consistent with other modals?
- Does the cancel action look like a cancel action everywhere?
- Does the footer use the shared action grammar?
- Does the content scroll inside the body rather than break the outer shell?

### 16. Hidden Surface Audit

- Has the associated hidden or alternate-state surface also been checked?
- Have confirmation dialogs, empty states, error states, and secondary tabs been visited?
- Has theme QA been done on those hidden states too?

## Surface-Specific Audit Notes

### Right Sidebar And Combat

- Initiative, HP, AC, conditions, and actions must fit one tactical card grammar.
- On narrow widths, content beats action density.
- End-combat and pause flows must use the same action hierarchy as the rest of the app.
- Cancel actions in confirmation flows must always map to the shared non-primary action standard.

### Library Screens

- Search first.
- Filters second.
- Utility toggles reduced.
- Results visible quickly.

### Ledger Screens

- Aggregate metric in header.
- Embedded content does not rebuild its own headline hierarchy.
- Add/create action should not compete with the value metric.

### Modal Flows

- Cancel must always be visually consistent across modals and confirms.
- Confirm must always be clearly stronger than cancel, but not louder than the context requires.
- Secondary explanatory text must be minimized.

## Audit Output Format

For each surface, record:

- recipe
- key pass items
- key fail items
- centralized fix candidates
- feature-local fix candidates
- theme drift notes
