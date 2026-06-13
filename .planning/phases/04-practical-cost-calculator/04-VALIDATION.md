---
phase: 04
slug: practical-cost-calculator
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-13
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm vitest run tests/pricing-utils.test.ts` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run tests/pricing-utils.test.ts`
- **After every plan wave:** Run `pnpm vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | COST-01, COST-02, COST-03, COST-04 | — | N/A | unit | `pnpm vitest run tests/pricing-utils.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | COST-01, COST-02, COST-03, COST-04, COST-06 | — | N/A | unit | `pnpm vitest run tests/pricing-utils.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | COST-01, COST-02, COST-03, COST-04, COST-05, COST-06 | — | N/A | unit | `pnpm vitest run tests/cost-calculator.test.tsx` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | COST-05, COST-06 | — | N/A | unit | `pnpm vitest run && pnpm build` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 2 | COST-05, COST-06 | — | N/A | unit | `pnpm vitest run && pnpm build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/cost-calculator.test.tsx` — component tests for CostCalculator
- [ ] `tests/pricing-utils.test.ts` — add cost calculation tests (COST-01 through COST-04, COST-06)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CostCalculator renders below PricingTable | COST-05 | Visual layout verification | Open localhost:3000, scroll down to see CostCalculator section |
| Currency toggle syncs between components | COST-05, COST-06 | Interactive state verification | Click VND toggle in PricingTable, verify CostCalculator shows VND |
| Cheapest model highlighted | COST-05 | Visual styling verification | Select a scenario, verify cheapest model has visual highlight |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** {pending / approved YYYY-MM-DD}
