---
phase: 08-admin-operations
reviewed: 2026-06-17T12:00:00Z
depth: standard
files_reviewed: 41
files_reviewed_list:
  - app/admin/layout.tsx
  - app/admin/page.tsx
  - app/admin/login/page.tsx
  - app/admin/login/LoginForm.tsx
  - app/admin/articles/page.tsx
  - app/admin/articles/[id]/edit/page.tsx
  - app/admin/articles/[id]/edit/EditArticleClient.tsx
  - app/admin/pipeline/page.tsx
  - app/admin/sources/page.tsx
  - app/components/admin/SessionProvider.tsx
  - app/components/admin/AdminHeader.tsx
  - app/components/admin/AdminSidebar.tsx
  - app/components/admin/SummaryCard.tsx
  - app/components/admin/ConfirmDialog.tsx
  - app/components/admin/Toast.tsx
  - app/components/admin/ArticleEditForm.tsx
  - app/components/admin/VersionHistoryTable.tsx
  - app/components/admin/PipelineRunsTable.tsx
  - app/components/admin/ErrorLogTable.tsx
  - app/components/admin/ReCrawlTrigger.tsx
  - app/components/admin/RegenerateTrigger.tsx
  - app/components/admin/RunFullPipelineTrigger.tsx
  - app/components/admin/AutoPublishToggle.tsx
  - app/components/admin/SourcesTable.tsx
  - app/api/auth/[...nextauth]/route.ts
  - app/api/admin/articles/[id]/route.ts
  - app/api/admin/articles/[id]/sources/route.ts
  - app/api/admin/articles/[id]/versions/route.ts
  - app/api/admin/pipeline/runs/route.ts
  - app/api/admin/pipeline/errors/route.ts
  - app/api/admin/pipeline/stream/route.ts
  - app/api/admin/pipeline/re-crawl/route.ts
  - app/api/admin/pipeline/regenerate/route.ts
  - app/api/admin/pipeline/run-full/route.ts
  - app/api/admin/pipeline/cancel/route.ts
  - app/api/admin/settings/route.ts
  - app/api/admin/sources/route.ts
  - app/api/admin/sources/[id]/trust/route.ts
  - src/auth.ts
  - middleware.ts
  - src/db/schema.ts
findings:
  critical: 5
  warning: 7
  info: 3
  total: 15
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-06-17T12:00:00Z
**Depth:** standard
**Files Reviewed:** 41
**Status:** issues_found

## Summary

Reviewed the full admin operations phase: authentication (NextAuth credential provider), middleware auth guard, 4 admin pages (overview, articles, pipeline, sources), 12 admin components, 13 API routes, and the database schema additions. The implementation covers article editing with version history, pipeline monitoring with SSE streaming, source trust management, and admin settings.

The most serious issues are concentrated in the pipeline operations: the "run full pipeline" endpoint fires a background poller with no timeout that can run forever, the cancel endpoint only updates the database without stopping active queue jobs, and there is no concurrency guard to prevent multiple simultaneous pipeline runs. These three issues together create a scenario where pipeline resources can be permanently leaked.

Note: The previous review pass (2026-06-15) covered 39 files and addressed 9 findings (all fixed). This review covers 41 files including the pipeline stream, run-full, cancel, and RunFullPipelineTrigger files that were added in a later plan. The previously fixed findings (CR-01 cross-article version scoping, CR-02 transaction wrapping, WR-01 duration calc, WR-02 sources query, WR-03 useEffect deps, WR-04 NEXTAUTH_SECRET validation, IN-01 date formatting, IN-02 double body read) remain correctly fixed in the current codebase.

## Critical Issues

### CR-01: Run-full background poller has no timeout and can run indefinitely

**File:** `app/api/admin/pipeline/run-full/route.ts:17-49`

**Issue:** The `POST /api/admin/pipeline/run-full` handler fires a detached `(async () => { ... })()` background task containing a `while (true)` loop that polls four BullMQ queues every 5 seconds. There is no maximum duration, no maximum iteration count, and no abort mechanism. If queues never reach empty (e.g., a job re-enqueues itself, or a queue connection drops causing `getJobCounts` to always return non-zero), this loop runs forever within the Next.js server process. If the server restarts or the serverless function is recycled, the pipeline run row stays in "running" state permanently because `finalizePipelineRun` is never called. Multiple invocations of this endpoint create multiple concurrent pollers, each holding references to the same queues.

**Fix:** Add a maximum duration timeout:

