---
phase: 03-pricing-comparison-table
type: plan
status: complete
wave: 1
depends_on: []
files_modified:
  - app/layout.tsx
  - app/page.tsx
  - app/components/SideNav.tsx
  - app/components/TopBar.tsx
  - app/components/Footer.tsx
  - app/components/ScenarioCards.tsx
  - app/components/DigestCard.tsx
  - app/components/PricingTable.tsx
  - app/components/HomePageClient.tsx
  - app/globals.css
---

# Stitch UI Integration Plan

## Objective
Integrate Stitch-generated UI design into existing Next.js project using selective integration approach.

## Tasks

### Task 1: Design System Extraction
**Files:** `tailwind.config.ts`, `app/globals.css`

1. Extract Tailwind config from Stitch HTML:
   - Colors: background, surface, primary, secondary, error, etc.
   - Typography: Geist, Inter, JetBrains Mono fonts
   - Spacing: unit (4px), gutter (12px), container-padding (16px)
   - Font sizes: display, headline-sm, body-md, mono-data, mono-label, body-sm

2. Update `tailwind.config.ts` with Stitch theme
3. Add Google Fonts to `app/globals.css`
4. Add Material Symbols icons (or use Lucide as alternative)

### Task 2: Layout Components
**Files:** `app/components/SideNav.tsx`, `app/components/TopBar.tsx`, `app/components/Footer.tsx`, `app/layout.tsx`

1. Create `SideNav` component:
   - Fixed left sidebar (240px)
   - AI Daily branding
   - Navigation links
   - API status indicator
   - Responsive: hidden on mobile

2. Create `TopBar` component:
   - Search bar (right-aligned)
   - Last updated timestamp
   - Mobile: shows AI Daily branding

3. Create `Footer` component:
   - Copyright, navigation links

4. Update `app/layout.tsx`:
   - Add SideNav, TopBar, Footer
   - Update main content structure

### Task 3: Hero Section (Scenario Cards)
**Files:** `app/components/ScenarioCards.tsx`, `app/page.tsx`

1. Create `ScenarioCards` component:
   - 4 scenario cards in bento grid
   - Each card shows: scenario name, description, top 2 model costs
   - Wire to existing `COST_SCENARIOS` and `calculateScenarioCosts`
   - Accept `data: PricingRow[]` and `exchangeRate: number` props

2. Update `app/page.tsx`:
   - Import ScenarioCards
   - Pass pricing data and exchange rate

### Task 4: Intelligence Digest
**Files:** `app/components/DigestCard.tsx`, `app/page.tsx`

1. Create `DigestCard` component:
   - News-style card with key changes
   - Mock data for now (Phase 5 will add real data)
   - Accept `digest` prop with title, keyChange, impact, constraint

2. Update `app/page.tsx`:
   - Import DigestCard
   - Pass mock digest data

### Task 5: Pricing Table Styling
**Files:** `app/components/PricingTable.tsx`

1. Apply Stitch styling to existing PricingTable:
   - Update color scheme to match Stitch theme
   - Update typography (mono-data, mono-label)
   - Update spacing (row-height-dense)
   - Update confidence badges styling
   - Keep TanStack Table logic intact

2. Ensure currency toggle styling matches Stitch design

### Task 6: Integration and Testing
**Files:** `app/page.tsx`, `app/components/HomePageClient.tsx`

1. Update `HomePageClient` to use new components:
   - Import ScenarioCards, DigestCard
   - Update layout structure
   - Ensure currency state is shared

2. Run tests: `pnpm vitest run`
3. Run build: `pnpm build`

## Verification
- [x] Design tokens extracted and applied
- [x] Layout components render correctly
- [x] Scenario cards show real data from database
- [x] Digest card wired to `articles` table (falls back to empty state when no articles)
- [x] Pricing table styled with Stitch theme
- [x] Currency toggle works (USD/VND synchronized across components)
- [x] All tests pass (227/227)
- [x] Build succeeds

## Success Criteria
- Landing page matches Stitch design aesthetic
- All existing functionality preserved
- Real data flows through new UI components
- Currency toggle synchronized across components
- Responsive design works on mobile
