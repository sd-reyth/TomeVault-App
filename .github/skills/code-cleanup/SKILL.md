---
name: code-cleanup
description: "Repository-wide code cleanup, competing-code detection and consolidation, security and data-protection audit, performance scalability audit, and storage-model review for JavaScript, CSS, HTML, and config. Use when removing redundant code, merging competing implementations into unified solutions, finding inconsistencies, reducing security risk, improving load times under large sessions/high concurrency, and enforcing account-bound persistence with safe phased cleanup plans."
argument-hint: "Optional: scope (full|targeted), mode (audit-only|propose-fixes|apply-safe-fixes), and focus (firebase|security|performance|scalability|storage|accessibility|consistency|all)"
user-invocable: true
disable-model-invocation: false
---

# code-cleanup

Audit and improve code quality across the repository without changing intended behavior.

## When to Use

- You need a full repository cleanup audit.
- You suspect dead code, duplicate logic, or competing implementations of the same feature.
- You want to consolidate fragmented or parallel code paths into a single unified solution.
- You want consistency improvements across JavaScript, CSS, HTML, and config.
- You need large-session and high-concurrency performance checks.
- You need to audit whether data is local-only or account-bound/cloud-backed.
- You need to assess security risks and data-protection posture across the codebase.
- You want a safe, phased plan before making medium-risk refactors.
- You need beginner-friendly explanations for non-obvious code.

## Do Not Use When

- The request is primarily competitive feature research or roadmap prioritization (use `function-suggestions`).
- The request is primarily TomeVault UI token, motion, accessibility, or DM/GM brand compliance work (use `interface-update`).
- The request is only about why skills/instructions/agents were or were not loaded (use `troubleshoot`).

## Inputs

- Scope: full repository or selected folders/files.
- Mode:
  - audit-only: no code edits, report only.
  - propose-fixes: report + patch-ready recommendations.
  - apply-safe-fixes: implement only high-confidence, low-risk fixes.
- Focus:
  - firebase
  - security
  - performance
  - scalability
  - storage
  - accessibility
  - consistency
  - all

Default behavior when inputs are omitted:

- Scope: full
- Mode: audit-only
- Focus: all (with mandatory security, storage-model, and scalability checks)

## Cross-Skill Routing

- If findings are mostly visual-system or accessibility contract violations in TomeVault screens/modals, hand off to `interface-update`.
- If findings reveal major roadmap gaps or repeated user demand not yet implemented, hand off to `function-suggestions`.
- If cleanup depends on changing customization-file behavior (skill loading, frontmatter, applyTo rules), hand off to `agent-customization`.

## Non-Negotiable Rules

1. Preserve intended runtime behavior unless a bug fix is explicitly required and documented.
2. Never delete code only because it appears unreferenced when there are signals of planned use.
3. Prefer minimal, reversible changes over broad rewrites.
4. Treat security and data protection as first-class concerns in every pass.
5. If confidence is not high, mark findings as Needs Confirmation.
6. Prefer account-bound persistence for user data that must survive device changes and reinstall events.
7. Never expose secrets, sensitive identifiers, or personal data in logs, client bundles, or insecure storage.
8. Treat Firebase configuration and rules as production security boundaries, not implementation details.
9. When two or more code paths solve the same problem, consolidate them into one well-named, all-encompassing implementation rather than deleting one arbitrarily.

## Firebase Scope (Always Included When Firebase Files Exist)

If the repository includes Firebase assets (for example `firebase.json`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, or Cloud Functions), include a Firebase audit pass even when focus is `all`.

Firebase audit must cover:

- Firebase Auth flow safety (role assignment, auth state transitions, anonymous/guest posture)
- Firestore Rules correctness (least privilege, ownership checks, write constraints, collection boundary safety)
- Storage Rules correctness (owner path isolation, content-type/size constraints where applicable)
- Firestore indexes and query compatibility (missing index risk, expensive query patterns)
- Cloud Functions boundary checks (callable/auth checks, input validation, secrets/config usage, error leakage)
- Hosting/deploy configuration hygiene (`firebase.json`, cache/versioning, accidental artifact inclusion)
- Migration safety for schema/rules changes (forward and rollback compatibility)

## Critical Security Auto-Escalation Rule

If any finding is both security-related and high-risk, stop auto-fix execution and escalate for explicit approval before applying changes.

Escalate immediately when any of the following are true:

- Severity is Critical
- Exploitability is High
- Blast radius is system-wide
- The fix touches authentication, authorization, secrets handling, encryption, billing, or data-access boundaries
- The fix requires schema/data migration or could lock out users

Escalation payload must include:

- Short risk summary
- Affected files and trust boundary
- Minimal safe remediation options
- Rollback plan
- Verification plan

Only continue with implementation after explicit approval.

## Cleanup Workflow

### Phase 1: Repository Scan

Review source and relevant config files for:

