---
phase: 9-dark-mode-theme-system
plan: 02
subsystem: ui
tags: [tailwind, dark-mode, css-variables, theme-tokens, color-conversion]

requires:
  - phase: 9-dark-mode-theme-system
    provides: "Theme foundation with CSS tokens, ThemeProvider, ThemeToggle (09-01)"
provides:
  - HomePageClient fully converted to theme tokens (6 class replacements)
  - CostCalculator fully converted to theme tokens (12 class replacements)
  - ModelDetailClient fully converted to theme tokens (7 class replacements)
affects: [09-03, 09-04, 09-05, 09-06]

tech-stack:
  added: []
  patterns:
    - "Systematic color mapping: bg-white -> bg-bg-primary, text-gray-900 -> text-text-primary, border-gray-200 -> border-border-primary"
    - "Semantic token usage: text-text-secondary for labels, text-text-tertiary for muted text, bg-bg-tertiary for inactive surfaces"

key-files:
  created: []
  modified:
    - app/components/HomePageClient.tsx
    - app/components/CostCalculator.tsx
    - app/components/ModelDetailClient.tsx

key-decisions:
  - "bg-gray-500 (confidence dot fallback) mapped to bg-text-secondary (uses text-secondary color as neutral dot)"
  - "hover:text-blue-800 kept as hover:text-accent-blue — accent colors unchanged across themes per D-04"
  - "All text-gray-500 labels (specifications, descriptions, metadata) mapped uniformly to text-text-secondary"

patterns-established:
  - "Color replacement pattern: bg-white -> bg-bg-primary, bg-gray-50 -> bg-bg-secondary, bg-gray-100 -> bg-bg-tertiary"
  - "Text replacement pattern: text-gray-900 -> text-text-primary, text-gray-500 -> text-text-secondary, text-gray-400 -> text-text-tertiary"
  - "Border replacement pattern: border-gray-200 -> border-border-primary"

requirements-completed: [UI-02]

duration: 5min
completed: 2026-06-18
status: complete
---

# Plan 09-02: Core Page Color Conversion Summary

**HomePageClient, CostCalculator, and ModelDetailClient converted from hardcoded Tailwind gray/white classes to semantic theme token classes for dual-theme support**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-18T15:10:00Z
- **Completed:** 2026-06-18T15:15:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- HomePageClient: 6 hardcoded color classes replaced with theme tokens (headings, borders, backgrounds)
- CostCalculator: 12 hardcoded color classes replaced — scenario tabs, empty state, model cards, rank numbers, price values, provider names, and confidence dot fallback
- ModelDetailClient: 7 hardcoded color classes replaced — back link, provider badge, collected timestamp, 3 specification labels, and promotions placeholder
- All 3 files verified with grep: 0 remaining hardcoded bg-white, text-gray-*, border-gray-* classes

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert HomePageClient.tsx** - `c637d51` (feat)
2. **Task 2: Convert CostCalculator.tsx** - `554b14d` (feat)
3. **Task 3: Convert ModelDetailClient.tsx** - `374748e` (feat)

## Files Created/Modified
- `app/components/HomePageClient.tsx` - Homepage layout: 2 headings, 2 borders, 1 background, 1 secondary text converted
- `app/components/CostCalculator.tsx` - Cost calculator: scenario tabs, empty state, model list cards, rank indicators, price values, provider names converted
- `app/components/ModelDetailClient.tsx` - Model detail: back link, provider badge, collected label, 3 spec labels, promotions placeholder converted

## Decisions Made
- `bg-gray-500` (confidence dot fallback for unknown confidence) mapped to `bg-text-secondary` — uses the text-secondary color as a neutral gray dot since no dedicated "gray dot" token exists
- `hover:text-blue-800` on back link converted to `hover:text-accent-blue` — accent colors are theme-invariant per plan decision D-04, so this is safe
- All `text-gray-500` label instances (7 total across files) mapped uniformly to `text-text-secondary` for consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 3 core page components now use theme tokens — render correctly in both light and dark themes
- Remaining plans (09-03 through 09-06) can follow the same color mapping pattern established here
- Next: convert remaining public pages (PricingTable internals, digest pages, trends, promotions, compare, alerts) and admin pages

---
*Phase: 9-dark-mode-theme-system*
*Completed: 2026-06-18*
