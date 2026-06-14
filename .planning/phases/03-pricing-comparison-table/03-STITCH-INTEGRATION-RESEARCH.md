---
phase: 03-pricing-comparison-table
type: research
status: complete
---

# Stitch UI Integration Research

## Overview

Analyzed Stitch-generated UI for integration into existing Next.js project. Stitch output is pure HTML with Tailwind CSS, not React components.

## Stitch Output Structure

### Directories Analyzed
- `ai_daily_landing_page/` — Dark theme landing page
- `ai_daily_landing_page_light/` — Light theme variant
- `cost_metrics_dark/` — Cost metrics page (dark)
- `cost_metrics_light/` — Cost metrics page (light)
- `intelligence_digest_dark/` — Intelligence digest (dark)
- `intelligence_digest_light/` — Intelligence digest (light)
- `source_data_dark/` — Source data page (dark)
- `source_data_light/` — Source data page (light)
- `obsidian_technical/` — Technical documentation style
- `obsidian_technical_light/` — Light variant

### Key Components Identified

#### 1. Side Navigation Bar
- Fixed left sidebar (240px)
- AI Daily branding
- Navigation links: Intelligence Digest, Model Pricing, Cost Metrics, Source Data
- API status indicator
- Responsive: hidden on mobile

#### 2. Top App Bar
- Search bar (right-aligned)
- Last updated timestamp
- Mobile: shows AI Daily branding

#### 3. Hero Section (Scenario Cards)
- 4 scenario cards in bento grid
- Each card shows: scenario name, description, top 2 model costs
- Scenarios match our COST_SCENARIOS:
  - 10 Long Prompts
  - 100 LeetCode Hards
  - 100-Page Document
  - 1 Agent Session

#### 4. Daily Intelligence Digest
- News-style card with key changes
- Shows: key change, impact, constraints
- Example: Anthropic batch pricing update

#### 5. Core Pricing Table
- Toolbar with: title, "Live" badge, provider filter, currency toggle
- Dense data table with columns: Model & Provider, Input (/1M), Output (/1M), Context (K), Confidence, Source
- Confidence badges: Verified (green), Likely (blue), Low-Conf (red)
- Source links with icons

#### 6. Footer
- Copyright, navigation links

## Design System Analysis

### Color Palette (Dark Theme)
- Background: `#0c1324` (deep navy)
- Surface: `#191f31` (dark blue-gray)
- Primary: `#8ed5ff` (light blue)
- Secondary: `#4edea3` (green)
- Error: `#ffb4ab` (light red)
- Text: `#dce1fb` (light gray)

### Typography
- Display: Geist (36px, bold)
- Headline: Geist (20px, semibold)
- Body: Inter (14px)
- Mono Data: JetBrains Mono (13px)
- Mono Label: JetBrains Mono (12px, medium)

### Spacing System
- Unit: 4px
- Gutter: 12px
- Container padding: 16px
- Row height (standard): 40px
- Row height (dense): 32px

## Integration Strategy

### Option A: Full Redesign
- Replace entire UI with Stitch design
- Create new component library
- Significant effort, high impact

### Option B: Selective Integration
- Extract specific components (Hero, Digest, Table styling)
- Merge with existing components
- Moderate effort, preserves existing work

### Option C: Design System Only
- Extract Tailwind config and design tokens
- Apply to existing components
- Low effort, consistent styling

## Recommendation

**Option B: Selective Integration**

Reasons:
1. Existing PricingTable and CostCalculator are functional and tested
2. Stitch design is visually superior but needs data wiring
3. Can extract: design tokens, hero layout, digest component, table styling
4. Preserves: backend logic, data fetching, currency toggle, test coverage

## Implementation Plan

### Phase 1: Design System Extraction
- Extract Tailwind config (colors, typography, spacing)
- Create `app/styles/stitch-theme.css` or update `tailwind.config.ts`
- Add Google Fonts (Geist, Inter, JetBrains Mono)
- Add Material Symbols icons

### Phase 2: Layout Components
- Create `SideNav` component
- Create `TopBar` component
- Create `Footer` component
- Update `app/layout.tsx` with new structure

### Phase 3: Hero Section
- Create `ScenarioCards` component
- Wire to existing `COST_SCENARIOS` and `calculateScenarioCosts`
- Replace existing CostCalculator with Stitch-style cards

### Phase 4: Intelligence Digest
- Create `DigestCard` component
- Mock data for now (Phase 5 will add real data)
- Add to landing page

### Phase 5: Pricing Table Styling
- Apply Stitch styling to existing PricingTable
- Keep TanStack Table logic
- Update color scheme to match Stitch theme

### Phase 6: Currency Toggle
- Already implemented in Phase 3
- Ensure styling matches Stitch design

## Risks

1. **Dark theme only**: Stitch output is dark theme. Need light theme support.
2. **Material Symbols**: External dependency for icons. Could use Lucide instead.
3. **Responsive design**: Need to verify mobile behavior.
4. **Test coverage**: Existing tests may break with styling changes.

## Next Steps

1. Get user approval on integration strategy
2. Create detailed implementation plan
3. Execute in waves (design system first, then components)
