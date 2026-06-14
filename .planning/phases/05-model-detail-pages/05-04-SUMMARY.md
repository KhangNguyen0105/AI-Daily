---
phase: 05-model-detail-pages
plan: 04
subsystem: ui
tags: [next-link, pricing-table, slug, client-navigation, tanstack-table]

# Dependency graph
requires:
  - phase: 05-model-detail-pages/01
    provides: generateSlug and parseSlug utilities
  - phase: 05-model-detail-pages/02
    provides: /model/[slug] dynamic route
  - phase: 05-model-detail-pages/03
    provides: Client components (ModelDetailClient, PricingGrid, etc.)
provides:
  - Clickable model name links in PricingTable navigating to /model/[slug]
  - sourceId field on PricingRow interface for slug generation
  - slug-utils.ts with pure slug functions safe for client components
affects: [05-model-detail-pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-safe slug utilities separated from DB-dependent slug module"
    - "next/link for client-side navigation in table cells"

key-files:
  created:
    - app/lib/slug-utils.ts
  modified:
    - app/components/PricingTable.tsx
    - app/page.tsx
    - app/lib/slug.ts
    - tests/cost-calculator.test.tsx
    - tests/pricing-utils.test.ts
    - tests/provider-metadata.test.ts

key-decisions:
  - "Extracted pure slug functions to slug-utils.ts to avoid bundling pg/dns/fs in client components"
  - "sourceId added as required field to PricingRow (not optional) for type safety"

patterns-established:
  - "Import pure utilities from slug-utils.ts in client components, import resolveSlug from slug.ts in server components"

requirements-completed: [MDTL-06]

# Metrics
duration: 8min
completed: 2026-06-14
---

# Phase 5 Plan 04: Navigation Integration Summary

**Clickable model name links in PricingTable using next/link with slug-based URL routing**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-14T11:47:23Z
- **Completed:** 2026-06-14T11:55:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added `sourceId` to PricingRow interface and updated Drizzle select query to include it
- Made model names in PricingTable clickable `<Link>` elements navigating to `/model/[slug]`
- Extracted pure slug functions to `slug-utils.ts` to prevent client bundle contamination from database imports

## Task Commits

Each task was committed atomically:

1. **Task 1: Add sourceId to PricingRow and update server query** - `79a9ed1` (feat)
2. **Task 2: Make model names clickable links in PricingTable** - `ded0e59` (feat)

## Files Created/Modified
- `app/lib/slug-utils.ts` - New: Pure slug functions (generateSlug, parseSlug) with no DB dependency, safe for client components
- `app/components/PricingTable.tsx` - Added Link import, generateSlug import, changed modelName cell from span to Link
- `app/page.tsx` - Added `sourceId: extractions.sourceId` to Drizzle select query
- `app/lib/slug.ts` - Refactored to re-export from slug-utils.ts, keeping resolveSlug with DB dependency
- `tests/cost-calculator.test.tsx` - Added sourceId to all PricingRow mock objects
- `tests/pricing-utils.test.ts` - Added sourceId to all PricingRow mock objects
- `tests/provider-metadata.test.ts` - Added sourceId to all PricingRow mock objects

## Decisions Made
- Extracted pure slug functions to `slug-utils.ts` because importing `generateSlug` from `slug.ts` in a `'use client'` component pulled the `pg` database driver into the client bundle (Turbopack module-not-found errors for `dns`, `fs` Node.js modules)
- Made `sourceId` a required (non-optional) field on PricingRow for type safety -- all test mocks updated accordingly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extracted slug-utils.ts to fix client bundle contamination**
- **Found during:** Task 2 (Make model names clickable links)
- **Issue:** Importing `generateSlug` from `@/app/lib/slug` in PricingTable.tsx (a `'use client'` component) caused Turbopack to bundle the entire `slug.ts` module including its `import { db } from '@/src/db/index'`. The `pg` driver requires Node.js-only modules (`dns`, `fs`) that are unavailable in the browser.
- **Fix:** Created `app/lib/slug-utils.ts` with pure functions (`generateSlug`, `parseSlug`) that have no database dependency. Updated `slug.ts` to re-export from `slug-utils.ts`. Updated PricingTable.tsx to import from `slug-utils.ts` directly.
- **Files modified:** app/lib/slug-utils.ts (new), app/lib/slug.ts, app/components/PricingTable.tsx
- **Verification:** Build succeeds, all 266 tests pass
- **Committed in:** ded0e59 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Updated test mocks with sourceId field**
- **Found during:** Task 1 (Add sourceId to PricingRow)
- **Issue:** Adding `sourceId: number` as a required field to PricingRow interface meant all test files creating PricingRow objects would fail TypeScript compilation without the new field
- **Fix:** Added `sourceId` to all PricingRow mock objects in 3 test files (cost-calculator.test.tsx, pricing-utils.test.ts, provider-metadata.test.ts)
- **Files modified:** tests/cost-calculator.test.tsx, tests/pricing-utils.test.ts, tests/provider-metadata.test.ts
- **Verification:** All 266 tests pass
- **Committed in:** 79a9ed1 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both deviations were necessary for correctness. The slug-utils extraction was required to make the build succeed. The test mock updates were required for TypeScript compilation. No scope creep.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all functionality is fully implemented.

## Threat Flags
None - slug generation uses `generateSlug` which normalizes input to alphanumeric+hyphens; React auto-escapes JSX content.

## Next Phase Readiness
- Model names in PricingTable are now clickable links to `/model/[slug]`
- All 4 plans in Phase 5 are now complete
- Phase 5 is ready for verification and milestone merge

## Self-Check: PASSED

All 8 files verified on disk. Both commits verified in git log.

---
*Phase: 05-model-detail-pages*
*Completed: 2026-06-14*
