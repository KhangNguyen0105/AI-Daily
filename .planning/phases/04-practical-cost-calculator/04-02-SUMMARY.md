# 04-02 Summary: CostCalculator Component

## What was done

### Created files
- `app/components/CostCalculator.tsx` — Interactive client component with scenario tabs and ranked model list
- `tests/cost-calculator.test.tsx` — 13 component tests covering rendering, interaction, ranking, filtering, and currency formatting

### Modified files
- `vitest.config.ts` — Added `@/` path alias resolution so vitest can resolve Next.js-style imports
- `package.json` — Added dev dependencies: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`

### Component features
- Scenario selector: horizontal row of 4 tab buttons from `COST_SCENARIOS`, first selected by default
- Scenario description and token count display below buttons
- Ranked model list: models sorted cheapest first by total cost
- Each row shows: rank number, model name, provider, confidence badge, total cost (font-bold), input/output cost breakdown
- Rank #1 highlighted with green left border and green-tinted background
- Empty state message when no models have valid pricing
- Currency and exchangeRate are props (not internal state) for parent synchronization
- `useMemo` for cost calculations to avoid recomputation on unrelated re-renders

### Test coverage (13 tests)
- 4 scenario buttons render with correct names
- First scenario selected by default
- Clicking scenario updates selection
- Models ranked cheapest first
- Cheapest model has green highlight
- Other models lack green highlight
- Null-pricing models excluded
- Cost breakdown displayed per model
- Empty state for all-null pricing
- Empty state for empty data
- USD currency formatting
- VND currency formatting

## Verification results
- `pnpm vitest run tests/cost-calculator.test.tsx` — 13/13 passed
- `pnpm vitest run` — 226/226 passed (no regressions)
- `pnpm build` — TypeScript compilation and Next.js build successful

## Requirements covered
- COST-05: Side-by-side practical cost comparison across models
- COST-06: Input/output token cost breakdown per model