```typescript
const MAX_PIPELINE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

(async () => {
  const deadline = Date.now() + MAX_PIPELINE_DURATION_MS;
  await new Promise(r => setTimeout(r, 10000));

  let emptyCount = 0;
  while (Date.now() < deadline) {
    try {
      // ... existing queue count logic ...
      if (totalPending === 0) {
        emptyCount++;
        if (emptyCount >= 2) {
          await finalizePipelineRun(pipelineRunId, 'completed');
          return;
        }
      } else {
        emptyCount = 0;
      }
    } catch (err) {
      console.error('Error checking queue status:', err);
    }
    await new Promise(r => setTimeout(r, 5000));
  }

  // Timed out
  try {
    await finalizePipelineRun(pipelineRunId, 'failed');
  } catch (err) {
    console.error('Failed to finalize timed-out pipeline:', err);
  }
})();
```

### CR-02: Pipeline cancel only updates DB status, does not stop active BullMQ jobs

**File:** `app/api/admin/pipeline/cancel/route.ts:11-16`

**Issue:** The cancel endpoint sets the pipeline run status to `failed` in the database but does not call `job.remove()` or `job.discard()` on any active BullMQ jobs in the collect, extract, score, or generate queues. The user sees "Cancelled" in the UI but all queued and active jobs continue running to completion, consuming API credits, LLM tokens, and database resources. This defeats the purpose of a cancel button and gives false feedback.

**Fix:** Import the queue instances and remove/discard active jobs for the given pipeline run:

```typescript
import { collectQueue, extractQueue, scoreQueue, generateQueue } from '@/src/pipeline/queues';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await request.json();
    if (typeof id !== 'number') {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const queues = [collectQueue, extractQueue, scoreQueue, generateQueue];
    for (const queue of queues) {
      const jobs = await queue.getJobs(['active', 'waiting', 'delayed']);
      for (const job of jobs) {
        if (job.data?.pipelineRunId === id) {
          await job.remove();
        }
      }
    }

    await db.update(pipelineRuns)
      .set({ status: 'failed', completedAt: new Date() })
      .where(eq(pipelineRuns.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling pipeline:', error);
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }
}
```

### CR-03: No concurrency guard on run-full pipeline

**File:** `app/api/admin/pipeline/run-full/route.ts:13-16`

**Issue:** There is no check for whether a pipeline run is already in `running` state before calling `orchestrateDailyRun()`. If an admin clicks "Run Full Pipeline" twice (or two admins trigger it), two concurrent `orchestrateDailyRun()` calls execute simultaneously, creating duplicate jobs in all four queues, duplicate pipeline run rows, and two independent background pollers. This can cause duplicate extractions, duplicate articles, and race conditions on shared database rows.

**Fix:** Add a concurrency check before starting:

```typescript
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const runningPipelines = await db
      .select({ id: pipelineRuns.id })
      .from(pipelineRuns)
      .where(eq(pipelineRuns.status, 'running'))
      .limit(1);

    if (runningPipelines.length > 0) {
      return NextResponse.json(
        { error: 'A pipeline run is already in progress' },
        { status: 409 }
      );
    }

    const pipelineRunId = await orchestrateDailyRun();
    // ... rest of background task
  }
}
```

### CR-04: Fire-and-forget background task becomes infinite error loop if finalize fails

**File:** `app/api/admin/pipeline/run-full/route.ts:37-39`

**Issue:** When the queue polling detects `totalPending === 0` and `emptyCount >= 2`, it calls `finalizePipelineRun(pipelineRunId, 'completed')` inside a try block. If `finalizePipelineRun` throws (e.g., database connection lost), the error is caught and logged but the loop continues. On the next iteration, `totalPending` is still 0, `emptyCount` resets, and after two more successful polls it tries to finalize again. This creates an infinite cycle of "finalize -> fail -> poll -> finalize -> fail" running every 5 seconds forever, flooding logs with error messages.

**Fix:** Track finalize failures and give up after a limit:

```typescript
let finalizeAttempts = 0;
const MAX_FINALIZE_ATTEMPTS = 3;

// Inside the loop, after emptyCount >= 2:
if (emptyCount >= 2) {
  try {
    await finalizePipelineRun(pipelineRunId, 'completed');
    return;
  } catch (err) {
    finalizeAttempts++;
    console.error(`Finalize attempt ${finalizeAttempts} failed:`, err);
    if (finalizeAttempts >= MAX_FINALIZE_ATTEMPTS) {
      return; // Exit loop, pipeline stays running (manual cleanup needed)
    }
  }
}
```

