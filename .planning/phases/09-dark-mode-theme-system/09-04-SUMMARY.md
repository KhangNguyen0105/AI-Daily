---
phase: 9-dark-mode-theme-system
plan: 04
subsystem: ui
tags: [tailwind, dark-mode, css-variables, theme-tokens, color-conversion, public-pages]

requires:
  - phase: 9-dark-mode-theme-system
    provides: "Theme foundation with CSS tokens, ThemeProvider, ThemeToggle (09-01)"
provides:
  - All 16 remaining public component files converted to theme tokens
  - DigestArticle, TrendsPageClient, PromotionsPageClient, ComparePageClient, AlertsPageClient fully themed
  - Smaller components (BellIcon, CurrencyToggle, PromotionCard, ModelSelector, etc.) fully themed
  - Recharts hex colors in PriceHistoryChart and TrendChart remain unchanged per D-05
affects: [09-06]

tech-stack:
  added: []
  patterns:
    - "Systematic color mapping applied across 16 public component files"
    - "Recharts hex colors preserved unchanged (stroke/fill props)"

key-files:
  created: []
  modified:
    - app/components/DigestArticle.tsx
    - app/components/TrendsPageClient.tsx
    - app/components/AlertsPageClient.tsx
    - app/components/ComparisonCard.tsx
    - app/components/PromotionsList.tsx
    - app/components/PromotionCard.tsx
    - app/components/PromotionsPageClient.tsx
    - app/components/ComparePageClient.tsx
    - app/components/ModelSelector.tsx
    - app/components/BellIcon.tsx
    - app/components/PricingGrid.tsx
    - app/components/PriceHistoryChart.tsx
    - app/components/TrendChart.tsx
    - app/components/CurrencyToggle.tsx
    - app/digest/page.tsx
    - app/components/AlertBanner.tsx

key-decisions:
  - "text-gray-700 mapped to text-text-primary (consistent with 09-03 pattern for body text)"
  - "text-gray-800 mapped to text-text-primary (darker gray treated as primary text)"
  - "hover:text-gray-800 mapped to hover:text-text-primary for cancel buttons"
  - "bg-gray-100 in promotion badges mapped to bg-bg-tertiary (consistent with 09-02 pattern)"
  - "Recharts hex colors (#3b82f6, #ef4444, #16a34a, #dc2626, #2563eb, #f59e0b) left unchanged per D-05"

patterns-established:
  - "Color replacement pattern applied consistently: bg-white -> bg-bg-primary, bg-gray-50 -> bg-bg-secondary, bg-gray-100 -> bg-bg-tertiary"
  - "Text replacement pattern: text-gray-900 -> text-text-primary, text-gray-700 -> text-text-primary, text-gray-600 -> text-text-secondary, text-gray-500 -> text-text-secondary, text-gray-400 -> text-text-tertiary"
  - "Border replacement pattern: border-gray-200 -> border-border-primary, border-gray-300 -> border-border-secondary"
  - "Hover state pattern: hover:text-gray-800 -> hover:text-text-primary, hover:bg-gray-50 -> hover:bg-bg-secondary"

requirements-completed: [UI-02]

duration: 12min
completed: 2026-06-18
status: complete
---

# Plan 09-04: Public Components Color Conversion Summary

