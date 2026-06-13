# Phase 4: Practical Cost Calculator - Research

**Researched:** 2026-06-13
**Domain:** Practical cost visualization with real-world usage scenarios
**Confidence:** HIGH

## Summary

Phase 4 builds on the existing pricing table (Phase 3) to show users what AI models actually cost in real-world usage. Instead of abstract per-token pricing, users see concrete examples like "10 long prompts costs $0.30" or "1 coding-agent session costs $2.50." The phase adds four cost scenarios with side-by-side comparison across models, ranked cheapest to most expensive.

The existing `practicalCosts` table in the database schema already has the right structure: `extractionId`, `scenarioName`, `inputTokens`, `outputTokens`, and `estimatedCost`. The key work is (1) defining realistic token counts for each scenario, (2) building calculation utilities that derive costs from the existing `extractions` table pricing, and (3) creating a new UI component that displays the scenarios with input/output breakdown and side-by-side comparison.

**Primary recommendation:** Build a `CostCalculator` client component that fetches pricing data, calculates practical costs for four predefined scenarios, and renders a comparison view with scenario cards and a ranked model list. Use the existing `extractions` table as the single source of truth for pricing — no need to pre-compute and store costs in `practicalCosts` (that table can be used for caching later if needed).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Cost calculation logic | Browser / Client | — | Pure math on pricing data; no DB writes needed |
| Scenario token definitions | Shared constants | — | Defined once in a config file, used by both calc and UI |
| Pricing data fetching | Next.js Server Component (ISR) | — | Same pattern as Phase 3 — server fetches, passes to client |
| Comparison UI rendering | Browser / Client | — | Interactive scenario selection, model ranking, sorting |
| Currency toggle integration | Browser / Client | — | Reuse existing USD/VND toggle from PricingTable |
| Missing data handling | Browser / Client | — | Graceful degradation when inputPricePer1m or outputPricePer1m is null |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | 8.21.3 | Comparison table with sorting | Already installed. Used for ranked model comparison view. |
| Tailwind CSS | 4.3.0 | Styling | Already installed. Utility-first for rapid UI iteration. |
| date-fns | 4.4.0 | Date formatting | Already installed. For "last updated" display. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | — | Phase 4 uses only existing dependencies |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side calculation | Pre-computed DB storage (practicalCosts table) | Client-side is simpler for v1; DB storage enables caching and historical tracking later |
| New page/route | Section on existing landing page | Section on landing page keeps the UX cohesive; separate page adds navigation complexity |

**Installation:**
```bash
# No new packages needed — all dependencies already installed
```

**Version verification:**
- @tanstack/react-table: 8.21.3 [VERIFIED: npm registry] (already installed)
- Tailwind CSS: 4.3.0 [VERIFIED: npm registry] (already installed)
- date-fns: 4.4.0 [VERIFIED: npm registry] (already installed)

## Package Legitimacy Audit

No new packages required for this phase. All dependencies are already installed and verified from Phase 3.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| (none new) | — | — | — | — | — | — |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
User Browser
    |
    v
Next.js Server Component (ISR, revalidate=60s)
    |
    v
PostgreSQL (extractions + sources tables)
    |
    v
Server Component fetches: extractions JOIN sources
    |
    v
Passes pricing data as props to Client Component
    |
    v
CostCalculator Client Component
    |
    +-- Scenario Definitions (constant)
    |   +-- "10 Long Prompts"       → 10K input, 20K output
    |   +-- "100 LeetCode Hard"     → 50K input, 150K output
    |   +-- "100-Page Document"     → 65K input, 5K output
    |   +-- "1 Coding-Agent Session" → 200K input, 50K output
    |
    +-- Cost Calculation Engine
    |   +-- For each model × scenario:
    |   |   inputCost = (inputTokens / 1_000_000) × inputPricePer1m
    |   |   outputCost = (outputTokens / 1_000_000) × outputPricePer1m
    |   |   totalCost = inputCost + outputCost
    |   +-- Skip models with null pricing
    |   +-- Rank by totalCost (ascending)
    |
    +-- UI Layer
        +-- Scenario selector (tabs or cards)
        +-- Ranked model list (cheapest first)
        +-- Input/Output token breakdown per model
        +-- Currency toggle (reuse from PricingTable)
        +-- Confidence badge (reuse from PricingTable)