### CR-05: Cancel endpoint accepts unvalidated id type and can cancel any run state

**File:** `app/api/admin/pipeline/cancel/route.ts:12-13`

**Issue:** The `id` extracted from `request.json()` is only checked for truthiness (`if (!id)`). It could be a string `"1"`, an object, or any other truthy value passed directly to `eq(pipelineRuns.id, id)`. Additionally, there is no check that the pipeline run is actually in `running` state -- the endpoint will mark a `completed` or `failed` run as `failed` again, which could corrupt audit data.

**Fix:** Validate the id type and check the current state:

```typescript
const body = await request.json();
const id = Number(body.id);
if (!id || isNaN(id) || !Number.isInteger(id)) {
  return NextResponse.json({ error: 'Invalid pipeline run ID' }, { status: 400 });
}

const [run] = await db.select().from(pipelineRuns).where(eq(pipelineRuns.id, id)).limit(1);
if (!run) {
  return NextResponse.json({ error: 'Pipeline run not found' }, { status: 404 });
}
if (run.status !== 'running') {
  return NextResponse.json({ error: 'Pipeline run is not in running state' }, { status: 409 });
}
```

## Warnings

### WR-01: SSE stream polls database every 1 second without backoff

**File:** `app/api/admin/pipeline/stream/route.ts:23`

**Issue:** The SSE endpoint polls four tables via `db.select().from(pipelineRuns)` every 1000ms. Each connected admin browser tab creates a separate polling loop. With 3 tabs open, that is 3 database queries per second sustained indefinitely. The data only changes when a pipeline run starts or completes (infrequent events). There is no backoff when idle and no mechanism to reduce polling frequency when no pipeline activity is occurring.

**Fix:** Increase the interval to 5 seconds (still responsive for a pipeline monitor):

```typescript
const interval = setInterval(async () => {
  // ...
}, 5000);
```

### WR-02: Silent empty catch blocks in admin server pages hide database failures

**Files:**
- `app/admin/page.tsx:21-23, 26-28, 35-37`
- `app/admin/articles/page.tsx:27-29`

**Issue:** Multiple server-side admin pages catch all errors silently and render empty/default state. If the database is down or misconfigured, the admin sees "No runs yet", "No articles yet", or "0 models tracked" instead of an error message. This makes debugging infrastructure problems extremely difficult.

**Fix:** At minimum, log the error:

```typescript
} catch (error) {
  console.error('Failed to load pipeline runs:', error);
}
```

### WR-03: Settings API accepts arbitrary key names without allowlist

**File:** `app/api/admin/settings/route.ts:34-37`

**Issue:** The `updateSchema` validates that `key` is a non-empty string and `value` is a string, but does not restrict which keys can be set. An admin (or an attacker who obtains admin access) could insert arbitrary keys into the `admin_settings` table that might be consumed by other parts of the application.

**Fix:** Add an allowlist of valid setting keys:

```typescript
const VALID_KEYS = ['auto_publish'] as const;

const updateSchema = z.object({
  key: z.enum(VALID_KEYS),
  value: z.string(),
});
```

### WR-04: Password comparison uses non-timing-safe operator

**File:** `src/auth.ts:21`

**Issue:** The admin password is compared using the `===` operator: `credentials.password === adminPassword`. The `===` operator short-circuits on the first non-matching character, making it theoretically vulnerable to timing attacks. While exploiting timing differences over a network is difficult, using `crypto.timingSafeEqual()` is a security best practice for credential comparison.

**Fix:**

```typescript
import { timingSafeEqual } from 'crypto';

authorize: async (credentials) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set');
    return null;
  }
  const password = credentials.password ?? '';
  if (
    password.length === adminPassword.length &&
    timingSafeEqual(Buffer.from(password), Buffer.from(adminPassword))
  ) {
    return { id: 'admin', name: 'Admin' };
  }
  return null;
},
```

### WR-05: SSE stream error does not stop the polling interval

**File:** `app/api/admin/pipeline/stream/route.ts:38-39`

**Issue:** When the database query inside the polling interval throws, the error is caught and logged but the interval continues running. If the database is permanently down, this logs an error every second for the entire lifetime of the SSE connection. The `isClosed` flag is only set on the `abort` signal, not on repeated errors.

**Fix:** Track consecutive errors and stop after a threshold:

