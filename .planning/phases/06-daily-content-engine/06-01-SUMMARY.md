---
phase: 06-daily-content-engine
plan: 01
subsystem: database
tags: [drizzle, postgres, schema, env-validation, zod, diff-computation, vitest]

# Dependency graph
requires: []
provides:
  - "articles table with date (unique) and summary columns for upsert and archive display"
  - "AI_PROVIDER and AI_FALLBACK_PROVIDER env var validation with defaults"
  - "computeDiff function for comparing today vs yesterday extractions"
  - "DiffResult interface for structured diff output"
affects: [06-02-article-generation, 06-03-digest-pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "UTC day range helper for date-bounded queries"
    - "Deduplication by modelName keeping latest extraction"
    - "First-run handling: empty yesterday treats all extractions as new"
    - "vi.mock with module-level state for sequential db.select mocking"

key-files:
  created:
    - src/pipeline/article-diff.ts
    - tests/pipeline/article-diff.test.ts
  modified:
    - src/db/schema.ts
    - src/lib/env.ts
    - src/pipeline/workers/generate.ts

key-decisions:
  - "date column uses varchar(10) not pgCore date type for consistent YYYY-MM-DD string format"
  - "summary column is nullable since existing articles don't have it"
  - "sourceName in DiffResult uses sourceId as string placeholder (resolved in 06-02)"
  - "First-run case (empty yesterday) treats ALL extractions as newModels per D-05/Pitfall 3"

patterns-established:
  - "UTC day range computation via utcDayRange() helper"
  - "Extraction deduplication by modelName keeping highest collectedAt"
  - "Mock pattern: module-level state variable with vi.mock for sequential db calls"

requirements-completed: [CONT-01, CONT-04]

# Metrics
duration: 6min
completed: 2026-06-14
---

# Phase 6 Plan 01: Schema Extensions and Diff Computation Summary

**articles table extended with date (unique) and summary columns; computeDiff function identifies new models, price changes, and promotions between two UTC dates with 6 passing tests**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-14T14:09:06Z
- **Completed:** 2026-06-14T14:14:56Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added `date` (unique varchar 10) and `summary` (varchar 500) columns to articles table for upsert targeting and archive display
- Added `AI_PROVIDER` and `AI_FALLBACK_PROVIDER` env var validation with Zod defaults
- Built `computeDiff` function that compares today vs yesterday extractions with 6 test cases covering: new models, price changes, identical data, promotions, empty today, and first-run (empty yesterday)
- Fixed pre-existing TS error in generate.ts placeholder to include new required `date` column

## Files Created/Modified
- `src/db/schema.ts` - Added date (unique) and summary columns to articles table
- `src/lib/env.ts` - Added AI_PROVIDER and AI_FALLBACK_PROVIDER env var validation
- `src/pipeline/article-diff.ts` - NEW: computeDiff function with DiffResult interface
- `tests/pipeline/article-diff.test.ts` - NEW: 6 unit tests for diff computation
- `src/pipeline/workers/generate.ts` - Fixed placeholder to include date field

## Decisions Made
- Used `varchar(10)` for date column instead of pgCore `date` type — consistent YYYY-MM-DD string format, simpler upsert targeting
- Made `summary` column nullable — existing articles don't have summaries, will be populated by generator in 06-02
- `sourceName` in DiffResult currently stores `sourceId` as string — proper source name join deferred to 06-02 when sources table join is needed
- First-run case (empty yesterday) treats ALL today's extractions as newModels per D-05 and Pitfall 3 from research

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed generate.ts placeholder to include new date column**
- **Found during:** Task 1 (Schema extensions)
- **Issue:** Making `date` column `notNull()` broke TypeScript compilation in the existing generate.ts placeholder worker which didn't include the `date` field in its insert
- **Fix:** Added `date: today` to the insert values in generate.ts placeholder
- **Files modified:** src/pipeline/workers/generate.ts
- **Verification:** `npx tsc --noEmit` no longer errors on generate.ts
- **Committed in:** N/A (no commits per execution rules)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary fix for TypeScript compilation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
- `sourceName` in DiffResult.newModels stores `sourceId` as string (not the actual source name). This will be resolved when the sources table join is added in 06-02 for the article generator prompt.

## Next Phase Readiness
- Schema ready for article upsert with date-based targeting
- computeDiff function ready for use by article generator (06-02)
- AI provider env vars ready for Vercel AI SDK integration (06-02)

## Self-Check: PASSED

All claimed files exist. All acceptance criteria verified.

---
*Phase: 06-daily-content-engine*
*Completed: 2026-06-14*
