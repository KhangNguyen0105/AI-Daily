---
phase: 08-admin-operations
plan: 03
subsystem: admin-operations
tags: [articles, confirm-dialog, toast, source-evidence, admin-ui]
dependency:
  requires: [08-02]
  provides: [ConfirmDialog, ToastContainer, useToast, articles-list, source-evidence-api]
  affects: [admin-articles-edit, admin-pipeline, admin-sources]
tech_stack:
  added: []
  patterns: [pattern-7-server-component, pattern-11-toast-hook, pattern-17-table-header, pattern-18-empty-state, pattern-19-badge-styling]
key_files:
  created:
    - app/components/admin/ConfirmDialog.tsx
    - app/components/admin/Toast.tsx
    - app/admin/articles/page.tsx
    - app/api/admin/articles/[id]/sources/route.ts
  modified: []
decisions:
  - "Server component for articles list (read-only, no client interactivity needed)"
  - "Plain HTML table instead of TanStack (simple list, no sorting/filtering)"
  - "Toast max 3 visible using slice(-3) to avoid UI clutter"
  - "Source evidence API uses date-range query (start-of-day to end-of-day) for extraction matching"
metrics:
  completed: "2026-06-17"
  duration: "verification-only (code pre-implemented)"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 8 Plan 03: Articles List, ConfirmDialog, Toast, and Source Evidence API Summary

## One-Liner

Verified articles list page with status badges, reusable ConfirmDialog/Toast components, and source evidence API route -- all pre-implemented and satisfying plan requirements.

## Tasks Completed

### Task 1: ConfirmDialog and Toast Components (Verified)

**ConfirmDialog** (`app/components/admin/ConfirmDialog.tsx`):
- Client component with `isOpen`, `title`, `message`, `confirmLabel`, `onConfirm`, `onCancel`, `variant` props
- Modal overlay with backdrop click-to-dismiss (`onCancel`)
- Escape key handler via `useEffect` keydown listener
- Focus trap: auto-focuses confirm button on open via `useRef`
- Danger variant renders red confirm button (`bg-red-600`), default renders blue (`bg-blue-600`)
- Card styling: `bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl`

**Toast** (`app/components/admin/Toast.tsx`):
- `useToast` hook returns `{ toasts, addToast, removeToast }`
- `addToast(type, message)` generates unique ID via counter ref, auto-removes after 5s via `setTimeout`
- `ToastContainer` renders toasts in `fixed bottom-6 right-6 z-50 flex flex-col gap-2`
- Left border: `border-green-500` for success, `border-red-500` for error
- Max 3 visible at once via `slice(-3)`
- Dismiss button with X SVG icon

### Task 2: Articles List Page and Source Evidence API (Verified)

**Articles List** (`app/admin/articles/page.tsx`):
- Server component with `export const dynamic = 'force-dynamic'`
- Drizzle query: `db.select({ id, date, title, publishedAt }).from(articles).orderBy(desc(articles.date))`
- Wrapped in try/catch with empty array fallback
- Table columns: Date (`format(new Date(article.date), 'MMM d, yyyy')`), Title (truncated to 60 chars), Status, Edit
- Published badge: `bg-green-100 text-green-800` when `publishedAt` not null
- Draft badge: `bg-gray-100 text-gray-600` when `publishedAt` is null
- Edit link: `/admin/articles/${article.id}/edit` with `text-blue-600`
- Empty state: "No articles yet" / "Articles will appear here once the daily content engine publishes its first digest."
- Table header styling: `text-xs font-semibold uppercase tracking-wide text-gray-500`

**Source Evidence API** (`app/api/admin/articles/[id]/sources/route.ts`):
- Auth check via `auth()` -- returns 401 if no session
- Extracts article ID from params, fetches article date
- Parses date to start-of-day (`T00:00:00.000Z`) and end-of-day (`T23:59:59.999Z`)
- Queries extractions with left join to sources: `db.select({ id, modelName, inputPricePer1m, outputPricePer1m, confidence, sourceName: sources.name, sourceUrl: sources.url, collectedAt }).from(extractions).leftJoin(sources, eq(extractions.sourceId, sources.id)).where(and(gte(collectedAt, startOfDay), lt(collectedAt, endOfDay)))`
- Returns `{ extractions: [...] }`
- Error handling with 500 response

## Schema Verification

All queries are compatible with `src/db/schema.ts`:
- `articles` table: `id` (serial), `date` (varchar), `title` (varchar), `publishedAt` (timestamp)
- `extractions` table: `id` (serial), `modelName` (varchar), `inputPricePer1m` (doublePrecision), `outputPricePer1m` (doublePrecision), `confidence` (enum), `sourceId` (integer FK to sources), `collectedAt` (timestamp)
- `sources` table: `id` (serial), `name` (varchar), `url` (text)
- `db` export from `src/db/index.ts` uses `drizzle-orm/node-postgres` with full schema import

## Decisions Made

1. **Server component for articles list**: No client interactivity needed; direct Drizzle query in server component avoids unnecessary client JS.
2. **Plain HTML table over TanStack**: Simple list with no sorting/filtering/pagination -- TanStack overhead is unjustified.
3. **Toast max 3 via slice(-3)**: Prevents UI clutter when multiple toasts fire in quick succession.
4. **Date-range query for source evidence**: Using `gte`/`lt` with start/end of day timestamps handles the varchar-to-timestamp boundary correctly.

## Deviations from Plan

None -- plan executed exactly as written. All files were pre-implemented and satisfy every must_have.

## Self-Check: PASSED

- All 4 files exist and contain the required exports/components
- Schema compatibility verified (Drizzle queries match column types)
- Pattern compliance verified (Pattern 7, 11, 17, 18, 19 from PATTERNS.md)
