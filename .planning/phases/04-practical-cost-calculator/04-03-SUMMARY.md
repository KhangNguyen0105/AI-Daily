# 04-03 Summary: Landing Page Integration with Shared Currency State

## What was done

### Created files
- `app/components/HomePageClient.tsx` — Client wrapper component that owns shared currency state and renders both PricingTable and CostCalculator

### Modified files
- `app/components/PricingTable.tsx` — Refactored to accept optional `currency` and `onCurrencyChange` props; removed internal currency state
- `app/page.tsx` — Updated to use HomePageClient wrapper instead of direct PricingTable rendering

### Architecture changes

**Before (04-02):**
- PricingTable owned its own currency state internally
- CostCalculator received currency as a prop but was not rendered on the page
- page.tsx rendered PricingTable directly (server component)

**After (04-03):**
- HomePageClient (client component) owns currency state via `useState`
- PricingTable receives `currency` and `onCurrencyChange` as optional props (backward-compatible)
- CostCalculator receives `currency` from the same source
- Currency toggle in PricingTable updates both components simultaneously
- page.tsx remains a server component: fetches data, renders branding (h1, last-updated), delegates to HomePageClient

### PricingTable backward compatibility
- `currency` prop is optional, defaults to `'usd'` via `effectiveCurrency = currency ?? 'usd'`
- `onCurrencyChange` prop is optional, toggle buttons use `onCurrencyChange?.('usd')` / `onCurrencyChange?.('vnd')`
- When both props are omitted, PricingTable behaves exactly as before (self-contained with default USD)

### HomePageClient features
- Section header: "What Does It Actually Cost?"
- Descriptive text explaining that per-token pricing is abstract and scenarios show real-world costs
- Renders PricingTable with synchronized currency props
- Renders CostCalculator below PricingTable with same currency state
- Server-side data fetching stays in page.tsx (per D-01 server/client split)

## Verification results
- `pnpm vitest run` — 226/226 passed (no regressions)
- `pnpm build` — TypeScript compilation and Next.js build successful

## Requirements covered
- COST-01: Currency toggle in PricingTable also updates CostCalculator display
- COST-05: Side-by-side practical cost comparison uses same currency as pricing table
