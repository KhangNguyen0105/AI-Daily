---
phase: 06
slug: daily-content-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-14
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.6 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | CONT-01, CONT-04 | — | N/A | unit | `pnpm test tests/pipeline/article-diff.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | CONT-01 | — | N/A | unit | `pnpm test tests/pipeline/article-diff.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | CONT-01, CONT-03, CONT-04 | T-06-02 | LLM response parsing | unit | `pnpm test tests/pipeline/article-generator.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | CONT-01 | — | N/A | unit | `pnpm test tests/pipeline/generate-worker.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 2 | CONT-01 | — | N/A | CLI | `npx drizzle-kit push` | ✅ | ⬜ pending |
| 06-03-01 | 03 | 2 | CONT-02 | T-06-04 | Date validation | CLI | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 06-03-02 | 03 | 2 | CONT-03 | T-06-05 | Markdown sanitization | CLI | `npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/pipeline/article-diff.test.ts` — covers CONT-01 (diff computation: new models, price changes, promotions)
- [ ] `tests/pipeline/article-generator.test.ts` — covers CONT-01, CONT-03, CONT-04 (generateText call, provider fallback, response parsing, 4-section format)
- [ ] `tests/pipeline/generate-worker.test.ts` — covers CONT-01 (worker integration: computeDiff → generateArticle → upsert)
- [ ] Install react-markdown + remark-gfm: `pnpm add react-markdown remark-gfm`

**Frontend test coverage:** Plan 06-03 does not include automated tests for digest pages or components. Frontend verification relies on manual inspection (see Manual-Only Verifications below) and TypeScript compilation checks. This is acceptable because: (1) the pages are server components with simple Drizzle queries, (2) DigestArticle is a thin wrapper around react-markdown, and (3) the ISR pattern is directly reused from /model/[slug] which is already tested.

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Daily Digest link visible in TopNav | CONT-02, D-21 | Visual layout verification | Open localhost:3000, verify TopNav shows "Daily Digest" link |
| Article renders Markdown correctly | CONT-03 | Visual rendering verification | Open /digest/2026-06-14, verify headings, lists, bold text render properly |
| Empty state on /digest when no articles | CONT-02 | State-dependent UI | Open /digest before first pipeline run, verify "No articles yet" message |
| "Published: {date}" shown on articles | D-19 | Visual formatting | Open any /digest/[date] page, verify published date displays |

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
