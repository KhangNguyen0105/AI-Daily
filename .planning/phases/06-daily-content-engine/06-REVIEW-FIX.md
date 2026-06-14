---
phase: 06
fixed_at: "2026-06-14T22:00:00Z"
review_path: ".planning/phases/06-daily-content-engine/06-REVIEW.md"
iteration: 1
findings_in_scope: 14
fixed: 11
skipped: 3
status: partial
---

# Phase 6: Code Review Fix Report

**Fixed at:** 2026-06-14T22:00:00Z
**Source review:** `.planning/phases/06-daily-content-engine/06-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 14
- Fixed: 11
- Skipped: 3

## Fixed Issues

### C-01: Missing `ANTHROPIC_API_KEY` in env schema

**Files modified:** `src/lib/env.ts`
**Commit:** 619cfad
**Applied fix:** Added `ANTHROPIC_API_KEY: z.string().optional()` to the env schema, between `OPENAI_API_KEY` and `MIMO_API_KEY`. This prevents runtime crashes when the default `AI_PROVIDER=anthropic` is used without the key being set.

### C-03: generate-worker tests are superficial

**Files modified:** `tests/pipeline/generate-worker.test.ts`
**Commit:** 619cfad
**Applied fix:** Rewrote all 5 tests from scratch. New tests actually invoke the handler via `worker.run()`, verify the full `computeDiff -> generateArticle -> db upsert` pipeline, check today/yesterday date computation, validate upsert values, test `onConflictDoUpdate` for date-based deduplication, verify error propagation from both `computeDiff` and `generateArticle`, and confirm correct articleId return. Total: 6 meaningful tests replacing 5 superficial ones.

### W-01: `@ai-sdk/openai` mock missing `createOpenAI`

**Files modified:** `tests/pipeline/article-generator.test.ts`
**Commit:** 619cfad
**Applied fix:** Added `createOpenAI` to the mock, returning a factory function that creates provider objects. This ensures any test exercising the MIMO provider path uses the mock instead of the real module.

### W-02: Division by zero in `changePercent`

**Files modified:** `src/pipeline/article-diff.ts`
**Commit:** 619cfad
**Applied fix:** Added zero guards before both input and output `changePercent` calculations. When `yesterdayRow.inputPricePer1m === 0` (or `outputPricePer1m === 0`), `changePercent` is set to `0` instead of computing `Infinity`.

### W-03: No try-catch around `format()` in digest page

**Files modified:** `app/digest/page.tsx`
**Commit:** 619cfad
**Applied fix:** Wrapped the `format(new Date(...), 'MMMM d, yyyy')` call in a try-catch. On invalid date, falls back to the raw `article.date` string.

### W-04: Sequential DB calls in `computeDiff`

**Files modified:** `src/pipeline/article-diff.ts`
**Commit:** 619cfad
**Applied fix:** Refactored the three independent DB queries (today's extractions, yesterday's extractions, today's promotions) to run in parallel using `Promise.all()`. Moved the promotions query from the bottom of the function to the top, alongside the other two queries.

### W-05: Unused `eq` import

**Files modified:** `src/pipeline/article-diff.ts`
**Commit:** 619cfad
**Applied fix:** Removed `eq` from the `drizzle-orm` import statement.

### W-06: Unused `desc` import

**Files modified:** `src/pipeline/article-diff.ts`
**Commit:** 619cfad
**Applied fix:** Removed `desc` from the `drizzle-orm` import statement.

### I-02: `createOpenAI` called inside `getModel()` on every invocation

**Files modified:** `src/pipeline/article-generator.ts`
**Commit:** 619cfad
**Applied fix:** Moved `createOpenAI()` call to module level as `mimoProvider`. The `getModel()` function now uses the pre-created `mimoProvider` instance instead of creating a new one on each call.

### I-03: Summary truncation cuts words in half

**Files modified:** `src/pipeline/article-generator.ts`
**Commit:** 619cfad
**Applied fix:** Updated both truncation fallbacks in `parseArticleResponse` to find the last space before the 150-character limit using `lastIndexOf(' ')`, then truncate at that word boundary.

### I-04: Duplicate `<h1>` elements on article page

**Files modified:** `app/components/DigestArticle.tsx`
**Commit:** 619cfad
**Applied fix:** Changed the markdown `h1` component mapping from `<h1>` to `<h2>` (with `text-2xl` instead of `text-3xl`). This prevents duplicate `<h1>` elements when LLM-generated content contains `#` headings.

## Skipped Issues

### C-02: Unused `openai` import in article-generator.ts

**File:** `src/pipeline/article-generator.ts:3`
**Reason:** False positive. The `openai` import IS used at line 28 in the `getModel()` function: `return openai('gpt-4o')` (the `case 'openai':` branch). The reviewer appears to have missed this usage.
**Original issue:** Claimed `openai` is imported but never used, with only `createOpenAI` being used for the MIMO case.

### I-01: `sourceName` stores `sourceId` as string

**File:** `src/pipeline/article-diff.ts:130-131, 144`
**Reason:** Documented with TODO comments but not fixed. The actual fix requires joining with the `sources` table and restructuring the query, which is a larger change best deferred to a dedicated phase. Both occurrences now have `// TODO(I-01)` comments.
**Original issue:** `sourceName` field stores `String(row.sourceId)` instead of the actual provider name.

### I-05: Tests use `any` type extensively

**File:** `tests/pipeline/article-diff.test.ts:4, 92`
**Reason:** Low priority. Typing mock results to match Drizzle's select return type would add complexity to the test file without significantly improving test quality. The `any[][]` typing is acceptable in test files.
**Original issue:** `selectCallResults` is typed as `any[][]`.

## Test Results

```
Test Files  3 passed (3)
     Tests  20 passed (20)
  Duration  1.42s
```

All 20 tests pass across the 3 modified test files:
- `tests/pipeline/generate-worker.test.ts` — 6 tests (was 5 superficial tests)
- `tests/pipeline/article-generator.test.ts` — 8 tests
- `tests/pipeline/article-diff.test.ts` — 6 tests

TypeScript compilation: Clean (0 errors in modified files; 2 pre-existing errors in unrelated `tests/pricing-utils.test.ts`).

Full test suite: 285 passed, 1 failed (pre-existing timeout in `tests/pipeline/score-worker.test.ts`, unrelated to these changes).

---

_Fixed: 2026-06-14T22:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
