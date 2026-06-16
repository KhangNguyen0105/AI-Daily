---
phase: 3
slug: pricing-comparison-table
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-16
---

# Phase 3 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-00-01 | 00 | 0 | PRIC-01 | - | N/A | unit | `pnpm test -- --grep "pricing table"` | W0 | pending |
| 03-00-02 | 00 | 0 | PRIC-02 | - | N/A | unit | `pnpm test -- --grep "provider"` | W0 | pending |
| 03-00-03 | 00 | 0 | PRIC-03 | - | N/A | unit | `pnpm test -- --grep "search"` | W0 | pending |
| 03-00-04 | 00 | 0 | PRIC-04 | - | N/A | unit | `pnpm test -- --grep "filter"` | W0 | pending |
| 03-00-05 | 00 | 0 | PRIC-05 | - | N/A | unit | `pnpm test -- --grep "source"` | W0 | pending |
| 03-00-06 | 00 | 0 | PRIC-06 | - | N/A | unit | `pnpm test -- --grep "confidence"` | W0 | pending |
| 03-00-07 | 00 | 0 | FRNT-03 | - | N/A | manual | Manual responsive viewport check | - | pending |
| 03-00-08 | 00 | 0 | FRNT-04 | - | N/A | unit | `pnpm test -- --grep "last updated"` | W0 | pending |

*Status: pending, green, red, flaky*

---

## Wave 0 Requirements

- [ ] `tests/pricing-table.test.tsx` - covers PRIC-01, PRIC-02, PRIC-03, PRIC-04, PRIC-05, PRIC-06.
- [ ] `tests/pricing-utils.test.ts` - covers formatPrice, formatCurrencyPrice, sanitizeDisplayName, getConfidenceColor, and getModelFamily behavior used by Phase 3.
- [ ] `tests/responsive.test.tsx` - covers FRNT-03 where practical; manual viewport verification remains required for final sign-off.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Responsive table and side-by-side layout | FRNT-03 | Visual column hiding, sticky calculator behavior, and viewport-relative height need browser inspection | Check mobile, tablet, desktop, and xl widths. Confirm PricingTable and CostCalculator stack below xl, sit 60/40 at xl+, hidden columns match the UI-SPEC, and controls remain usable. |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-16
