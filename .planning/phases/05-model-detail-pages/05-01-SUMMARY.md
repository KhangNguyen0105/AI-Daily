---
phase: 05-model-detail-pages
plan: 01
subsystem: database
tags: [drizzle, schema, slug, provider-links, typescript]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Drizzle schema with extractions, sources tables
  - phase: 03-pricing-comparison-table
    provides: PricingTable component, pricing-utils module
provides:
  - promotions table in Drizzle schema with promotionTypeEnum
  - generateSlug and resolveSlug utilities for /model/[slug] URL pattern
  - parseSlug helper for slug parsing without DB query
  - PROVIDER_LINKS map and getProviderLinks function
affects: [05-model-detail-pages/02, 05-model-detail-pages/03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Slug generation: lowercase, strip dots, hyphenate non-alphanumeric, append sourceId"
    - "Provider links: static map keyed by normalized provider name with aliases"

key-files:
  created:
    - app/lib/slug.ts
    - app/lib/provider-links.ts
    - tests/slug.test.ts
  modified:
    - src/db/schema.ts

key-decisions:
  - "Dots in model names (e.g., 3.5) are stripped rather than hyphenated to produce cleaner slugs"
  - "parseSlug extracted as separate non-DB function for testability"
  - "Provider links use static map with aliases rather than deriving from sources table"

patterns-established:
  - "Slug format: normalized-name--sourceId (double-dash separator)"
  - "Provider link aliases: map both short and full names (e.g., 'mistral' and 'mistral ai')"

requirements-completed: [MDTL-04, MDTL-05]

# Metrics
duration: 7min
completed: 2026-06-14
---

# Phase 5 Plan 01: Foundation Utilities Summary

**Promotions schema, URL slug generation/resolution, and provider links map for model detail pages**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-14T11:21:47Z
- **Completed:** 2026-06-14T11:28:19Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added `promotions` table to Drizzle schema with `promotionTypeEnum` (free_tier, promotion, beta) and full column set per D-09
- Created slug generation/resolution utilities with deterministic URL-safe slugs using `modelName--sourceId` format
- Built provider links map covering 14 providers with docs, API, and playground URLs

## Task Commits

Each task was committed atomically:

1. **Task 1: Add promotions table to Drizzle schema** - `1ba0289` (feat)
2. **Task 2: Create slug generation and resolution utilities** - `dcfab8c` (test/RED), `63e4de7` (feat/GREEN)
3. **Task 3: Create provider links utility module** - `f325f5f` (feat)

## Files Created/Modified
- `src/db/schema.ts` - Added promotionTypeEnum and promotions table with FK to sources
- `app/lib/slug.ts` - New module: generateSlug, parseSlug, resolveSlug functions
- `app/lib/provider-links.ts` - New module: PROVIDER_LINKS map and getProviderLinks function
- `tests/slug.test.ts` - 19 tests covering slug generation and parsing

## Decisions Made
- Dots in model names (e.g., "3.5") are stripped rather than hyphenated -- produces cleaner slugs like "claude-35-sonnet" instead of "claude-3-5-sonnet"
- Extracted `parseSlug` as a separate non-DB function for unit testability (resolveSlug uses it internally)
- Provider links use a static map with aliases rather than deriving from the sources table -- more reliable and covers playground URLs not in the DB

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed dot handling in generateSlug**
- **Found during:** Task 2 (TDD GREEN phase)
- **Issue:** Plan specified `/[^a-z0-9]+/g` regex which converts dots to hyphens, producing "claude-3-5-sonnet" instead of expected "claude-35-sonnet"
- **Fix:** Added `.replace(/\./g, '')` step before the hyphenation regex to strip dots first
- **Files modified:** app/lib/slug.ts
- **Verification:** All 19 slug tests pass
- **Committed in:** 63e4de7 (GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor regex adjustment. No scope creep.

## Issues Encountered
- `pnpm db:push` failed because PostgreSQL is not available in the development environment. Schema compiles correctly via Next.js build. Database migration will succeed when DB is available.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all modules are fully functional.

## Threat Flags
None - no new security surface beyond what the threat model covers.

## Next Phase Readiness
- `generateSlug` and `resolveSlug` ready for `/model/[slug]` dynamic route (Plan 02)
- `getProviderLinks` ready for provider links section (Plan 02)
- `promotions` schema ready for promotions query (Plan 02)
- `db:push` needs to be run when PostgreSQL is available to create the promotions table

## Self-Check: PASSED

All 5 files verified on disk. All 5 commits verified in git log.

---
*Phase: 05-model-detail-pages*
*Completed: 2026-06-14*
