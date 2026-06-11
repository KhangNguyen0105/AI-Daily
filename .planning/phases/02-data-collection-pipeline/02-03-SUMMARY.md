---
phase: 02-data-collection-pipeline
plan: 03
subsystem: pipeline
tags: [orchestrator, score-worker, verification, confidence-scoring, hallucination-prevention]
depends_on: [02-01, 02-02]
provides:
  - pipeline orchestration
  - real verification and confidence scoring
  - extraction quarantine on disagreement
affects:
  - daily pipeline execution
  - extraction confidence levels
  - downstream article generation
tech_stack:
  added: []
  patterns:
    - "Two-pass verification with LLM re-extraction"
    - "Rule-based confidence scoring (source tier + completeness + verification)"
    - "Quarantine on verification disagreement"
key_files:
  created:
    - src/pipeline/orchestrator.ts
    - tests/pipeline/orchestrator.test.ts
    - tests/pipeline/score-worker.test.ts
  modified:
    - src/pipeline/workers/score.ts
    - src/pipeline/workers/extract.ts
decisions:
  - "Default source tier to tier1 for all providers (official pricing pages)"
  - "Quarantine (force low_confidence) when verification disagreements are found"
  - "Fall back to existing confidence on LLM verification failure rather than failing the pipeline"
metrics:
  duration: ~15 minutes
  completed: "2026-06-11"
  tasks_completed: 2
  tasks_total: 2
  tests_added: 18
  tests_total: 108
---

# Phase 2 Plan 3: Pipeline Orchestrator and Score Worker Summary

Pipeline orchestrator coordinates daily runs across all 12 providers with stats tracking; score worker performs real two-pass verification and evidence-based confidence scoring.

## Tasks Completed

### Task 1: Pipeline Orchestrator
- Created `src/pipeline/orchestrator.ts` with three exported functions:
  - `orchestrateDailyRun()` creates a pipelineRun record (status: 'running') and enqueues collect jobs for all registered providers
  - `updatePipelineStats()` merges partial stats updates into existing pipeline run stats
  - `finalizePipelineRun()` sets terminal status ('completed' | 'failed') and completedAt timestamp
- `PipelineStats` interface tracks: totalProviders, attempted, succeeded, failed, extractions, verifiedCount, likelyCount, lowConfidenceCount
- 8 unit tests covering run creation, provider enqueueing, stats merging, and finalization

### Task 2: Score Worker Rewrite
- Replaced Phase 1 pass-through score worker with real two-pass verification
- Score worker now: fetches rawData HTML from DB, fetches extraction records, runs verifyExtraction (LLM second-pass), calculates confidence via calculateConfidence, quarantines on disagreements
- Extract worker updated to pass rawDataId and sourceId to score queue
- Error handling: falls back to existing confidence when LLM verification fails
- 10 unit tests covering verification invocation, confidence calculation, DB update, quarantine, error fallback, and generateQueue chaining

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Default source tier to tier1**: All providers crawl official pricing pages, so tier1 is the correct default. The source name is fetched but not yet used for tier lookup (future work can map source names to tiers).
2. **Quarantine on disagreement**: When verification finds disagreements, confidence is forced to low_confidence regardless of what calculateConfidence returns. This prevents potentially incorrect data from propagating.
3. **Graceful verification failure**: If the LLM API call fails, the score worker logs the error and keeps the extraction's existing confidence rather than failing the entire pipeline. This ensures one provider's API issues don't block all providers.

## Self-Check: PASSED

- src/pipeline/orchestrator.ts: EXISTS
- tests/pipeline/orchestrator.test.ts: EXISTS
- tests/pipeline/score-worker.test.ts: EXISTS
- src/pipeline/workers/score.ts: MODIFIED (rewritten)
- src/pipeline/workers/extract.ts: MODIFIED (added rawDataId/sourceId to scoreQueue.add)
- Commit e2b45ad: EXISTS
- Commit 0440f0f: EXISTS
- All 108 tests pass
- TypeScript compiles clean
