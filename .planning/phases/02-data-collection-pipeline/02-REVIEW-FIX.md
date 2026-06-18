---
phase: 02-data-collection-pipeline
fixed_at: 2026-06-16T19:00:00Z
review_path: .planning/phases/02-data-collection-pipeline/02-REVIEW.md
iteration: 4
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-06-16T19:00:00Z
**Source review:** .planning/phases/02-data-collection-pipeline/02-REVIEW.md
**Iteration:** 4

**Summary:**
- Findings in scope: 4 (1 critical, 3 warning)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-09: Pipeline runs stuck in 'running' forever when all extractions are low confidence

**Files modified:** `src/pipeline/workers/score.ts`
**Commit:** 088645a
**Applied fix:** Added a guard in the score worker that finalizes the pipeline run as 'completed' when all extractions are low confidence and no generate job will be created. Uses a `WHERE status = 'running'` clause to prevent overwriting a status that another score worker or the generate worker may have already set. Added `pipelineRuns` to schema imports and `and` to drizzle-orm imports.

### WR-10: `getAIModel()` uses wrong model name when only OPENAI_API_KEY is set

**Files modified:** `src/lib/ai-client.ts`
**Commit:** d64de4e
**Applied fix:** Implemented provider-aware model selection in `getAIModel()`. The function now checks which API key is set and uses the appropriate model name: `env.MIMO_MODEL` for Mimo, `'gpt-4o'` for OpenAI, `'claude-sonnet-4-20250514'` for Anthropic. Also added `createAnthropic` import from `@ai-sdk/anthropic` and Anthropic support to both `resolveProvider()` and `getAIModel()`.

### WR-11: `article-diff.ts` shows numeric source IDs instead of provider names

**Files modified:** `src/pipeline/article-diff.ts`
**Commit:** f1c56b7
**Applied fix:** Joined both today's and yesterday's extraction queries with the `sources` table using `leftJoin(sources, eq(extractions.sourceId, sources.id))`. Changed the select to use `sourceName: sources.name` instead of `sourceId: extractions.sourceId`. Updated the `deduplicateByModel` function type to use `sourceName: string` instead of `sourceId: number`. Changed `sourceName: String(row.sourceId)` to `sourceName: row.sourceName ?? 'unknown'` in both result-building blocks. Added `sources` to schema imports and `eq` to drizzle-orm imports.

### WR-12: Multiple concurrent generate jobs for the same date overwrite each other

**Files modified:** `src/pipeline/workers/generate.ts`
**Commit:** 889e91d
**Applied fix:** Added a deduplication check at the start of the generate worker that queries the articles table for an existing article with today's date. If an article already exists, the worker skips the expensive LLM call and returns the existing article ID. The pipeline run is still finalized so it doesn't stay 'running'. The check is placed before the `computeDiff` and `generateArticle` calls to avoid wasted computation. Added `eq` import from drizzle-orm.

## Skipped Issues

None -- all findings were successfully fixed.

---

_Fixed: 2026-06-16T19:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 4_
