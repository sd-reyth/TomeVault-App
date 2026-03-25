---
name: finance-monetization
description: "Audit monetization integrity, subscription enforcement, pricing sufficiency, and cloud unit economics. Use when checking whether billing controls prevent revenue leakage, whether subscription pricing likely covers costs with healthy profit, and when producing implementation-ready finance hardening plans."
argument-hint: "Optional: scope (full|targeted), mode (audit-only|propose-fixes), focus (entitlements|pricing|costs|fraud|rules|all), confidence target (high|balanced|fast)"
user-invocable: true
disable-model-invocation: false
---

# finance-monetization

Protect revenue, keep pricing fair, and produce an implementation-ready plan that improves profit without harming user trust.

## When to Use

- You need a line-by-line audit of code paths that affect subscriptions, trials, paid access, refunds, and billing boundaries.
- You want to verify whether pricing is likely sufficient to cover cloud and support costs and still leave profit.
- You need recommendations that improve margin while avoiding customer-hostile pricing tactics.
- You need a practical execution prompt that can be run directly for implementation.

## Do Not Use When

- The request is primarily visual UI/UX token compliance work (use interface-update).
- The request is mainly broad cleanup without finance goals (use code-cleanup).
- The request is competitive roadmap ideation with no billing/security analysis (use function-suggestions).

## Inputs

- Scope:
  - full
  - targeted (specific files, folders, or modules)
- Mode:
  - audit-only: report and plan, no code edits
  - propose-fixes: report plus patch-ready recommendations
- Focus:
  - entitlements
  - pricing
  - costs
  - fraud
  - rules
  - all
- Confidence target:
  - high: slower, deeper verification, conservative claims
  - balanced: practical default
  - fast: quick pass with clear uncertainty notes

Default invocation profile when omitted:

- Scope: full
- Mode: audit-only
- Focus: all
- Confidence target: balanced

## Core Principles

1. Treat client code as untrusted for billing and entitlement decisions.
2. Critical paid-access checks must be enforceable server-side.
3. Favor fair pricing and low-friction UX over short-term extraction tactics.
4. Always quantify uncertainty; do not present guesses as exact facts.
5. Use approximate estimates when hard data is missing, but label them clearly.
6. Avoid recommendations that materially increase charge disputes, churn, or support burden.

## Non-Negotiable Safeguards

- Never trust client-only flags for paid feature access.
- Never store payment secrets or private billing keys in client bundles.
- Never mark pricing as sufficient without at least a provisional unit-economics model.
- Never recommend dark patterns (forced retention traps, hidden fees, misleading trial terms).
- If a finding touches billing enforcement or auth boundaries with High or Critical risk, require explicit approval before implementation.

## Approximation Policy (Required)

When exact data is missing, use estimates and clearly label each estimate as approximately.

For every approximate figure, include:

- Approximate label: approximately
- Assumptions used
- Sensitivity range (low, expected, high)
- Confidence level (High, Medium, Low)
- Data needed to replace the estimate with exact values

Example wording style:

- "Approximately $0.18 to $0.42 monthly infrastructure cost per active paid user, based on assumed read/write and egress profile. Confidence: Low until billing export is connected."

## Finance Audit Workflow

### Phase 1: Monetization Surface Mapping

Map all paths related to:

- Trial start, duration, reset, and expiry handling
- Subscription state checks and entitlement evaluation
- Session creation or premium feature gating
- Payment lifecycle hooks (checkout, invoices, renewals, cancellations, refunds, chargebacks)
- Admin overrides and support flows that alter paid status

### Phase 2: Trust Boundary Validation

For each paid capability, classify enforcement:

- Server-enforced
- Hybrid enforced
- Client-only

Flag client-only or weak hybrid controls as High or Critical risk.

### Phase 3: Rule and Backend Boundary Audit

Audit Firestore, Storage, Functions, and hosting config for:

- Ability to bypass paid gates
- Excessively broad reads/writes that increase abuse or cost
- Missing entitlement checks in create/update paths
- Missing immutable trial metadata constraints
- Missing request validation and rate controls

### Phase 4: Cost Driver and Unit-Economics Model

Estimate monthly unit economics per paid user:

- Revenue per paid user (net of app store or processor fees when applicable)
- Variable costs (reads, writes, storage, egress, function invocations)
- Support and operational cost allocation
- Gross margin and net contribution

Output three scenarios:

- Conservative (heavy usage)
- Expected (median usage)
- Optimistic (light usage)

If inputs are missing, produce approximate ranges and list missing data explicitly.

### Phase 5: Pricing Sufficiency and Fairness Review

Evaluate whether pricing likely:

- Covers projected costs
- Leaves a healthy profit margin
- Stays customer-friendly for target segments

Recommend changes across:

- Price point
- Included limits
- Overage design (if any)
- Trial structure
- Annual vs monthly packaging

Reject recommendations that are profitable but clearly harmful to trust or retention.

### Phase 6: Prioritized Remediation Plan

Create a phased plan:

- Phase 1: Immediate hardening (server-side gating, trial immutability, rule tightening)
- Phase 2: Billing architecture completion (webhooks, entitlement sync, audit trail)
- Phase 3: Pricing optimization experiments with guardrails

For each phase include:

- Files likely affected
- Risk level
- Rollback plan
- Verification plan
- KPI impact expectations

## Severity Model

- Critical: Revenue bypass or entitlement spoofing at scale.
- High: Significant leakage, exploitable trial abuse, or major cloud-cost risk.
- Medium: Margin drag or weak controls with limited blast radius.
- Low: Minor optimization opportunity.

## Required Output Format

### 1) Executive Summary

- Current monetization posture (1 paragraph)
- Top 3 risks
- Near-term profit outlook using available or approximate data

### 2) Findings (Ordered by Severity)

For each finding provide:

- Severity
- Confidence
- Approximate financial impact (if exact unavailable)
- Business impact
- Exploit or failure path
- Evidence with file and line references
- Recommended fix
- Migration and rollback notes
- Verification tests

### 3) Pricing Sufficiency Model

Provide a compact table with:

- Scenario
- Approximate ARPU
- Approximate variable cost per paid user
- Approximate gross margin
- Notes and assumptions

### 4) Suggested Improvements

List concrete improvements in priority order:

- Revenue-protection fixes
- Cost-optimization fixes
- Fair pricing and packaging improvements

### 5) Implementation Prompt

Produce a detailed prompt that can be pasted into implementation mode. It must include:

- Goal and scope
- Non-negotiable safeguards
- Ordered tasks
- Acceptance criteria
- Test plan
- Rollback plan
- Explicit instruction to label estimates as approximately when exact data is unavailable

## Handoff Gate Before Any Implementation

Require explicit approval when any proposed change touches:

- Entitlement enforcement
- Subscription state source of truth
- Auth or role boundaries
- Trial eligibility logic
- Billing processor integrations

## Quick-Start Invocation

Use:

/finance-monetization scope=full mode=audit-only focus=all confidence=balanced

Then provide:

- Files changed (if any)
- Risk summary by severity
- Approximate and exact values separated clearly
- Final implementation prompt for execution

## Success Criteria

A run is successful when:

- All paid-access paths are mapped and trust-classified.
- High/Critical monetization risks are identified with file evidence.
- Pricing sufficiency is assessed with exact values where possible and approximately-labeled ranges otherwise.
- A realistic phased plan exists with rollback and verification details.
- Recommendations improve profit potential while preserving customer trust.