```typescript
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 10;

const interval = setInterval(async () => {
  if (isClosed) { clearInterval(interval); return; }
  try {
    // ... query ...
    consecutiveErrors = 0;
    controller.enqueue(new TextEncoder().encode(`data: ${dataString}\n\n`));
  } catch (error) {
    consecutiveErrors++;
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      isClosed = true;
      clearInterval(interval);
      try { controller.close(); } catch {}
    }
  }
}, 1000);
```

### WR-06: Pipeline cancel button provides no user feedback

**File:** `app/components/admin/PipelineRunsTable.tsx:33-46`

**Issue:** The `handleCancel` function makes a `fetch` request to the cancel endpoint but does not check the response status, does not display a success toast, and does not display an error toast. The user clicks "Cancel", sees the button change to "...", and then has no idea whether the cancellation succeeded.

**Fix:** Check response and provide feedback by passing toast callbacks as props or accepting an `onSuccess`/`onError` callback pair.

### WR-07: Date range for extraction lookup is hardcoded to UTC

**Files:**
- `app/admin/articles/[id]/edit/page.tsx:57-58`
- `app/api/admin/articles/[id]/sources/route.ts:35-36`

**Issue:** The extraction query constructs date boundaries as `${article.date}T00:00:00.000Z` to `${article.date}T23:59:59.999Z`, which is UTC. If the PostgreSQL server timezone differs from UTC, or if `collectedAt` values are stored with local-timezone awareness, extractions could be missed or incorrectly attributed. The `collectedAt` column is a `timestamp` (not `timestamptz`), so its interpretation depends on the PostgreSQL `timezone` setting.

**Fix:** Either use `timestamptz` columns throughout the schema or document the UTC convention clearly. For the query, consider using `>=` and `<` with explicit UTC boundaries (which is already done) but add a code comment documenting the assumption.

## Info

### IN-01: Console.error statements throughout production API code

**Files:** All 13 API route files under `app/api/admin/`

**Issue:** Every API route uses `console.error()` for error logging. In production, these go to stdout with no structured metadata (no request ID, no user ID, no timestamp formatting). Consider a structured logger for better observability.

### IN-02: Magic number for toast auto-dismiss timeout

**File:** `app/components/admin/Toast.tsx:21`

**Issue:** The 5000ms timeout for auto-dismissing toasts is a magic number. Consider extracting as a named constant `TOAST_AUTO_DISMISS_MS`.

### IN-03: Catch blocks discard error objects in several components

**Files:**
- `app/admin/login/LoginForm.tsx:30`
- `app/admin/articles/[id]/edit/EditArticleClient.tsx:68`
- `app/components/admin/ReCrawlTrigger.tsx:35`
- `app/components/admin/RegenerateTrigger.tsx:34`
- `app/components/admin/RunFullPipelineTrigger.tsx:29`

**Issue:** Multiple catch blocks use `catch {` without capturing the error parameter. While valid modern TypeScript, this prevents logging the actual error for debugging.

**Fix:**

```typescript
} catch (error) {
  console.error('Operation failed:', error);
  addToast('error', 'User-friendly message');
}
```

---

_Reviewed: 2026-06-17T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Fixes Applied

**Applied:** 2026-06-18
**Fixer:** Claude (gsd-code-fixer)

### Critical Issues Fixed

**CR-01: Run-full background poller timeout** (`app/api/admin/pipeline/run-full/route.ts`)
- Added `MAX_PIPELINE_DURATION_MS = 30 * 60 * 1000` (30 minutes) constant
- Changed `while (true)` to `while (Date.now() < deadline)` with deadline check
- Added timeout finalization: if deadline is exceeded, the pipeline run is marked as `failed`

**CR-02: Pipeline cancel removes BullMQ jobs** (`app/api/admin/pipeline/cancel/route.ts`)
- Added dynamic import of `collectQueue`, `extractQueue`, `scoreQueue`, `generateQueue`
- Before updating DB status, iterates all jobs in `active`, `waiting`, and `delayed` states across all four queues
- Removes any job whose `data.pipelineRunId` matches the cancelled run ID

**CR-03: Concurrency guard on run-full** (`app/api/admin/pipeline/run-full/route.ts`)
- Before calling `orchestrateDailyRun()`, queries `pipelineRuns` table for any existing `running` status
- Returns HTTP 409 with `"A pipeline run is already in progress"` if a run is active
- Prevents duplicate concurrent pipeline runs from double-clicks or multiple admins

