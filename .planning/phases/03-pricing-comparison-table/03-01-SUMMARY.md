---
phase: 03-pricing-comparison-table
plan: 01
subsystem: ui
tags: [react-table, drizzle, pricing, tailwind, vitest]

# Dependency graph
requires:
  - phase: 02-data-collection-pipeline
    provides: extractions and sources tables with pricing data
provides:
  - PricingTable client component with @tanstack/react-table sorting
  - pricing-utils module (formatPrice, formatContextWindow, sanitizeDisplayName, getConfidenceColor, getModelFamily)
  - Drizzle LEFT JOIN query (extractions + sources) in server component
affects: [03-02, 03-03]

# Tech tracking
tech-stack:
  added: ["@tanstack/react-table 8.21.3"]
  patterns: ["Server component fetches data via Drizzle JOIN, passes to client component via props", "Utility functions in app/lib/ shared by server and client components"]

key-files:
  created:
    - app/lib/pricing-utils.ts
    - app/components/PricingTable.tsx
    - tests/pricing-utils.test.ts
  modified:
    - app/page.tsx

key-decisions:
  - "Used custom Tailwind spans for confidence badges instead of Tremor Badge (Tremor 3.x may conflict with Tailwind 4.x per research Pitfall 5)"
  - "getModelFamily matches more specific prefixes first (claude-3.5 before claude-3) to avoid false matches"

patterns-established:
  - "Server/client component split: server fetches data, client handles interactivity"
  - "Utility functions in app/lib/ for reuse across components"

requirements-completed: [PRIC-01, PRIC-06]

# Metrics
duration: 7min
completed: 2026-06-12
---

# Phase 3 Plan 01: Pricing Comparison Table - Data Layer and Sorting Summary

**@tanstack/react-table-powered interactive pricing table with Drizzle JOIN query (extractions + sources), column sorting, and extracted utility module**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-12T16:22:56Z
- **Completed:** 2026-06-12T16:30:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Extracted 5 utility functions from inline page.tsx into reusable app/lib/pricing-utils.ts module
- Created interactive PricingTable client component with @tanstack/react-table sorting on all 7 columns
- Replaced static HTML table with Drizzle LEFT JOIN query joining extractions + sources for provider names
- Added getModelFamily function mapping 11 model prefixes to family names (GPT-4, Claude 3.5, Gemini, etc.)
- 37 unit tests covering all utility functions including edge cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract utility functions** - `910b82f` (feat) - TDD RED: `a556d21` (test)
2. **Task 2: Create PricingTable component** - `71adaf9` (feat)

## Files Created/Modified
- `app/lib/pricing-utils.ts` - Shared utility functions (formatPrice, formatContextWindow, sanitizeDisplayName, getConfidenceColor, getModelFamily)
- `app/components/PricingTable.tsx` - Client component with @tanstack/react-table sorting, 7 columns, confidence badges
- `tests/pricing-utils.test.ts` - 37 unit tests for all utility functions
- `app/page.tsx` - Server component with Drizzle LEFT JOIN query, renders PricingTable
- `package.json` - Added @tanstack/react-table 8.21.3

## Decisions Made
- Used custom Tailwind spans for confidence badges instead of Tremor Badge (Tremor 3.x may conflict with Tailwind 4.x per research Pitfall 5)
- getModelFamily matches more specific prefixes first (claude-3.5 before claude-3) to avoid false matches
- formatPrice uses up to 4 decimal places for values < $0.01 for precision on cheap models

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed invalid Vitest matcher `toEndWith`**
- **Found during:** Task 1 (RED phase test verification)
- **Issue:** Used `expect(result).toEndWith('...')` which is not a valid Vitest/Chai matcher
- **Fix:** Changed to `expect(result.endsWith('...')).toBe(true)`
- **Files modified:** tests/pricing-utils.test.ts
- **Verification:** All 37 tests pass after fix
- **Committed in:** 910b82f (Task 1 GREEN commit includes the fix)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test syntax fix. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PricingTable component ready for Plans 02 (responsive + last-updated) and 03 (filtering + search)
- Utility module ready for reuse in practical cost calculations
- Build compiles with zero TypeScript errors

## Self-Check: PASSED

- All 3 created files found (pricing-utils.ts, PricingTable.tsx, pricing-utils.test.ts)
- All 3 commits found (a556d21, 910b82f, 71adaf9)

---
*Phase: 03-pricing-comparison-table*
*Completed: 2026-06-12*
