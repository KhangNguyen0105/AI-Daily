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
| **Quick run command** | `pnpm vitest run tests/components/pricing-table.test.tsx tests/components/home-page-client.test.tsx` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds for focused component checks; full suite may take ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the focused command listed for the task below.
- **After every plan wave:** Run `pnpm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds for focused task checks; full-suite latency is accepted at wave and phase gates.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 03-01 | 0 | PRIC-01, PRIC-02, PRIC-03, PRIC-04, PRIC-05, PRIC-06, PRIC-07, FRNT-03, FRNT-04 | T-03-01-01 / T-03-01-02 / T-03-SC | Fixtures include unsafe-name and source-link cases without importing production DB modules | unit | `pnpm vitest run tests/components/pricing-table.test.tsx --runInBand` | W0 | pending |
| 03-01-02 | 03-01 | 0 | PRIC-01, PRIC-02, PRIC-03, PRIC-04, PRIC-05, PRIC-06, PRIC-07 | T-03-01-01 / T-03-01-02 / T-03-SC | Source links avoid visible raw URLs and confidence state is non-visible except color | unit | `pnpm vitest run tests/components/pricing-table.test.tsx` | W0 | pending |
| 03-01-03 | 03-01 | 0 | PRIC-07, FRNT-03, FRNT-04 | T-03-01-01 / T-03-01-02 / T-03-SC | Layout and freshness states render without leaking unsafe provider data | unit | `pnpm vitest run tests/components/home-page-client.test.tsx` | W0 | pending |
| 03-02-01 | 03-02 | 1 | PRIC-01, PRIC-05, PRIC-07, FRNT-04 | T-03-02-* | Data query deduplicates latest rows and refreshes live USD/VND during build/ISR before fallback | unit/integration | `pnpm vitest run tests/components/home-page-client.test.tsx tests/landing.test.tsx` | W0 | pending |
| 03-02-02 | 03-02 | 1 | PRIC-01, PRIC-05, PRIC-07, FRNT-04 | T-03-02-* | Stale/error/freshness UI uses safe copy and retry behavior without exposing raw provider data | unit | `pnpm vitest run tests/components/home-page-client.test.tsx` | W0 | pending |
| 03-03-01 | 03-03 | 2 | PRIC-01, PRIC-02, PRIC-05, PRIC-06, PRIC-07 | T-03-03-* | Source links use safe attrs; confidence badge text is non-visible | unit | `pnpm vitest run tests/components/pricing-table.test.tsx tests/pricing-utils.test.ts tests/provider-metadata.test.ts` | W0 | pending |
| 03-03-02 | 03-03 | 2 | PRIC-01, PRIC-03, PRIC-04, PRIC-07 | T-03-03-* | Search/filter/sort state changes stay client-side and preserve safe rendered values | unit | `pnpm vitest run tests/components/pricing-table.test.tsx` | W0 | pending |
| 03-04-01 | 03-04 | 2 | PRIC-07, FRNT-04 | T-03-04-* | Exchange-rate worker handles live API failure with stored/constant fallback | unit | `pnpm vitest run tests/pipeline/exchange-rate-worker.test.ts` | W0 | pending |
| 03-04-02 | 03-04 | 2 | PRIC-07, FRNT-04 | T-03-04-* | Daily worker refresh is supplemental and does not replace build/ISR live refresh | unit | `pnpm vitest run tests/pipeline/scheduler.test.ts tests/pipeline/exchange-rate-worker.test.ts` | W0 | pending |
| 03-05-01 | 03-05 | 3 | PRIC-01, PRIC-02, PRIC-03, PRIC-04, PRIC-05, PRIC-06, PRIC-07, FRNT-03, FRNT-04 | T-03-05-* | Tailwind-only layout cleanup preserves source/confidence safety behavior | unit | `pnpm vitest run tests/components/home-page-client.test.tsx tests/cost-calculator.test.tsx` | W0 | pending |
| 03-05-02 | 03-05 | 3 | PRIC-01, PRIC-02, PRIC-03, PRIC-04, PRIC-05, PRIC-06, PRIC-07, FRNT-03, FRNT-04 | T-03-05-* | Final responsive accessibility checks preserve source/confidence safety and keyboard usability | unit/manual | `pnpm vitest run tests/components/pricing-table.test.tsx tests/components/home-page-client.test.tsx && pnpm build` plus manual viewport check | W0 | pending |

*Status: pending, green, red, flaky*

---

## Wave 0 Requirements

- [ ] `tests/fixtures/pricing-rows.ts` - shared fixture rows for all Phase 3 component tests.
- [ ] `tests/components/pricing-table.test.tsx` - covers PRIC-01, PRIC-02, PRIC-03, PRIC-04, PRIC-05, PRIC-06, PRIC-07, source-link tooltip/title behavior, color-only confidence pills, pagination, and USD/VND conversion.
- [ ] `tests/components/home-page-client.test.tsx` - covers FRNT-03, FRNT-04, 60/40 xl layout, sticky CostCalculator, freshness metadata, stale/error states, and shared currency.
- [ ] Manual viewport verification - covers final FRNT-03 behavior at mobile, tablet, desktop, and xl widths.

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
- [x] Focused task feedback latency <= 30s; full suite reserved for wave and phase gates
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-16
