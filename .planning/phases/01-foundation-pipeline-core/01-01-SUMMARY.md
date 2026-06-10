---
phase: 01-foundation-pipeline-core
plan: 01
subsystem: foundation
tags: [scaffolding, nextjs, drizzle, docker, schema, landing-page]
dependency_graph:
  requires: []
  provides: [project-scaffold, database-schema, docker-stack, landing-page]
  affects: [01-02, 01-03, all-subsequent-plans]
tech_stack:
  added: [next@16.2.9, react@19.x, drizzle-orm@0.45.2, pg@8.21.0, bullmq@5.78.0, ioredis@5.11.1, crawlee@3.17.0, playwright@1.60.0, zod@4.4.3, tailwindcss@4.3.0, ai@6.0.199, vitest@3.2.6]
  patterns: [drizzle-pgTable, multi-stage-dockerfile, zod-env-validation, tailwind-v4-import]
key_files:
  created:
    - package.json
    - tsconfig.json
    - next.config.ts
    - docker-compose.yml
    - Dockerfile
    - drizzle.config.ts
    - src/db/schema.ts
    - src/db/index.ts
    - src/lib/env.ts
    - app/layout.tsx
    - app/page.tsx
    - app/globals.css
    - vitest.config.ts
    - tests/schema.test.ts
    - tests/landing.test.tsx
    - tests/conftest.ts
    - .env.example
    - .gitignore
  modified: []
decisions:
  - "Used pnpm 11.5.2 as package manager (installed via npm install -g pnpm)"
  - "Schema test uses column name inspection via Drizzle table object keys"
  - "Landing page tests use file content analysis (readFileSync) rather than JSX rendering to avoid @testing-library/react dependency in Phase 1"
metrics:
  duration_seconds: 480
  completed: "2026-06-10T06:41:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 18
  test_pass_rate: "17/17 (100%)"
---

# Phase 1 Plan 01: Project Scaffold Summary

Next.js 16 project scaffold with Docker Compose (PostgreSQL, Redis, app), Drizzle ORM schema defining all 6 core tables, and a public landing page with "AI Daily" branding. TDD approach: tests written first (RED), then implementation (GREEN).

## Tasks Completed

### Task 1: Scaffold project with Next.js, Docker Compose, and database schema
- **Commit:** `5106b53`
- **Files:** package.json, tsconfig.json, next.config.ts, docker-compose.yml, Dockerfile, drizzle.config.ts, src/db/schema.ts, src/db/index.ts, src/lib/env.ts, app/globals.css, .env.example, .gitignore
- **What was done:**
  - Initialized pnpm project with all locked dependencies from CLAUDE.md
  - Created Docker Compose with postgres (16-alpine), redis (7-alpine), and app services with healthchecks
  - Created multi-stage Dockerfile (deps, builder, runner) using node:20-alpine with standalone output
  - Defined all 6 core tables in Drizzle schema: sources, rawData, extractions, articles, pipelineRuns, practicalCosts
  - Schema includes confidenceEnum (verified/likely/low_confidence), JSONB columns for evidence, foreign key chains, and standard timestamps
  - Zod-based environment variable validation for DATABASE_URL, REDIS_HOST, REDIS_PORT
  - TypeScript compiles cleanly, all 6 table exports verified

### Task 2: Create public landing page and database schema test (TDD)
- **RED commit:** `77d43d1` - tests written first, landing tests fail as expected
- **GREEN commit:** `90208c4` - implementation makes all tests pass
- **Files:** app/layout.tsx, app/page.tsx, vitest.config.ts, tests/schema.test.ts, tests/landing.test.tsx, tests/conftest.ts
- **What was done:**
  - Created vitest.config.ts with globals, node environment, tests/ include pattern
  - Schema test validates all 6 tables with expected column names and confidenceEnum values (13 tests)
  - Landing page test verifies AI Daily branding and absence of auth prompts (4 tests)
  - Root layout with metadata (title, description) and Tailwind CSS import
  - Public landing page with centered "AI Daily" heading, subtitle, and tagline
  - No login/register/sign-in/sign-up content (FRNT-01 compliant)
  - conftest.ts provides mock DB and Redis helpers for future tests
  - Next.js build compiles and generates static pages successfully

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsx -e "import * as s from './src/db/schema'; ..."` | All 6 tables exported |
| `npx tsc --noEmit` | No TypeScript errors |
| `npx vitest run` | 17/17 tests pass |
| `npx next build` | Build succeeds, static pages generated |
| package.json contains "next": "16.2.9" | Confirmed |
| docker-compose.yml contains postgres, redis, app services | Confirmed |
| src/db/schema.ts exports confidenceEnum | Confirmed |
| app/page.tsx contains "AI Daily" | Confirmed |
| app/page.tsx does NOT contain login/register | Confirmed |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all implemented code is functional. The conftest.ts mock helpers are intentionally minimal stubs for future test use.

## TDD Gate Compliance

| Gate | Status | Commit |
|------|--------|--------|
| RED (failing tests) | PASS | `77d43d1` |
| GREEN (implementation) | PASS | `90208c4` |

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-01-01 mitigated | .gitignore | .env file excluded from version control |
| T-01-02 mitigated | src/db/schema.ts | Drizzle ORM uses parameterized queries by default |

## Self-Check: PASSED

- [x] package.json exists with "next": "16.2.9"
- [x] docker-compose.yml contains postgres, redis, app services with healthchecks
- [x] src/db/schema.ts exports all 6 tables with confidenceEnum
- [x] src/db/index.ts imports drizzle from drizzle-orm/node-postgres
- [x] src/lib/env.ts uses Zod validation
- [x] .env.example contains DATABASE_URL, REDIS_HOST, REDIS_PORT
- [x] Dockerfile has multi-stage build with node:20-alpine
- [x] drizzle.config.ts references ./src/db/schema.ts
- [x] app/layout.tsx contains "AI Daily" metadata
- [x] app/page.tsx renders "AI Daily" h1 without auth prompts
- [x] vitest.config.ts configures tests/ directory
- [x] tests/schema.test.ts passes (13 tests)
- [x] tests/landing.test.tsx passes (4 tests)
- [x] All commits exist in git log
