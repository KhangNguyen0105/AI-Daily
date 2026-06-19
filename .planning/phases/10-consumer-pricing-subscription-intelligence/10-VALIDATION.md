---
phase: 10
slug: consumer-pricing-subscription-intelligence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-19
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/adapter.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/schema.test.ts tests/adapter.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | DCOL-08 | Zod validates extraction output | unit | `npx vitest run tests/schema.test.ts -k "subscription"` | ✅ (modify) | ⬜ pending |
| 10-02-01 | 02 | 1 | DCOL-08 | Consumer adapters extract pricing | integration | `npx vitest run tests/providers/consumer-adapters.test.ts` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 2 | DCOL-09 | Subscriptions page renders | integration | `npx vitest run tests/subscriptions.test.ts` | ❌ W0 | ⬜ pending |
| 10-03-02 | 03 | 2 | DCOL-09 | Free trials on /promotions | integration | `npx vitest run tests/promotions.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/providers/consumer-adapters.test.ts` — stubs for DCOL-08 (consumer adapter extraction)
- [ ] `tests/schema.test.ts` — add subscription_plans table tests
- [ ] `tests/promotions.test.ts` — add free_trial type tests (if extending promotionTypeEnum)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Subscriptions page renders correctly | DCOL-09 | Visual verification of card layout | Navigate to /subscriptions, verify cards show plan name, price, trial badge, features |
| TopNav link active state | DCOL-09 | Visual CSS verification | Click Subscriptions link, verify active styling |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
