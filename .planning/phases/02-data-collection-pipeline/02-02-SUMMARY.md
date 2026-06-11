---
phase: 02-data-collection-pipeline
plan: 02
subsystem: pipeline
tags: [confidence-scoring, verification, data-quality, source-tiers]
dependency_graph:
  requires: [src/providers/base.ts (ExtractionResult)]
  provides: [SourceTier, ProviderSource, calculateConfidence, compareResults, verifyExtraction]
  affects: [src/pipeline/workers/score.ts (future rewrite)]
tech_stack:
  added: []
  patterns: [source-tier-classification, two-pass-verification, evidence-anchoring]
key_files:
  created:
    - src/providers/types.ts
    - src/pipeline/confidence.ts
    - src/pipeline/verification.ts
    - tests/providers/types.test.ts
    - tests/pipeline/confidence.test.ts
    - tests/pipeline/verification.test.ts
  modified: []
decisions:
  - "Tolerance set to 0.1% relative for numeric comparison in compareResults"
  - "HTML truncated to 100K chars before sending to verification LLM"
  - "Model name comparison is case-insensitive in compareResults"
metrics:
  duration: ~3 min
  completed: "2026-06-11T14:19:56Z"
  tasks_completed: 2
  tasks_total: 2
  tests_added: 35
  tests_total: 90
---

# Phase 2 Plan 02: Confidence Scoring and Two-Pass Verification Summary

Source tier classification with confidence scoring based on tier/completeness/verification, plus two-pass verification with evidence anchoring to detect LLM hallucinations.

## Tasks Completed

### Task 1: Source tier types and confidence scoring module
- **Commit:** c42b26e
- **Files:** src/providers/types.ts, src/pipeline/confidence.ts, tests/providers/types.test.ts, tests/pipeline/confidence.test.ts
- **Tests:** 22 passed (3 types + 19 confidence)
- **Details:** SourceTier type (tier1/tier2/tier3), ProviderSource interface, calculateConfidence with rules: verified=tier1+allFields+verified, likely=tier1+core or tier2+allFields+verified, low_confidence=everything else. hasAllFields and hasCoreFields helpers.

### Task 2: Two-pass verification module
- **Commit:** fad9733
- **Files:** src/pipeline/verification.ts, tests/pipeline/verification.test.ts
- **Tests:** 13 passed (10 compareResults + 3 verifyExtraction)
- **Details:** compareResults with case-insensitive matching and 0.1% relative tolerance. verifyExtraction calls Vercel AI SDK generateObject with evidence-anchored prompt. Disagreement tracking for all numeric fields.

## Key Decisions

1. **0.1% relative tolerance** for numeric comparison - uses max(|a|, |b|) as reference to handle near-zero values
2. **Case-insensitive model name matching** in compareResults to handle inconsistent casing between passes
3. **HTML truncation at 100K chars** before sending to verification LLM (per threat model T-02-02-01)
4. **Null pass1 values are skipped** in comparison (no data to verify against)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. All modules export complete implementations.

## Self-Check: PASSED

- src/providers/types.ts: EXISTS
- src/pipeline/confidence.ts: EXISTS
- src/pipeline/verification.ts: EXISTS
- tests/providers/types.test.ts: EXISTS
- tests/pipeline/confidence.test.ts: EXISTS
- tests/pipeline/verification.test.ts: EXISTS
- Commit c42b26e: FOUND in git log
- Commit fad9733: FOUND in git log
- Full test suite: 90/90 passed
- TypeScript compile: clean
