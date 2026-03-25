---
description: "Run a full finance and monetization audit for TomeVault with approximate estimates clearly labeled when exact data is missing."
---

Run the finance-monetization workflow for this repository.

Requirements:

- Invoke the finance-monetization skill using default full-audit behavior:
  - scope: full
  - mode: audit-only
  - focus: all
  - confidence: balanced
- Perform a line-by-line review of monetization-related trust boundaries.
- Treat client-side checks as untrusted for billing enforcement.
- Identify revenue leakage, trial abuse, entitlement bypass, and cloud-cost inflation risks.
- Evaluate pricing sufficiency and fairness.

Approximation policy:

- If exact figures are unavailable, provide approximately-labeled ranges.
- For each approximate figure, include assumptions, low/expected/high range, and confidence level.
- Never present estimates as exact facts.

Output format:

1. Executive summary
2. Findings ordered by severity (Critical, High, Medium, Low)
3. Pricing sufficiency model table (Conservative, Expected, Optimistic)
4. Suggested improvements (prioritized)
5. Detailed implementation prompt to execute fixes

For each finding, include:

- Severity
- Confidence
- Approximate financial impact (if needed)
- Exploit or failure path
- File evidence with line references
- Recommended fix
- Rollback note
- Verification steps

End with:

- Missing data checklist needed to replace approximate values with exact values
- A phased implementation plan (Phase 1 hardening, Phase 2 backend entitlement architecture, Phase 3 pricing optimization)
