---
phase: 02-data-collection-pipeline
plan: 04
subsystem: pipeline
tags: [scheduler, bullmq, cron, repeatable-job, pipeline-stats, worker-entry]
depends_on: [02-03]
provides:
  - daily automated pipeline scheduling
  - pipelineRunId propagation for stats tracking
  - 5-worker orchestration with graceful shutdown
affects:
  - daily collection automation
  - pipeline stats accuracy
  - worker process lifecycle
tech_stack:
  added: []
  patterns:
    - "BullMQ repeatable job with cron pattern for daily scheduling"
    - "repeat.key deduplication to prevent duplicate jobs on restart"
    - "Separate daily-pipeline queue that triggers orchestrator"
    - "Additive delta merging for pipeline stats counters"
key_files:
  created:
    - src/pipeline/scheduler.ts
    - tests/pipeline/scheduler.test.ts
  modified:
    - src/pipeline/worker-entry.ts
    - src/pipeline/workers/collect.ts
    - src/pipeline/orchestrator.ts
decisions:
  - "Separate 'daily-pipeline' queue from stage queues for clean architecture"
  - "Additive delta merging in updatePipelineStats for counter increments"
  - "Call updatePipelineStats in worker 'failed' event handler with .catch() to prevent cascading errors"
metrics:
  duration: ~10 minutes
  completed: "2026-06-11"
  tasks_completed: 2
  tasks_total: 2
  tests_added: 8
  tests_total: 116
---

# Phase 2 Plan 4: Daily Scheduler and Pipeline Integration Summary

BullMQ repeatable job triggers orchestrateDailyRun at 6 AM UTC daily; collect worker propagates pipelineRunId for stats tracking across the pipeline.

## Tasks Completed

### Task 1: Create BullMQ Daily Scheduler
- Created `src/pipeline/scheduler.ts` with three exported functions:
  - `setupDailyScheduler()` creates a Queue 'daily-pipeline' and adds a repeatable job with cron pattern '0 6 * * *' and key 'daily-collection'
  - `removeDailyScheduler()` removes the repeatable job (for teardown/disable)
  - `createDailyPipelineWorker()` creates a Worker that calls `orchestrateDailyRun()` on the 'daily-pipeline' queue
- Architecture: The 'daily-pipeline' queue is separate from the 4 stage queues (collect, extract, score, generate). Its sole purpose is to trigger the orchestrator on a cron schedule.
- `repeat.key='daily-collection'` prevents duplicate repeatable jobs when workers restart (T-02-04-01 mitigation)
- 8 unit tests covering: repeatable job pattern, deduplication key, queue cleanup, worker creation, event handlers

### Task 2: Wire Scheduler into Worker Entry and Update Collect Worker
- Updated `src/pipeline/worker-entry.ts`:
  - Calls `setupDailyScheduler()` during startup (before creating workers)
  - Creates 5 workers total: collect, extract, score, generate, daily-pipeline (was 4)
  - Graceful shutdown closes all 5 workers
  - Console log includes 'daily-pipeline' in queue list
- Updated `src/pipeline/workers/collect.ts`:
  - `CollectJobData` and `CollectJobResult` now include optional `pipelineRunId`
  - Worker extracts `pipelineRunId` from job.data
  - Passes `pipelineRunId` to `extractQueue.add()` for downstream propagation
  - On success: calls `updatePipelineStats(pipelineRunId, { attempted: 1, succeeded: 1 })`
  - On failure: calls `updatePipelineStats(pipelineRunId, { attempted: 1, failed: 1 })` in the 'failed' event handler with `.catch()` to prevent cascading errors
  - Imports `updatePipelineStats` from `../orchestrator`
- Updated `src/pipeline/orchestrator.ts`:
  - `updatePipelineStats()` now uses additive merging for numeric fields (deltas are added to current values instead of replacing)
  - This allows workers to pass `{ attempted: 1, succeeded: 1 }` and have counts accumulate correctly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Logic] Changed updatePipelineStats from replacement to additive merge**
- **Found during:** Task 2
- **Issue:** The original `updatePipelineStats` used spread merge (`{ ...currentStats, ...updates }`) which replaces values. The collect worker passes delta values (attempted: 1, succeeded: 1) that need to be added to existing counts, not replace them.
- **Fix:** Changed to additive merging for numeric fields — iterates over updates and adds numeric values to current stats instead of replacing.
- **Files modified:** `src/pipeline/orchestrator.ts`
- **Commit:** 8b8e948

## Decisions Made

1. **Separate daily-pipeline queue**: The scheduler uses its own queue ('daily-pipeline') rather than reusing one of the stage queues. This keeps the trigger mechanism cleanly separated from the pipeline stages.
2. **Additive delta merging**: updatePipelineStats now adds numeric values instead of replacing. This is simpler than having the collect worker fetch current stats and compute new absolute values.
3. **Failed handler stats update with .catch()**: The collect worker's 'failed' event handler calls updatePipelineStats with a .catch() wrapper. If the stats update fails (e.g., DB down), it should not prevent the error handler from completing.

## Self-Check: PASSED

- src/pipeline/scheduler.ts: EXISTS
- tests/pipeline/scheduler.test.ts: EXISTS
- src/pipeline/worker-entry.ts: MODIFIED (5 workers, scheduler setup)
- src/pipeline/workers/collect.ts: MODIFIED (pipelineRunId propagation, stats updates)
- src/pipeline/orchestrator.ts: MODIFIED (additive stats merging)
- Commit 638c888: EXISTS
- Commit 8b8e948: EXISTS
- All 116 tests pass (108 original + 8 new)
- TypeScript compiles clean