- Dead code and duplicate logic
- Competing implementations: multiple functions, components, or style blocks solving the same problem with different logic
- Fragmented logic: the same concern split across files with no clear owner
- Unused imports, stale exports, and orphaned assets
- Unused CSS and specificity bloat
- Inconsistent naming, layout patterns, and formatting drift
- Async/control-flow fragility and weak error handling
- Semantic HTML and accessibility gaps
- Performance issues tied to rendering path and Core Web Vitals
- Scalability bottlenecks for large sessions and high concurrent usage
- Data persistence paths (local cache vs account-bound online storage)
- Security risks (auth/session misuse, injection vectors, insecure defaults, exposed secrets)
- Data-protection gaps (PII handling, over-collection, excessive retention, weak access boundaries)
- Firebase project risks (rules, indexes, auth flows, functions, hosting/deploy config)

### Phase 2: Triage and Confidence Tagging

Classify each finding by:

- Severity: Critical, High, Medium, Low
- Confidence: High, Medium, Low
- Safety to auto-fix: Yes or No
- Risk area: behavior, security, data integrity, auth, analytics, billing
- Performance impact: startup, interaction latency, memory, network, render cost
- Storage impact: local-only risk, sync conflict risk, cross-device continuity risk
- Security impact: exploitability, confidentiality, integrity, availability
- Data-protection impact: sensitivity level, exposure surface, retention and access risk

### Phase 3: Deletion Decision Framework

Delete when all are true:

- No runtime references
- No contract dependency
- No roadmap, TODO ownership, or integration-stub signal
- A replacement already exists or functionality is obsolete

Keep and annotate when any are true:

- Feature-flagged scaffold
- Cross-file contract placeholder
- Pending integration boundary

Escalate for confirmation when deletion could affect:

- behavior
- security
- analytics
- billing
- authentication
- data integrity

### Phase 4: Competing Code Detection and Consolidation

Identify and consolidate competing implementations across the repository.

Look for:

- Multiple functions/methods that do the same thing with slightly different implementations
- Parallel CSS rules targeting the same visual outcome via different selectors or properties
- Duplicate event handlers, data-fetch patterns, or auth checks spread across files
- Several partial helpers that together form one complete utility
- Conflicting default values, config shapes, or constants for the same concept

For each competing-code cluster, produce:

- A unified, all-encompassing replacement that covers every valid case from all competing versions
- A clear canonical location and name for the consolidated implementation
- A migration plan for all call sites to adopt the new version
- Deletion or deprecation notes for the superseded versions

Consolidation decision rules:

- Consolidate when two or more implementations solve the same problem and can be merged without losing edge-case coverage.
- Keep separate when implementations are intentionally scoped differently (e.g., a lightweight public version and a detailed admin version).
- Flag for confirmation when merging would require changing a public API contract or a Firebase data schema.

### Phase 5: Improvement Pass

Recommend or apply improvements for:

- JavaScript maintainability and modern syntax hygiene
- CSS architecture and rendering efficiency
- Semantic HTML and keyboard/focus accessibility
- Error handling, resilience, and observability
- Naming consistency and module boundaries

### Phase 6: Security and Data-Protection Audit

Evaluate and report:

- Authentication and authorization boundaries (least privilege, role checks)
- Input and output handling for injection/XSS-style risks
- Secret handling and configuration hygiene (no secrets in client or source)
- Transport/storage safeguards for sensitive data
- Logging and telemetry hygiene (no sensitive data leakage)
- Data lifecycle: collection minimization, retention, deletion, and recovery expectations

Require prioritization by exploitability and blast radius.

### Phase 6.5: Firebase Security and Reliability Audit

Evaluate and report:

- Firestore rule-path coverage for each user-write domain
- Storage rule-path coverage for user-upload domains
- Auth gating for callable/HTTP functions and sensitive writes
- Client trust assumptions that should be enforced server-side
- Index readiness for current and projected query patterns
- Deployment hazards (temporary files in hosting root, stale cache/version mismatches)

For every High or Critical Firebase finding, include:

- Affected Firebase artifact (`firebase.json`, rules, indexes, functions)
- Impacted user flow(s)
- Safe remediation plan and rollback note

### Phase 7: Performance and Scale Validation

Evaluate and report:

- Initial load path and critical rendering bottlenecks
- Large-session behavior (high item counts, long lists, heavy state)
- High-concurrency behavior (simultaneous users/updates)
- Hot paths for expensive reads/writes, re-renders, and repeated work
- Opportunities for batching, pagination, virtualization, memoization, and caching

Require measurable outcomes where possible:

- Baseline vs projected improvement for load/interaction timing
- Estimated impact on Core Web Vitals and runtime memory pressure

### Phase 8: Storage Model and Data Durability Audit

For each meaningful data domain, classify current storage strategy:

- Local-only
- Account-bound online
- Hybrid (local cache + account-bound source of truth)

Flag as High priority when user-critical data is local-only and can be lost across devices.

Default recommendation policy:

- Prefer account-bound persistence as source of truth for user-created/editable data.
- Allow local storage for ephemeral UI state, short-lived caches, and offline buffering.
- For hybrid models, require conflict-resolution and re-sync behavior to be documented.

