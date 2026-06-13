# Phase 04-01 Summary: Cost Scenarios and Calculation Utilities

## Goal
Create cost scenario definitions and cost calculation utilities for practical pricing comparisons.

## Files Changed

### Created
- `app/lib/cost-scenarios.ts` — CostScenario interface and COST_SCENARIOS array with 4 scenarios (long-prompts, leetcode-hard, document-summary, coding-agent)

### Modified
- `app/lib/pricing-utils.ts` — Added PracticalCost interface, calculatePracticalCost function, and calculateScenarioCosts function
- `tests/pricing-utils.test.ts` — Added 13 new tests for calculatePracticalCost and calculateScenarioCosts

## What Was Done

### cost-scenarios.ts
- Exported `CostScenario` interface with id, name, description, inputTokens, outputTokens, icon fields
- Exported `COST_SCENARIOS` array with exactly 4 entries covering common developer use cases

### pricing-utils.ts
- Imported `PricingRow` type from PricingTable component
- Added `PracticalCost` interface with model metadata and cost breakdown fields
- Added `calculatePracticalCost(model, inputTokens, outputTokens)` — returns null for models with missing pricing, otherwise computes per-token costs
- Added `calculateScenarioCosts(models, inputTokens, outputTokens)` — maps, filters nulls, sorts by totalCost ascending

### tests/pricing-utils.test.ts
- Added `calculatePracticalCost` describe block (6 tests): valid pricing, metadata preservation, null input price, null output price, both null, zero prices, exact values
- Added `calculateScenarioCosts` describe block (5 tests): sorting order, null input exclusion, null output exclusion, empty result, metadata preservation

## Verification
- All 79 tests pass (existing 68 + new 11)
- Build compiles successfully with no TypeScript errors
- No existing tests were modified
