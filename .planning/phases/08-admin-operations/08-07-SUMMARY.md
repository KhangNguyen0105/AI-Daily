---
phase: 08-admin-operations
plan: 07
subsystem: ui
tags: [react, nextjs, drizzle, api-routes, admin-dashboard]

# Dependency graph
requires:
  - phase: 08-admin-operations
    provides: Auth infrastructure, admin layout, ConfirmDialog, Toast components
provides:
  - Sources management page at /admin/sources
  - SourcesTable component with filters, expandable rows, trust toggle
  - GET /api/admin/sources API route with status/type filtering
  - PATCH /api/admin/sources/[id]/trust API route for trust toggle
affects: [admin-operations, data-sources]

# Tech tracking
tech-stack:
  added: []
  patterns: [optimistic-toggle, expandable-table-row, client-page-data-fetching, filter-dropdowns]

key-files:
  created:
    - app/admin/sources/page.tsx
    - app/components/admin/SourcesTable.tsx
    - app/api/admin/sources/route.ts
    - app/api/admin/sources/[id]/trust/route.ts
  modified: []

key-decisions:
  - "Trust toggle uses optimistic UI pattern (loading state + refresh) instead of ConfirmDialog for better UX"
  - "Empty state shows contextual message based on whether no sources exist or filters produce no results"

patterns-established:
  - "Optimistic toggle switch with loading state and error revert"
  - "Expandable table row with URL and timestamp details"
  - "Client-side filtering with status and type dropdowns"

requirements-completed: [ADMN-04, ADMN-07]

# Metrics
duration: 5min
completed: 2026-06-17
---

# Phase 8 Plan 7: Sources Management Summary

**Sources management page with filterable table, expandable rows, and optimistic trust toggle for admin control of data sources**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-17T14:44:14Z
- **Completed:** 2026-06-17T14:49:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Sources management page at /admin/sources with real-time data fetching
- SourcesTable component with status and type filter dropdowns
- Expandable rows showing URL and last updated timestamp
- Optimistic trust toggle with loading state and toast notifications
- API routes with auth guards, Zod validation, and proper error handling
- Empty state handling for both no sources and filtered-no-results cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Create sources API routes** - `4d9648e` (fix)
2. **Task 2: Create SourcesTable component and sources page** - `4d9648e` (fix)

**Plan metadata:** `4d9648e` (fix: empty state now shows when filters produce no results)

_Note: All code was already implemented in prior session. Only the empty state fix was needed._

## Files Created/Modified

- `app/api/admin/sources/route.ts` - GET handler for sources list with status/type filtering
- `app/api/admin/sources/[id]/trust/route.ts` - PATCH handler for trust toggle with Zod validation
- `app/components/admin/SourcesTable.tsx` - Expandable table with filters, badges, and trust toggle
- `app/admin/sources/page.tsx` - Client page with data fetching, toast notifications, and trust toggle handler

## Decisions Made

- Trust toggle uses optimistic UI pattern (loading state + refresh) instead of ConfirmDialog for better UX - toggles are non-destructive and benefit from immediate feedback
- Empty state shows contextual message: "No sources have been configured yet" when sources array is empty, "Try adjusting your filters" when filters produce no results

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed empty state not showing when filters produce no results**
- **Found during:** Verification
- **Issue:** Empty state only checked `sources.length === 0`, not `filtered.length === 0`. When filters were applied and no sources matched, the table showed an empty tbody instead of the empty state message.
- **Fix:** Moved empty state check after filtering, added conditional message based on whether sources exist or filters are too restrictive
- **Files modified:** `app/components/admin/SourcesTable.tsx`
- **Verification:** Empty state now shows correctly for both cases
- **Committed in:** `4d9648e`

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Bug fix for empty state behavior. No scope creep.

## Issues Encountered

None - all code was already implemented correctly from prior session.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Sources management page is fully functional
- Admin can view, filter, and toggle trust status for all data sources
- Ready for integration with pipeline management workflows

---
*Phase: 08-admin-operations*
*Completed: 2026-06-17*

## Self-Check: PASSED

- [x] All created files exist
- [x] All commits present in git log
- [x] SourcesTable.tsx empty state fix verified
- [x] All must_haves satisfied
