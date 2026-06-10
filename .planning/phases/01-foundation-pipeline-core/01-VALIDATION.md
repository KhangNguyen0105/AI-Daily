---
phase: 1
slug: foundation-pipeline-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-10
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 |
| **Config file** | None — Wave 0 installs |
| **Quick run command** | `pnpm vitest run` |
| **Full suite command** | `pnpm vitest run --coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run`
- **After every plan wave:** Run `pnpm vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FRNT-01 | — | N/A | integration | `pnpm vitest run tests/landing.test.tsx` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | FRNT-02 | — | N/A | integration | `pnpm vitest run tests/landing.test.tsx` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | DCOL-06 | — | N/A | unit | `pnpm vitest run tests/adapter.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 1 | DCOL-06 | — | N/A | integration | `pnpm vitest run tests/openai-adapter.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 2 | SC-01 | — | N/A | smoke | `docker compose up -d && docker compose ps` | Manual | ⬜ pending |
| 01-04-02 | 04 | 2 | SC-02 | — | N/A | integration | `pnpm vitest run tests/pipeline.test.ts` | ❌ W0 | ⬜ pending |
| 01-05-01 | 05 | 2 | SC-05 | — | N/A | unit | `pnpm vitest run tests/schema.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration
- [ ] `tests/landing.test.tsx` — Landing page renders with branding
- [ ] `tests/adapter.test.ts` — Provider adapter base class contract
- [ ] `tests/openai-adapter.test.ts` — OpenAI adapter crawl/extract
- [ ] `tests/pipeline.test.ts` — BullMQ pipeline end-to-end
- [ ] `tests/schema.test.ts` — Database schema validation
- [ ] `tests/conftest.ts` — Shared test fixtures (mock DB, mock Redis)
- [ ] Framework install: `pnpm add -D vitest` — if not in package.json

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docker Compose starts all services | SC-01 | Requires running Docker daemon | `docker compose up -d && docker compose ps` — verify all 5 services running |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