```

### Recommended Project Structure

```
app/
├── page.tsx                          # Server Component - fetches data, passes to CostCalculator
├── components/
│   ├── PricingTable.tsx              # Existing (Phase 3)
│   └── CostCalculator.tsx            # NEW: Client Component - practical cost display
└── lib/
    ├── pricing-utils.ts              # Existing - add cost calculation functions
    └── cost-scenarios.ts             # NEW: Scenario definitions and token counts
```

### Pattern 1: Scenario Configuration

**What:** Define cost scenarios as a constant array with token counts
**When to use:** When scenarios are fixed and don't change per-user
**Example:**
```typescript
// app/lib/cost-scenarios.ts

export interface CostScenario {
  id: string;
  name: string;
  description: string;
  inputTokens: number;
  outputTokens: number;
  icon: string; // emoji or icon class
}

export const COST_SCENARIOS: CostScenario[] = [
  {
    id: 'long-prompts',
    name: '10 Long Prompts',
    description: 'Detailed questions with context (~1K tokens in, ~2K out each)',
    inputTokens: 10_000,
    outputTokens: 20_000,
    icon: '💬',
  },
  {
    id: 'leetcode-hard',
    name: '100 LeetCode Hard Tasks',
    description: 'Complex coding problems with solutions (~500 in, ~1.5K out each)',
    inputTokens: 50_000,
    outputTokens: 150_000,
    icon: '🧩',
  },
  {
    id: 'document-summary',
    name: 'Summarize 100-Page Document',
    description: 'Long document input with summary output (~65K in, ~5K out)',
    inputTokens: 65_000,
    outputTokens: 5_000,
    icon: '📄',
  },
  {
    id: 'coding-agent',
    name: '1 Coding-Agent Session',
    description: 'Full agentic session with tool use (~200K in, ~50K out)',
    inputTokens: 200_000,
    outputTokens: 50_000,
    icon: '🤖',
  },
];
```

### Pattern 2: Cost Calculation Utility

**What:** Pure function to calculate practical cost from pricing data
**When to use:** When converting per-token pricing to scenario-based costs
**Example:**
```typescript
// app/lib/pricing-utils.ts (add to existing file)

