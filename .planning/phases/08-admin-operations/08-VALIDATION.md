---
phase: 8
slug: admin-operations
status: draft
created: 2026-06-15
---

# Validation Architecture: Phase 8 — Admin Operations

## Validation Strategy

Phase 8 validation uses a combination of automated type-checking, manual smoke testing, and integration verification across 4 plans.

## Validation Layers

### Layer 1: TypeScript Compilation
- All tasks verify with `npx tsc --noEmit`
- Catches type errors, missing imports, interface mismatches
- Run after each task completion

### Layer 2: Build Verification
- `pnpm build` verifies SSR/SSG compilation of all admin pages
- Catches runtime import errors, missing dependencies, Next.js App Router issues
- Run after each plan completion

### Layer 3: Manual Smoke Testing
- Interactive verification of each admin page and API route
- Covers auth flow, CRUD operations, toggle interactions, toast notifications
- Run after all plans complete

### Layer 4: Integration Verification
- Cross-plan wiring verification (SessionProvider, ConfirmDialog/Toast reuse, BullMQ queue integration)
- End-to-end auth flow: login → navigate → perform action → logout
- Run after all plans complete

## Nyquist Checks

| Check | Description | Status |
|-------|-------------|--------|
| 8a | All ADMN requirements mapped to plan tasks | PASS (see plan checker output) |
| 8b | No orphaned requirements | PASS (9/9 requirements covered) |
| 8c | Cross-plan data contracts consistent | PASS (no conflicting transforms) |
| 8d | Threat model covers all trust boundaries | PASS (T-08-01 through T-08-15) |

## Verification Criteria per Plan

| Plan | Automated | Manual | Integration |
|------|-----------|--------|-------------|
| 08-01 | tsc, build | Login flow, middleware redirect | SessionProvider exports |
| 08-02 | tsc, build | Sidebar nav, summary cards, mobile collapse | Layout wraps children |
| 08-03 | tsc, build | Article CRUD, version history, rollback, source evidence | ConfirmDialog/Toast reuse |
| 08-04 | tsc, build | Pipeline runs, error log, re-crawl, regenerate, sources, trust toggle | BullMQ queue integration |
