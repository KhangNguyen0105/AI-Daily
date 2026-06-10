---
phase: 01-foundation-pipeline-core
plan: 03
subsystem: pipeline
tags: [bullmq, pipeline, workers, queues, isr, landing-page, docker]

# Dependency graph
requires:
  - phase: 01-foundation-pipeline-core
    provides: project-scaffold, database-schema, docker-stack, landing-page
  - phase: 01-foundation-pipeline-core
    provides: provider-adapter-pattern, openai-adapter, adapter-registry
provides:
  - bullmq-pipeline-with-4-queues
  - worker-chaining-collect-extract-score-generate
  - worker-dockerfile-with-playwright
  - landing-page-with-pricing-data-display
affects: [all-future-pipeline-stages, admin-dashboard, article-generation]

# Tech tracking
tech-stack:
  added: []
  patterns: [bullmq-queue-factory, worker-chaining, isr-revalidation, confidence-badge-colors]

key-files:
  created:
    - src/pipeline/queues.ts
    - src/pipeline/workers/collect.ts
    - src/pipeline/workers/extract.ts
    - src/pipeline/workers/score.ts
    - src/pipeline/workers/generate.ts
    - src/pipeline/worker-entry.ts
    - worker.Dockerfile
    - tests/pipeline.test.ts
  modified:
    - docker-compose.yml
    - app/page.tsx

key-decisions:
  - "Used createQueue factory function for consistent queue configuration across all 4 stages"
  - "ISR with revalidate=60 resolves FRNT-02 (SSG) vs D-15 (display dynamic data) tension"
  - "Worker concurrency set to 1 for all stages (prevents rate limiting issues with providers)"
  - "Score worker is pass-through in Phase 1; real confidence scoring deferred to Phase 2"

patterns-established:
  - "BullMQ queue factory: createQueue(name) with exponential backoff, attempts: 3"
  - "Worker chaining pattern: each worker adds job to next queue on completion"
  - "ISR data display: export const revalidate = 60 with server-side DB query"

requirements-completed: [FRNT-01, FRNT-02, DCOL-06]

# Metrics
duration: 12min
completed: 2026-06-10
---

# Phase 1 Plan 03: BullMQ Pipeline Summary

**BullMQ pipeline with 4 queues (collect, extract, score, generate), worker chaining from collect through generate, ISR landing page displaying real pricing data from PostgreSQL**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-10T06:52:39Z
- **Completed:** 2026-06-10T07:04:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- BullMQ pipeline with 4 separate queues (collect, extract, score, generate) with exponential backoff
- Worker chaining: collect -> extract -> score -> generate via worker-triggered handoff
- Worker Dockerfile with Playwright chromium for browser-based crawling
- Docker Compose updated with worker service depending on postgres and redis
- Landing page now queries PostgreSQL and displays extracted pricing data with ISR
- Confidence badges with green/yellow/red color coding
- 50 tests passing (12 new pipeline tests + 38 existing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BullMQ queues and pipeline workers with chaining** - `6c101d4` (feat)
2. **Task 2: Update landing page to display extracted pricing data** - `cabb538` (feat)

## Files Created/Modified
- `src/pipeline/queues.ts` - 4 BullMQ queues with exponential backoff config (collect, extract, score, generate)
- `src/pipeline/workers/collect.ts` - Collect worker: crawl provider, store raw HTML, chain to extract
- `src/pipeline/workers/extract.ts` - Extract worker: AI extraction, store structured data, chain to score
- `src/pipeline/workers/score.ts` - Score worker: pass-through scoring, chain to generate
- `src/pipeline/workers/generate.ts` - Generate worker: placeholder article creation
- `src/pipeline/worker-entry.ts` - Worker process entry point with graceful shutdown handlers
- `worker.Dockerfile` - Multi-stage Docker build with Playwright chromium for worker process
- `docker-compose.yml` - Added worker service with postgres/redis dependencies and API key env vars
- `app/page.tsx` - ISR landing page querying extractions table with pricing data display
- `tests/pipeline.test.ts` - 12 unit tests verifying queue config and worker creation

## Decisions Made
- **ISR over pure SSG:** Used `export const revalidate = 60` to resolve the tension between FRNT-02 (SSG) and D-15 (display dynamic data). The page is statically generated at build time and revalidated every 60 seconds.
- **Worker concurrency = 1:** All workers use concurrency: 1 to prevent rate limiting issues with provider APIs. Can be increased later as needed.
- **Score worker pass-through:** Phase 1 score worker is a pass-through since confidence is already set during extraction. Real confidence scoring will be added in Phase 2.
- **API keys via env vars:** OPENAI_API_KEY and ANTHROPIC_API_KEY passed to worker container via docker-compose environment (from .env file).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed BullMQ job return value casing**
- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** BullMQ Job type uses `returnvalue` (lowercase 'v'), not `returnValue`. TypeScript compilation failed.
- **Fix:** Changed `job.returnValue` to `job.returnvalue` in extract, score, and generate workers
- **Files modified:** src/pipeline/workers/extract.ts, src/pipeline/workers/score.ts, src/pipeline/workers/generate.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** cabb538 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed TypeScript type errors in pipeline tests**
- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** Test file had type errors: backoff property possibly undefined, worker.options not accessible on mock
- **Fix:** Added type assertions for backoff object, changed mock to use `opts` property
- **Files modified:** tests/pipeline.test.ts
- **Verification:** `npx tsc --noEmit` and `npx vitest run` both pass
- **Committed in:** cabb538 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both TypeScript type issues)
**Impact on plan:** Both fixes were necessary for clean TypeScript compilation. No scope creep.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-03-03 mitigated | src/pipeline/workers/*.ts | Worker concurrency set to 1, exponential backoff with max 3 retries prevents DoS |

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Score worker pass-through | src/pipeline/workers/score.ts | Phase 1 placeholder; real confidence scoring in Phase 2 |
| Placeholder article generation | src/pipeline/workers/generate.ts | Phase 1 placeholder; real AI article generation in Phase 2 |
| Empty state message | app/page.tsx | Shows "No pricing data collected yet" until pipeline runs |

## Self-Check: PASSED

- [x] src/pipeline/queues.ts exports collectQueue, extractQueue, scoreQueue, generateQueue
- [x] Each queue has attempts: 3 and backoff type 'exponential'
- [x] src/pipeline/workers/collect.ts creates Worker for 'collect' queue
- [x] src/pipeline/workers/extract.ts creates Worker for 'extract' queue
- [x] src/pipeline/workers/score.ts creates Worker for 'score' queue
- [x] src/pipeline/workers/generate.ts creates Worker for 'generate' queue
- [x] src/pipeline/worker-entry.ts creates all 4 workers
- [x] worker.Dockerfile builds with Playwright chromium
- [x] docker-compose.yml worker service depends on postgres and redis
- [x] app/page.tsx exports revalidate constant (ISR)
- [x] app/page.tsx queries extractions table
- [x] app/page.tsx renders pricing data table with confidence badges
- [x] tests/pipeline.test.ts passes (12 tests)
- [x] Full test suite passes (50 tests)
- [x] TypeScript compiles cleanly (npx tsc --noEmit)
- [x] All commits exist in git log

---

*Phase: 01-foundation-pipeline-core*
*Completed: 2026-06-10*
