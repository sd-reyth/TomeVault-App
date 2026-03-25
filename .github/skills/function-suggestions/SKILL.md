---
name: function-suggestions
description: "Research competitive tabletop apps and identify high-impact features for TomeVault. Use when exploring feature gaps, prioritizing roadmap items, or evaluating Discord/Reddit/YouTube user requests. Produces a filterable list of feature suggestions aligned with TomeVault's premium digital tabletop vision, implementation complexity estimates, and copilot-instructions.md update recommendations."
argument-hint: "(optional: topic like 'voice chat', 'collaboration', 'mobile')"
user-invocable: true
disable-model-invocation: false
---

# Function Suggestions: Competitive Research & Feature Planning

## When to Use

- **User requests** arrive for features you're unsure about → validate scope
- **Competitor pressure** → analyze what rivals offer (Foundry, Roll20, OwlbearRodeo, D&D Beyond)
- **Community feedback** → scan Reddit threads, Discord servers, forums for feature patterns
- **Roadmap decisions** → compare cost vs. impact across multiple platforms
- **Before implementation** → confirm feature fits TomeVault's premium, cinematic, tactile vision AND update copilot-instructions.md if new UX patterns emerge

## Do Not Use When

- The request is primarily code-quality/performance/storage cleanup in the current repository (use `code-cleanup`).
- The request is primarily a UI compliance audit or direct accessibility remediation in TomeVault screens (use `interface-update`).
- The request is only to debug agent tooling behavior or why a skill did not load (use `troubleshoot`).

## Research Depth: Manual vs. Auto-Invoked

**When you type `/function-suggestions`** (manual invocation):
- Deep-dive all sources listed (Reddit communities, forums, YouTube, Discord, app stores)
- Compile 8–15 candidate features
- Detailed competitive analysis (what works on Foundry, why Owlbear users request it, etc.)
- Full evidence citations (3+ sources per high-confidence feature)

**When I auto-load this skill** (context-driven research):
- Faster scan of top 3–4 relevant sources
- Focus on 3–5 most pressing candidate features
- Lighter citations (1–2 sources per feature)
- Quick go/no-go alignment check against TomeVault vision

---

## Workflow

### Phase 1: Research Coordination
Fetch and synthesize data from multiple sources:
- **Reddit Communities**: r/rpg, r/DMAcademy, r/dndnext, r/DnD, r/VTT, r/FoundryVTT, r/OwlbearRodeo
- **Forums**: EN World, D&D Beyond Forums, RPG.net Forums
- **App Store Scans**: Google Play (tabletop apps), Apple App Store
- **Social Platforms**: YouTube (VTT reviews, D&D actual play), TikTok, Discord (VTT servers)
- **Competitor Apps**: Foundry VTT, Roll20, Owlbear Rodeo, D&D Beyond, MapTool, Astral, FantasyGrounds

Look for:
- Repeated feature requests or complaints
- User pain points (what slows down sessions?)
- Praise for competitor features (what works well elsewhere?)
- Mobile/accessibility friction
- Multiplayer/GM-player flow gaps

### Phase 2: Scope Alignment Check

**Consult [copilot-instructions.md](../../copilot-instructions.md) directly** for the authoritative TomeVault vision and Definition of Done. Cross-reference candidate features against:
- **Product Goal**: Premium digital tabletop companion (cinematic, readable, tactile, fast)
- **TomeVault Screen Rules**: GM/Player priorities and session flow preservation
- **Definition Of Done**: Tokens, motion, mobile, keyboard, states

**Red Flags** (likely out-of-scope):
- Requires fundamental Firebase rewrite or role separation changes
- Adds 50+ new UI states ("bloat" risk)
- Solves problem affecting <5% of users

**Green Lights** (likely in-scope):
- Existing feature users requested across 3+ platforms
- Enhances existing GM/Player flows with <5 new states
- Improves speed, tactile feel, or readability per the vision

### Phase 3: Implementation Planning

For each candidate feature:

1. **Title & 1-line description**
2. **Where it fits**: GM, Player, Both
3. **Why**: User pain point evidence (2–3 sources cited for manual; 1–2 for auto-load)
4. **How**: Visual mockup sketch + interaction flow
5. **Complexity**: Low (1–2 days), Medium (3–7 days), High (1–2 weeks)
6. **Dependencies**: Firebase changes? New icons? CSS additions?
7. **Success metric**: How do you know it worked?

### Phase 3.5: Evidence Capture Standard

For each feature candidate, include a compact evidence block:

- Source: platform/community/app name
- Date observed: YYYY-MM-DD (or month/year when exact date is unavailable)
- Claim: one sentence on what users repeatedly asked for
- Confidence: High, Medium, Low

Minimum evidence requirement:

- High confidence candidate: 3+ independent sources
- Medium confidence candidate: 2 independent sources
- Low confidence candidate: fewer than 2 sources or weak signal

### Phase 4: copilot-instructions.md Audit

Before implementation, check if the feature needs:
- **New visual tokens** → Add to "Visual System" section
- **New button style** → Update "Button & Layout System"
- **New motion pattern** → Add to "Motion System" tiers
- **New role-specific screen rule** → Update "TomeVault Screen Rules"
- **New state requirement** → Add to "Definition Of Done"

If the feature introduces *new* UX patterns not covered by existing instructions, propose concise additions (1–3 lines per pattern).

### Phase 5: Deliverable Format

Output findings as simple text grouped by confidence tier:

```
HIGH CONFIDENCE (User requests 3+ platforms):
─────────────────────────────────────────────
[Feature Title]
- Why: [Brief user pain + evidence]
- Role: [GM / Player / Both]
- Complexity: Low
- Quick sketch: [ASCII or description]
- Updates needed in copilot-instructions.md: [None / Specific sections]
- Scope alignment: ✓ YES [brief reasoning]

MEDIUM CONFIDENCE (Mentioned 1–2 platforms):
─────────────────────────────────────────────
[Feature Title]
- Why: [User pain]
- Role: [GM / Player / Both]
- Complexity: Medium
- Scope alignment: ? MAYBE [specific concern]
  > Ask before implementation? [Yes / No]

LOW CONFIDENCE (No user validation):
─────────────────────────────────────────────
[Feature Title]
- Why: [Logical gap, but unverified]
- Scope alignment: ✗ NO [reason]
- Recommendation: Hold for more data
```

Also include this shared output contract footer:

- Severity of opportunity gap: Critical, High, Medium, Low
- Confidence: High, Medium, Low
- Suggested action: Implement now, Validate first, Defer
- Evidence quality: Strong (3+), Moderate (2), Weak (0-1)

## Quick-Start Action Prompt

Once findings are ready:

```
/function-suggestions START IMPLEMENTATION

[Brief topic or paste findings above]
```

Then proceed to the selected feature using the [interface-update](../interface-update/SKILL.md) skill for UX refinement or default implementation workflows.

## Handoff Gate (Before Building)

Before moving from research to implementation, confirm all four checks:

- Approved feature selected (single candidate identified)
- Scope alignment confirmed against TomeVault UX contract
- Expected files/components impacted are listed
- Verification plan exists (loading, empty, success, error states + mobile/light mode checks)

---

**Use case example**: User requests voice chat in Discord. Research finds Foundry has native WebRTC integration (working), Roll20 requires browser plugin (friction), but OwlbearRodeo users request it every 2 weeks on Reddit. Cross-check against copilot-instructions.md: voice is "tactile" (real-time interaction) and "fast" (no Discord context-switch) → likely HIGH CONFIDENCE. Then draft implementation plan and copilot-instructions.md updates.