**16 remaining public component files converted from hardcoded Tailwind gray/white classes to semantic theme token classes for dual-theme support across digest, trends, promotions, compare, alerts, and utility components**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-18T23:00:00Z
- **Completed:** 2026-06-18T23:12:00Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments
- DigestArticle.tsx: 13 hardcoded color classes replaced — Markdown rendering (paragraphs, lists, headings, blockquotes, code blocks, tables)
- AlertsPageClient.tsx: 12 hardcoded color classes replaced — page heading, alert count, confirmation dialogs, alert cards
- ComparisonCard.tsx: 10 hardcoded color classes replaced — model header, pricing section, context window, practical costs, free tier
- TrendsPageClient.tsx: 8 hardcoded color classes replaced — page heading, empty state, model grid cards
- PromotionsList.tsx: 7 hardcoded color classes replaced — empty state, promotion cards with active/expired states
- PromotionCard.tsx: 7 hardcoded color classes replaced — card background, type badge, description, credits, date range
- PromotionsPageClient.tsx: 5 hardcoded color classes replaced — page heading, filter pills, empty state
- ComparePageClient.tsx: 6 hardcoded color classes replaced — page heading, empty states
- ModelSelector.tsx: 4 hardcoded color classes replaced — input border, dropdown, model options
- BellIcon.tsx: 5 hardcoded color classes replaced — icon states, popup dialog, form inputs
- PricingGrid.tsx: 2 hardcoded color classes replaced — pricing cards
- PriceHistoryChart.tsx: 2 hardcoded color classes replaced — empty states (Recharts hex colors preserved)
- TrendChart.tsx: 3 hardcoded color classes replaced — empty states, chart title (Recharts hex colors preserved)
- CurrencyToggle.tsx: 2 hardcoded color classes replaced — USD/VND toggle buttons
- digest/page.tsx: 6 hardcoded color classes replaced — archive page, article list, timestamps
- AlertBanner.tsx: 1 hardcoded color class replaced — dismiss all button

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert high-occurrence public components (DigestArticle, AlertsPageClient, ComparisonCard, TrendsPageClient)** - `f98059d`, `f971b2b`, `8c40e73`, `6333d63` (feat)
2. **Task 2: Convert medium-occurrence public components (PromotionsList, PromotionCard, PromotionsPageClient, ComparePageClient, ModelSelector, BellIcon)** - `7e373f0`, `5a719c1`, `9437dab`, `17cda9c`, `de0e00a`, `c3a400c` (feat)
3. **Task 3: Convert low-occurrence components and special cases (PricingGrid, PriceHistoryChart, TrendChart, CurrencyToggle, digest/page.tsx, AlertBanner)** - `13e78ab`, `61dcf94`, `01af6f8`, `73bebab`, `9b9c56b`, `7cc06a0` (feat)

## Files Created/Modified
- `app/components/DigestArticle.tsx` - Markdown article rendering with themed paragraphs, lists, blockquotes, code blocks, tables
- `app/components/AlertsPageClient.tsx` - Price alerts management page with themed cards and confirmation dialogs
- `app/components/ComparisonCard.tsx` - Side-by-side model comparison card with themed sections
- `app/components/TrendsPageClient.tsx` - Pricing trends page with themed model grid
- `app/components/PromotionsList.tsx` - Promotions list with themed active/expired states
- `app/components/PromotionCard.tsx` - Individual promotion card with themed badge fallbacks
- `app/components/PromotionsPageClient.tsx` - Promotions page with themed filter pills
- `app/components/ComparePageClient.tsx` - Compare page with themed selectors and empty states
- `app/components/ModelSelector.tsx` - Searchable model dropdown with themed input and options
- `app/components/BellIcon.tsx` - Price alert bell icon with themed popup dialog
- `app/components/PricingGrid.tsx` - Pricing grid cards with themed backgrounds
- `app/components/PriceHistoryChart.tsx` - Price history chart with themed empty states (hex colors preserved)
- `app/components/TrendChart.tsx` - Trend chart with themed title and empty states (hex colors preserved)
- `app/components/CurrencyToggle.tsx` - USD/VND toggle with themed button states
- `app/digest/page.tsx` - Digest archive page with themed article list
- `app/components/AlertBanner.tsx` - Alert banner with themed dismiss button

## Decisions Made
- `text-gray-700` mapped to `text-text-primary` — consistent with 09-03 pattern for body text in Markdown content
- `text-gray-800` mapped to `text-text-primary` — darker gray treated as primary text for hover states
- `hover:text-gray-800` on cancel buttons mapped to `hover:text-text-primary` — maintains visual hierarchy
- `bg-gray-100` in promotion badge fallbacks mapped to `bg-bg-tertiary` — consistent with 09-02 pattern for inactive surfaces
- Recharts hex colors (`#3b82f6`, `#ef4444`, `#16a34a`, `#dc2626`, `#2563eb`, `#f59e0b`) left unchanged per plan decision D-05

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 16 remaining public component files now use theme tokens — render correctly in both light and dark themes
- All public-facing pages (Digest, Trends, Promotions, Compare, Alerts) fully themed
- All utility components (BellIcon, CurrencyToggle, ModelSelector, AlertBanner) fully themed
- Recharts charts display with correct colors in both themes
- Remaining plan (09-06) can proceed with final verification and polish

---
*Phase: 9-dark-mode-theme-system*
*Completed: 2026-06-18*