**CR-04: Finalize failure loop prevention** (`app/api/admin/pipeline/run-full/route.ts`)
- Wrapped `finalizePipelineRun` call in its own try/catch inside the `emptyCount >= 2` block
- Tracks `finalizeAttempts` counter with `MAX_FINALIZE_ATTEMPTS = 3`
- After 3 failed finalize attempts, exits the loop (pipeline stays `running` for manual cleanup)

**CR-05: Cancel endpoint input validation** (`app/api/admin/pipeline/cancel/route.ts`)
- Converts `body.id` to `Number()` and validates with `isNaN()` and `Number.isInteger()`
- Checks that the pipeline run exists (returns 404 if not found)
- Checks that the run is in `running` state (returns 409 if not)

### Warnings Fixed

**WR-01: SSE poll interval** (`app/api/admin/pipeline/stream/route.ts`)
- Increased `setInterval` from 1000ms to 5000ms (pipeline events are infrequent)

**WR-02: Silent catch blocks** (`app/admin/page.tsx`, `app/admin/articles/page.tsx`)
- All 4 silent `catch {}` blocks now capture the error parameter and log with `console.error()`

**WR-03: Settings key allowlist** (`app/api/admin/settings/route.ts`)
- Added `VALID_KEYS = ['auto_publish'] as const`
- Changed `updateSchema.key` from `z.string().min(1)` to `z.enum(VALID_KEYS)`

**WR-04: Timing-safe password comparison** (`src/auth.ts`)
- Imported `timingSafeEqual` from Node.js `crypto` module
- Replaced `===` comparison with `timingSafeEqual(Buffer.from(password), Buffer.from(adminPassword))`
- Added length check before `timingSafeEqual` to prevent buffer length mismatch errors

**WR-05: SSE consecutive error tracking** (`app/api/admin/pipeline/stream/route.ts`)
- Added `consecutiveErrors` counter and `MAX_CONSECUTIVE_ERRORS = 10` threshold
- Resets counter on successful query, increments on error
- After 10 consecutive errors, sets `isClosed = true`, clears interval, and closes the stream controller

**WR-06: Cancel button feedback** (`app/components/admin/PipelineRunsTable.tsx`, `app/admin/pipeline/page.tsx`)
- Added `onSuccess` and `onError` optional callback props to `PipelineRunsTable`
- `handleCancel` now checks response status and calls appropriate callback
- Updated `pipeline/page.tsx` to pass `addToast` callbacks to `PipelineRunsTable`

**WR-07: UTC date range documentation** (`app/admin/articles/[id]/edit/page.tsx`, `app/api/admin/articles/[id]/sources/route.ts`)
- Added code comments documenting the UTC convention for date boundary construction

### Info Issues Fixed

**IN-02: Toast magic number** (`app/components/admin/Toast.tsx`)
- Extracted `TOAST_AUTO_DISMISS_MS = 5000` as a named constant
- Replaced hardcoded `5000` with the constant

**IN-03: Catch block error capture** (`app/admin/login/LoginForm.tsx`, `app/admin/articles/[id]/edit/EditArticleClient.tsx`)
- `LoginForm.tsx`: Changed `catch {` to `catch (error)` with `console.error('Login failed:', error)`
- `EditArticleClient.tsx`: Fixed two catch blocks (save and rollback) to capture and log errors
- Note: `ReCrawlTrigger.tsx`, `RegenerateTrigger.tsx`, and `RunFullPipelineTrigger.tsx` already had error parameters

**IN-01: Structured logging** -- Noted but not implemented. This is a recommendation for future improvement (replace `console.error` with a structured logger across all API routes).

### Files Modified

1. `app/api/admin/pipeline/run-full/route.ts` (CR-01, CR-03, CR-04)
2. `app/api/admin/pipeline/cancel/route.ts` (CR-02, CR-05)
3. `app/api/admin/pipeline/stream/route.ts` (WR-01, WR-05)
4. `app/admin/page.tsx` (WR-02)
5. `app/admin/articles/page.tsx` (WR-02)
6. `app/api/admin/settings/route.ts` (WR-03)
7. `src/auth.ts` (WR-04)
8. `app/components/admin/PipelineRunsTable.tsx` (WR-06)
9. `app/admin/pipeline/page.tsx` (WR-06)
10. `app/admin/articles/[id]/edit/page.tsx` (WR-07)
11. `app/api/admin/articles/[id]/sources/route.ts` (WR-07)
12. `app/components/admin/Toast.tsx` (IN-02)
13. `app/admin/login/LoginForm.tsx` (IN-03)
14. `app/admin/articles/[id]/edit/EditArticleClient.tsx` (IN-03)
