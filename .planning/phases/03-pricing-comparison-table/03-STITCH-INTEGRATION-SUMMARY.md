---
phase: 03-pricing-comparison-table
type: summary
status: complete
last_updated: 2026-06-14
---

# Stitch UI Integration Summary

## Overview
Successfully integrated Stitch-generated UI design into the existing Next.js project using selective integration approach (Option B). All components wired to real database data via Drizzle ORM.

## Changes Made

### 1. Design System Extraction
**File:** `app/globals.css`

- Added Stitch dark theme color palette (background, surface, primary, secondary, error, etc.)
- Added typography system (Geist, Inter, JetBrains Mono fonts)
- Added spacing system (unit, gutter, container-padding)
- Added row height variables (standard, dense)
- Added Material Symbols Outlined icons

### 2. Layout Components Created

#### SideNav (`app/components/SideNav.tsx`)
- Fixed left sidebar (240px) with navigation
- AI Daily branding with "Automated Intelligence" subtitle
- Navigation links: Intelligence Digest, Model Pricing, Cost Metrics, Source Data
- API status indicator (green dot)
- Responsive: hidden on mobile
- Active state styling for current page

#### TopBar (`app/components/TopBar.tsx`)
- Search bar (right-aligned) with Material Symbols search icon
- Last updated timestamp
- Mobile: shows AI Daily branding

#### Footer (`app/components/Footer.tsx`)
- Copyright notice
- Navigation links: Source Data, API Docs, Privacy Policy, Platform Status

### 3. Hero Section (Scenario Cards)
**File:** `app/components/ScenarioCards.tsx`

- 4 scenario cards in bento grid layout
- Each card shows: scenario letter (A-D), name, description, top 2 model costs
- Wired to existing `COST_SCENARIOS` and `calculateScenarioCosts`
- Accepts `data: PricingRow[]`, `currency`, `exchangeRate` props
- Material Symbols icons for each scenario type
- Hover effects with border color transition

### 4. Intelligence Digest
**File:** `app/components/DigestCard.tsx`

- News-style card with left blue accent bar
- Shows: title, description, and list of digest items
- Each item has: icon, label, and text (supports HTML)
- **Wired to `articles` table** — `page.tsx` fetches latest article via Drizzle query
- Falls back to empty state when no articles exist in DB
- `HomePageClient` passes `latestArticle` prop to `DigestCard`

### 5. Pricing Table Styling
**File:** `app/components/PricingTable.tsx`

- Updated color scheme to match Stitch theme:
  - Background: `bg-background`, `bg-surface`, `bg-surface-container`
  - Text: `text-on-surface`, `text-on-surface-variant`
  - Borders: `border-outline-variant`
- Updated typography:
  - Headers: `font-mono-label text-mono-label`
  - Data cells: `font-mono-data text-mono-data`
- Updated row heights: `h-row-height-dense`
- Updated confidence badges:
  - Verified: green (secondary)
  - Likely: blue (primary)
  - Low-Conf: red (error)
- Updated source column: Material Symbols link icon
- Updated table structure: `min-w-[800px]` for horizontal scroll

### 6. Landing Page Integration
**File:** `app/components/HomePageClient.tsx`

- Integrated all new components: SideNav, TopBar, Footer, ScenarioCards, DigestCard
- Maintained currency state synchronization between PricingTable and ScenarioCards
- Added toolbar with "Raw API Pricing" title and "Live" badge
- Added currency toggle in toolbar (USD/VND)
- Layout: SideNav (left) + Main content (right) with scrollable canvas

### 7. Layout Updates
**File:** `app/layout.tsx`

- Added dark mode class: `className="dark"`
- Updated body classes: `bg-background text-on-background font-body text-body-md`
- Updated metadata: "AI Daily - Real-world Model Costs"

## Files Modified
- `app/globals.css` — Design system
- `app/layout.tsx` — Root layout
- `app/page.tsx` — Server component
- `app/components/SideNav.tsx` — New
- `app/components/TopBar.tsx` — New
- `app/components/Footer.tsx` — New
- `app/components/ScenarioCards.tsx` — New
- `app/components/DigestCard.tsx` — New
- `app/components/PricingTable.tsx` — Updated styling
- `app/components/HomePageClient.tsx` — Updated integration

## Test Results
- `tests/landing.test.tsx` — passed ✅
- `tests/pricing-utils.test.ts` — passed ✅
- `tests/cost-calculator.test.tsx` — passed ✅
- All 227 tests across 16 files — passed ✅
- `pnpm build` — Successful ✅

## Session 2 Updates (2026-06-14)

### Functional Fixes
1. **TopBar search wired to PricingTable** — search input is now a controlled component
   driving PricingTable's `globalFilter` via lifted state in `HomePageClient`
2. **Provider filter dropdown added** — "All Providers" dropdown in toolbar per Stitch design,
   wired to PricingTable's provider column filter via lifted state
3. **State lifting** — `searchQuery` and `providerFilter` state moved from PricingTable
   internals to `HomePageClient`, enabling cross-component communication

### Files Modified (Session 2)
- `app/components/HomePageClient.tsx` — Added `searchQuery`, `providerFilter` state + provider dropdown UI
- `app/components/TopBar.tsx` — Accepts `searchQuery`/`onSearchChange` props, controlled input
- `app/components/PricingTable.tsx` — Accepts external `searchQuery`/`providerFilter` props

### Re-verification
- 227/227 tests pass ✅
- Build succeeds ✅
- TypeScript clean ✅

## Verification Checklist
- [x] Design tokens extracted and applied
- [x] Layout components render correctly
- [x] Scenario cards show real data from database
- [x] Digest card wired to `articles` table (falls back to empty state)
- [x] Pricing table styled with Stitch theme
- [x] Currency toggle works (USD/VND synchronized)
- [x] All tests pass (227/227)
- [x] Build succeeds
- [x] Footer uses dynamic year

## Notes
- Material Symbols icons load from Google Fonts CDN via `<link>` tags (CSS `@import` doesn't work with Tailwind v4 PostCSS)
- Tailwind v4 `rounded` class uses 0.25rem by default — must use `rounded-DEFAULT` for Stitch's 0.125rem
- Dark theme only (light theme can be added later)
- DigestCard shows empty state until pipeline generates articles

## Data Flow
```
page.tsx (Server Component)
  ├─ Drizzle: extractions JOIN sources → PricingRow[]
  ├─ Drizzle: articles (latest) → { title, content }
  ├─ Drizzle: exchange_rates → number
  └─ HomePageClient (Client Component)
       ├─ ScenarioCards (uses PricingRow[] + currency)
       ├─ DigestCard (uses latestArticle or fallback)
       ├─ PricingTable (uses PricingRow[] + currency)
       └─ currency state synced across all components
```

## Next Steps
- Phase 4: Practical Cost Calculator (full dedicated page)
- Phase 5: Pipeline generates structured digest items (icon/label/text) for articles
- Phase 6: Add light theme support (Stitch light variants available in `stitch_ai_daily_pricing_hub/`)
- Phase 7: Add responsive mobile navigation
- Cost Metrics, Intelligence Digest, and Source Data pages (Stitch designs ready for Phases 4/6/7/8)