### Phase 9: Beginner-Oriented Notes

For each non-trivial changed area, include concise notes covering:

- What this code does
- Why it exists
- Inputs and outputs
- Important edge cases

Commenting policy:

- Add comments only where logic is non-obvious, risky, or domain-specific.
- Do not over-comment trivial lines.
- Prefer better naming and structure before adding comments.

### Phase 10: Phased Plan

Produce a practical implementation plan:

- Phase 1: zero-risk removals, consistency fixes, and safe consolidations
- Phase 2: competing-code unification, performance/storage hardening with test coverage
- Phase 3: strategic architecture improvements

Keep recommendations migration-safe and PR-sized.

## Default Invocation Profile

When the skill is invoked without arguments, run a full repository audit that includes:

- Security and data-protection risk analysis
- Firebase auth/rules/functions/indexes/deploy risk analysis
- Performance and scale analysis for large sessions and high concurrency
- Storage-model classification for meaningful data domains
- Priority flags for user-critical local-only data
- A migration-safe plan toward account-bound persistence where needed

## Required Output Format

Use this shared contract in addition to the format below:

- Severity scale: Critical, High, Medium, Low
- Confidence scale: High, Medium, Low
- Safe-to-auto-fix: Yes or No
- Evidence style: short paraphrase + source name (or file path)
- Decision labels: Implemented, Suggested, Needs Confirmation, Deferred
- Escalation label: Escalated (Approval Required)

Security finding labels:

- Exposure type: secret leakage, authz gap, input handling, storage risk, logging leak, dependency risk
- Remediation urgency: Immediate, Next Release, Planned

Firebase finding labels:

- Firebase surface: Auth, Firestore Rules, Storage Rules, Functions, Indexes, Hosting/Deploy
- Rule confidence: High, Medium, Low
- Migration risk: None, Low, Medium, High

### 1) Executive Summary

- Total findings by severity: Critical, High, Medium, Low
- Estimated risk and effort
- Security and data-protection risk summary
- Performance risk summary (load, latency, scale)
- Storage durability summary (local-only vs account-bound coverage)

### 2) Findings Table

For each finding include:

- File/path
- Issue type
- Why it matters
- Recommended fix
- Confidence: High, Medium, Low
- Safe to auto-fix: Yes or No

For competing-code findings also include:

- All competing locations (file paths, function/selector names)
- Recommended consolidated implementation location and name
- Cases covered by each competing version
- Cases the unified version must preserve
- Migration effort: Low, Medium, High

For security findings also include:

- Exposure type
- Exploitability: High, Medium, Low
- Blast radius: single user, tenant/session, system-wide
- Recommended mitigation

For Firebase findings also include:

- Firebase surface
- Affected artifact path
- Affected flow(s)
- Migration risk and rollback note

For storage findings also include:

- Current storage model: local-only, account-bound online, or hybrid
- Recommended target model

### 3) Proposed Cleanup Plan

- Phase 1 items
- Phase 2 items
- Phase 3 items

### 4) Beginner Notes

- Short teaching notes per non-trivial changed area

### 5) Verification Checklist

- Behavior parity checks
- Accessibility checks
- Security checks
- Performance checks
- Lint/type/test status

### 6) Security, Performance, and Storage Appendix

- Threat-surface summary and high-risk paths
- Firebase boundary map (Auth, Rules, Functions, Hosting) by user flow
- Sensitive-data map by domain and trust boundary
- Scale assumptions used for evaluation (session size/user load)
- Bottleneck list with impact ranking
- Storage map by data domain (source of truth, cache, fallback)
- Migration notes for moving local-only data to account-bound persistence

## Evidence-Based Standards

Use these references to justify recommendations:

### Web Performance

- web.dev performance guidance
- MDN Web Performance
- WebPageTest Core Web Vitals guidance
- Core Web Vitals documentation

### JavaScript Best Practices

- Airbnb JavaScript Style Guide
- MDN JavaScript Guide
- Google JavaScript Style Guide
- JavaScript.info
- TC39 proposal/status references where relevant

### CSS Optimization and Architecture

- MDN CSS performance guidance
- CSS-Tricks Almanac
- Sass Guidelines (architectural principles)
- web.dev CSS and rendering performance guidance

### HTML and Accessibility

- W3C HTML principles/spec references
- A11Y Project checklist
- Google HTML/CSS Style Guide
- WCAG 2.2 quick reference
- ARIA Authoring Practices Guide

## Success Criteria

- Redundancy and complexity decrease without regressions.
- Competing implementations are consolidated into single, well-named, all-encompassing versions.
- Readability improves for beginners and maintainers.
- Consistency improves across style, structure, and behavior.
- Performance improves for normal and large-session/high-concurrency use cases.
- Security risks are identified, prioritized, and mitigated with clear urgency.
- Data protection is strengthened across storage, logging, and access boundaries.
- User-critical data is account-bound or has a documented migration path away from local-only storage.
- Accessibility improves where findings are addressed.
- The process remains reusable for future audits over long project lifecycles.