export interface PracticalCost {
  modelId: number;
  modelName: string;
  sourceName: string | null;
  confidence: string;
  inputPricePer1m: number;
  outputPricePer1m: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

/**
 * Calculate practical cost for a model given a scenario's token counts.
 * Returns null if pricing data is incomplete.
 */
export function calculatePracticalCost(
  model: PricingRow,
  inputTokens: number,
  outputTokens: number
): PracticalCost | null {
  if (model.inputPricePer1m === null || model.outputPricePer1m === null) {
    return null;
  }

  const inputCost = (inputTokens / 1_000_000) * model.inputPricePer1m;
  const outputCost = (outputTokens / 1_000_000) * model.outputPricePer1m;

  return {
    modelId: model.id,
    modelName: model.modelName,
    sourceName: model.sourceName,
    confidence: model.confidence,
    inputPricePer1m: model.inputPricePer1m,
    outputPricePer1m: model.outputPricePer1m,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

/**
 * Calculate practical costs for all models in a scenario.
 * Returns sorted array (cheapest first), excluding models with missing pricing.
 */
export function calculateScenarioCosts(
  models: PricingRow[],
  inputTokens: number,
  outputTokens: number
): PracticalCost[] {
  return models
    .map((model) => calculatePracticalCost(model, inputTokens, outputTokens))
    .filter((cost): cost is PracticalCost => cost !== null)
    .sort((a, b) => a.totalCost - b.totalCost);
}
```

### Pattern 3: CostCalculator Client Component

**What:** Interactive component showing practical costs with scenario selection
**When to use:** When users need to compare costs across models for specific use cases
**Example:**
```tsx
// app/components/CostCalculator.tsx
'use client';

import { useState, useMemo } from 'react';
import { COST_SCENARIOS } from '@/app/lib/cost-scenarios';
import { calculateScenarioCosts, formatPrice } from '@/app/lib/pricing-utils';
import type { PricingRow } from './PricingTable';

export function CostCalculator({ data, exchangeRate }: { data: PricingRow[]; exchangeRate?: number }) {
  const [selectedScenario, setSelectedScenario] = useState(COST_SCENARIOS[0].id);
  const [currency, setCurrency] = useState<'usd' | 'vnd'>('usd');

  const scenario = COST_SCENARIOS.find((s) => s.id === selectedScenario)!;
  const costs = useMemo(
    () => calculateScenarioCosts(data, scenario.inputTokens, scenario.outputTokens),
    [data, scenario]
  );

  return (
    <div>
      {/* Scenario selector */}
      <div className="flex gap-2 mb-6">
        {COST_SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedScenario(s.id)}
            className={`px-4 py-2 rounded-lg text-sm ${
              selectedScenario === s.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s.icon} {s.name}
          </button>
        ))}
      </div>

      {/* Ranked model list */}
      <div className="space-y-3">
        {costs.map((cost, index) => (
          <div key={cost.modelId} className="flex items-center justify-between p-4 bg-white border rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
              <div>
                <p className="font-medium">{cost.modelName}</p>
                <p className="text-sm text-gray-500">{cost.sourceName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">{formatPrice(cost.totalCost)}</p>
              <p className="text-sm text-gray-500">
                In: {formatPrice(cost.inputCost)} | Out: {formatPrice(cost.outputCost)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Pre-computing costs in DB:** Don't use the `practicalCosts` table for v1. Calculate on the client from `extractions` data. The table can be used for caching later if performance requires it.
- **Hardcoded token counts in components:** Don't put token counts directly in the UI component. Extract to `cost-scenarios.ts` so they're configurable and testable.
- **Ignoring null pricing:** Don't assume all models have pricing data. Filter out models with null `inputPricePer1m` or `outputPricePer1m` before calculating.
- **Separate page for costs:** Don't create a new route. Add the CostCalculator section below the PricingTable on the landing page for cohesive UX.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cost formatting | Custom currency formatter | Existing `formatPrice()` and `formatCurrencyPrice()` | Already handles USD/VND, edge cases, decimal precision |
| Model ranking | Custom sort | `Array.sort()` with `totalCost` comparator | Simple numeric sort, no library needed |
| Scenario selection | Custom tab component | Tailwind button group with state | Simple toggle, no library needed |

**Key insight:** The cost calculation is simple math. The value is in the UX — making it easy to compare models for real-world scenarios. Don't over-engineer the calculation layer.

## Common Pitfalls

### Pitfall 1: Models with Missing Pricing Data

**What goes wrong:** Some models may have `inputPricePer1m` or `outputPricePer1m` as null (e.g., free tier models with no published pricing, or models where only one pricing dimension was extracted).

**Why it happens:** Phase 2 extraction may not always capture both input and output pricing.

**How to avoid:** Filter out models with null pricing before calculation. Display a note like "X models excluded due to incomplete pricing data."

**Warning signs:** CostCalculator shows NaN or undefined costs.

### Pitfall 2: Extremely Cheap or Expensive Models Skewing Display

**What goes wrong:** Free models (price = 0) or very expensive models dominate the view, making it hard to compare mid-range models.

**Why it happens:** Price range varies by 1000x across providers.

**How to avoid:** Always show the full ranked list. Consider adding a log-scale toggle for the cost display, or grouping into tiers (free, budget, standard, premium).

**Warning signs:** User can't see meaningful differences between mid-range models.

### Pitfall 3: Currency Toggle State Not Shared with PricingTable

**What goes wrong:** PricingTable has its own currency toggle, and CostCalculator has a separate one. They're not synchronized.

**Why it happens:** Each component manages its own state independently.

**How to avoid:** Lift currency state to the parent page component, or use a shared context. Pass `currency` and `setCurrency` as props to both components.

**Warning signs:** User toggles to VND in PricingTable, scrolls down to CostCalculator, and sees USD.

### Pitfall 4: Duplicate Model Names Across Providers

**What goes wrong:** Same model name (e.g., "llama-3.1-70b") appears from multiple providers (Together, Groq, Fireworks). The ranked list shows duplicates without clear provider attribution.

**Why it happens:** Different providers offer the same base model at different prices.

**How to avoid:** Always show provider name alongside model name. This is already handled in the PricingTable pattern — replicate it in CostCalculator.

**Warning signs:** User sees "llama-3.1-70b" three times without knowing which provider each entry is for.

### Pitfall 5: Token Count Estimates May Not Reflect Real Usage

**What goes wrong:** The predefined token counts (e.g., 10K input for "10 long prompts") are estimates. Real usage varies widely.

**Why it happens:** Token counts depend on prompt complexity, model behavior, and user patterns.

**How to avoid:** Add a brief description under each scenario explaining the token assumptions. Example: "10 Long Prompts: ~1,000 input tokens + ~2,000 output tokens per prompt." This sets expectations and allows users to mentally adjust.

**Warning signs:** User reports that actual costs don't match the calculator.

## Code Examples

### Cost Calculation Function

```typescript
// Source: Custom implementation based on pricing-utils.ts patterns

/**
 * Calculate cost for a given number of tokens at a per-1M-token rate.
 * @param tokens - Number of tokens
 * @param pricePer1m - Price per 1M tokens (USD)
 * @returns Cost in USD
 */
export function calculateTokenCost(tokens: number, pricePer1m: number): number {
  return (tokens / 1_000_000) * pricePer1m;
}

// Example: 10,000 input tokens at $3.00/1M = $0.03
calculateTokenCost(10_000, 3.00); // 0.03
```

### Ranked Comparison with Provider Attribution

```tsx
// Source: Adapted from PricingTable pattern

<div className="space-y-3">
  {costs.map((cost, index) => (
    <div
      key={cost.modelId}
      className={`flex items-center justify-between p-4 border rounded-lg ${
        index === 0 ? 'border-green-300 bg-green-50' : 'bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`text-lg font-bold ${index === 0 ? 'text-green-600' : 'text-gray-400'}`}>
          #{index + 1}
        </span>
        <div>
          <p className="font-medium">{sanitizeDisplayName(cost.modelName)}</p>
          <p className="text-sm text-gray-500">
            {cost.sourceName ?? 'Unknown provider'}
            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs ${getConfidenceColor(cost.confidence)}`}>
              {cost.confidence}
            </span>
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xl font-bold">{formatCurrencyPrice(cost.totalCost, currency, exchangeRate)}</p>
        <p className="text-sm text-gray-500">
          In: {formatCurrencyPrice(cost.inputCost, currency, exchangeRate)} | Out: {formatCurrencyPrice(cost.outputCost, currency, exchangeRate)}
        </p>
      </div>
    </div>
  ))}
</div>
```

### Server Component Data Fetching

```tsx
// app/page.tsx (add CostCalculator alongside PricingTable)

import { CostCalculator } from '@/app/components/CostCalculator';

export default async function HomePage() {
  // ... existing data fetching ...

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Existing branding and PricingTable */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-6 text-center">Latest Pricing Data</h2>
        <PricingTable data={pricingData} exchangeRate={exchangeRate} />
      </div>

      {/* NEW: Practical Cost Calculator */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-6 text-center">What Does It Actually Cost?</h2>
        <p className="text-center text-gray-500 mb-8">
          See real-world costs for common AI use cases, ranked cheapest to most expensive.
        </p>
        <CostCalculator data={pricingData} exchangeRate={exchangeRate} />
      </div>
    </main>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-token pricing only | Practical cost scenarios | Phase 4 | Users understand actual costs, not abstract rates |
| No comparison view | Side-by-side ranked comparison | Phase 4 | Users can quickly find cheapest model for their use case |
| Manual cost calculation | Automated cost calculator | Phase 4 | No mental math required |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "10 Long Prompts" = 10K input + 20K output tokens | Pattern 1 | Token counts may not match real usage; medium risk — add description explaining assumptions |
| A2 | "100 LeetCode Hard" = 50K input + 150K output tokens | Pattern 1 | Coding problems vary widely in complexity; medium risk — add description |
| A3 | "100-Page Document" = 65K input + 5K output tokens | Pattern 1 | Page density varies; low risk — reasonable estimate |
| A4 | "1 Coding-Agent Session" = 200K input + 50K output tokens | Pattern 1 | Agent sessions vary hugely; medium risk — add description |
| A5 | Client-side calculation is sufficient (no need for practicalCosts table) | Architecture | If dataset grows large, may need pre-computation; low risk for v1 |
| A6 | CostCalculator should be on the same page as PricingTable | Anti-Patterns | UX decision; could be separate page if page gets too long |

## Open Questions (RESOLVED)

1. **Should the CostCalculator share currency state with PricingTable?**
   - What we know: Both components have USD/VND toggle.
   - What's unclear: Whether they should be synchronized.
   - RESOLVED: Yes — lift currency state to the parent page component. Pass as props to both.

2. **Should we add a "Custom Scenario" option?**
   - What we know: REQUIREMENTS.md lists ADVF-01 (user-defined custom cost scenarios) as v2.
   - What's unclear: Whether to include a basic version in v1.
   - RESOLVED: No — defer to v2. The four predefined scenarios cover the core use cases.

3. **How should we handle the practicalCosts table?**
   - What we know: The table exists in the schema with the right columns.
   - What's unclear: Whether to use it for v1 or leave it empty.
   - RESOLVED: Leave it empty for v1. Calculate on the client. Use the table for caching in v2 if performance requires it.

4. **Should CostCalculator be a separate page or section on landing page?**
   - What we know: Phase 3 already has a full PricingTable on the landing page.
   - What's unclear: Whether adding CostCalculator makes the page too long.
   - RESOLVED: Section on landing page with anchor navigation. If the page gets too long, consider a separate `/costs` route in v2.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/runtime | ✓ | — | — |
| pnpm | Package manager | ✓ | — | — |
| PostgreSQL | Data source | ✓ | — | — |
| @tanstack/react-table | Comparison table | ✓ | 8.21.3 | — |
| Tailwind CSS | Styling | ✓ | 4.3.0 | — |
| date-fns | Date formatting | ✓ | 4.4.0 | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COST-01 | "10 Long Prompts" cost display with token breakdown | unit | `pnpm test -- --grep "long prompts"` | Wave 0 |
| COST-02 | "100 LeetCode Hard" cost display with token breakdown | unit | `pnpm test -- --grep "leetcode"` | Wave 0 |
| COST-03 | "100-Page Document" cost display with token breakdown | unit | `pnpm test -- --grep "document"` | Wave 0 |
| COST-04 | "1 Coding-Agent Session" cost display with token breakdown | unit | `pnpm test -- --grep "coding agent"` | Wave 0 |
| COST-05 | Side-by-side comparison ranked cheapest to most expensive | unit | `pnpm test -- --grep "comparison"` | Wave 0 |
| COST-06 | Input/output token breakdown per scenario | unit | `pnpm test -- --grep "breakdown"` | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/pricing-utils.test.ts` — add tests for `calculatePracticalCost()`, `calculateScenarioCosts()`, and COST_SCENARIOS validation (covers COST-01, COST-02, COST-03, COST-04, COST-06)
- [ ] `tests/cost-calculator.test.tsx` — covers COST-05, COST-06 (UI component rendering, ranked list, breakdown display)

## Sources

### Primary (HIGH confidence)
- [VERIFIED: npm registry] @tanstack/react-table 8.21.3
- [VERIFIED: npm registry] Tailwind CSS 4.3.0
- [VERIFIED: npm registry] date-fns 4.4.0
- [VERIFIED: codebase] Database schema with `practicalCosts` table
- [VERIFIED: codebase] Existing `pricing-utils.ts` patterns

### Secondary (MEDIUM confidence)
- [ASSUMED] Token count estimates for scenarios based on typical AI usage patterns
- [ASSUMED] Client-side calculation sufficient for v1 dataset size

### Tertiary (LOW confidence)
- [ASSUMED] Coding-agent session token counts (200K in, 50K out) — varies widely by tool and complexity

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and verified
- Architecture: HIGH — follows established Phase 3 patterns
- Pitfalls: MEDIUM — token count estimates need user validation

**Research date:** 2026-06-13
**Valid until:** 2026-07-13 (30 days — stable stack, no fast-moving dependencies)
