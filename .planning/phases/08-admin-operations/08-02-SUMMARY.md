---
phase: 08-admin-operations
plan: 02
subsystem: ui
tags: [nextjs, react, tailwind, drizzle, next-auth, admin-dashboard]

# Dependency graph
requires:
  - phase: 08-admin-operations/01
    provides: SessionProviderWrapper, NextAuth config, admin middleware
  - phase: 01-foundation
    provides: Database schema (pipelineRuns, extractions, articles), Drizzle db instance
provides:
  - Admin layout shell with sidebar navigation and header bar
  - AdminHeader component with hamburger toggle and logout
  - AdminSidebar component with 4 nav links and mobile collapse
  - SummaryCard reusable stat card component
  - Overview dashboard page with 3 summary cards and quick action links
affects: [08-03, 08-04, 08-05, 08-06, 08-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client Shell Layout (Pattern 14): SessionProvider + AdminHeader + AdminSidebar + content area"
    - "Server Component Page (Pattern 7): async function with try/catch fallback for DB queries"
    - "Sidebar Active State: bg-blue-50 text-blue-600 font-semibold for active link"
    - "Mobile Sidebar Collapse: md:hidden overlay + translate-x-full transform"

key-files:
  created:
    - app/components/admin/AdminHeader.tsx
    - app/components/admin/AdminSidebar.tsx
    - app/components/admin/SummaryCard.tsx
  modified:
    - app/admin/layout.tsx
    - app/admin/page.tsx

key-decisions:
  - "Layout uses client component ('use client') for sidebar toggle state management"
  - "Overview page uses force-dynamic to ensure fresh DB data on each request"
  - "SummaryCard is a server component (no 'use client') since it has no interactivity"
  - "Active sidebar detection: exact match for /admin, prefix match for nested routes"

patterns-established:
  - "Admin Layout Shell: SessionProviderWrapper > AdminHeader + AdminSidebar + main content area"
  - "Sidebar Navigation Pattern: fixed sidebar with mobile overlay collapse using CSS transforms"
  - "Summary Card Pattern: reusable stat card with value, label, and optional status dot"
  - "Dashboard Query Pattern: try/catch per query with fallback to 0/null for resilience"

requirements-completed: [ADMN-08]

# Metrics
duration: 5min
completed: 2026-06-17
---

# Phase 8 Plan 02: Admin Layout & Dashboard Summary

**Admin layout shell with collapsible sidebar navigation, fixed header with logout, and overview dashboard showing pipeline health via 3 summary cards and quick action links**

## Performance

- **Duration:** 5 min (verification of existing implementation)
- **Started:** 2026-06-17T00:00:00Z
- **Completed:** 2026-06-17T00:05:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Admin layout with sidebar navigation (Overview, Articles, Pipeline, Sources) and fixed header bar
- Mobile-responsive sidebar with hamburger toggle and overlay collapse behavior
- Overview dashboard page querying pipelineRuns, extractions, and articles tables with try/catch resilience
- 3 SummaryCards showing last pipeline run status, total models tracked, and total articles published
- Quick action links to Articles, Pipeline, and Sources admin sub-pages
- Logout button calling signOut() with callbackUrl redirect to /admin/login

## Task Commits

Both tasks verified against existing implementation (code was implemented in a prior session):

1. **Task 1: Create AdminHeader, AdminSidebar, and SummaryCard components** - verified (existing)
2. **Task 2: Create admin layout and overview page** - verified (existing)

## Files Created/Modified
- `app/components/admin/AdminHeader.tsx` - Fixed top header bar with hamburger toggle (md:hidden), "Admin" label, and Logout button calling signOut({ callbackUrl: "/admin/login" })
- `app/components/admin/AdminSidebar.tsx` - Fixed sidebar with 4 nav links (Overview, Articles, Pipeline, Sources), active state highlighting (bg-blue-50 text-blue-600), mobile overlay collapse with CSS transform
- `app/components/admin/SummaryCard.tsx` - Server component stat card with value (text-2xl font-bold), label (text-sm text-gray-500), and optional status dot (green/red/gray)
- `app/admin/layout.tsx` - Client shell layout: SessionProviderWrapper > AdminHeader + AdminSidebar + main content area with ml-0 md:ml-60 pt-12 offset
- `app/admin/page.tsx` - Server component overview page with 3 Drizzle queries (pipelineRuns, distinct model count, published article count), 3 SummaryCards in grid, and 3 quick action links

## Decisions Made
- Layout uses `'use client'` directive because sidebar toggle requires useState
- Overview page uses `export const dynamic = 'force-dynamic'` to ensure fresh database data
- Each database query wrapped in individual try/catch blocks for resilience (database may not be available during build)
- SummaryCard is a pure server component with no interactivity
- Active sidebar link detection: exact match for `/admin`, `startsWith` for nested routes

## Deviations from Plan

None - plan executed exactly as written. All must_haves verified against existing implementation.

## Issues Encountered
None - verification confirmed all components match plan specifications.

## Known Stubs
None - all summary cards wire to real database queries with proper fallback values.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag:mitigated | app/admin/page.tsx | Summary data (pipeline status, model count, article count) is admin-only, protected by middleware from Plan 08-01 |
| threat_flag:mitigated | app/components/admin/AdminHeader.tsx | signOut() invalidates JWT session server-side with callbackUrl redirect to login |

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Admin layout shell complete, ready for sub-pages (Articles, Pipeline, Sources)
- SessionProvider wrapping ensures all child pages have access to auth session
- Sidebar navigation ready for active state on new sub-pages
- SummaryCard component reusable across admin dashboard

---
*Phase: 08-admin-operations*
*Completed: 2026-06-17*
