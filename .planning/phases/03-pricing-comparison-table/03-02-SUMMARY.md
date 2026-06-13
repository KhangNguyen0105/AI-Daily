---
phase: 03-pricing-comparison-table
plan: 02
subsystem: frontend
tags: [pricing-table, filters, search, logos, ui]
depends_on:
  requires: [03-01]
  provides: [searchable-filterable-pricing-table]
  affects: [app/components/PricingTable.tsx]
tech_stack:
  added: []
  patterns: [useDeferredValue, useMemo pre-filter pipeline, column filter functions]
key_files:
  created:
    - app/lib/provider-metadata.ts
    - tests/provider-metadata.test.ts
    - public/logos/openai.svg
    - public/logos/anthropic.svg
    - public/logos/google.svg
    - public/logos/mistral.svg
    - public/logos/cohere.svg
    - public/logos/groq.svg
    - public/logos/together.svg
    - public/logos/perplexity.svg
    - public/logos/xai.svg
    - public/logos/fireworks.svg
    - public/logos/deepseek.svg
    - public/logos/amazon.svg
  modified:
    - app/components/PricingTable.tsx
decisions:
  - "Used React useDeferredValue instead of lodash.debounce for search debounce (no new dependency)"
  - "Pre-filter pipeline via useMemo before useReactTable for free tier, price range, and context window filters"
  - "Provider column filter wired as tanstack columnFilter for consistency with globalFilter"
  - "Collapsible Advanced Filters section to keep primary filters prominent"
metrics:
  duration: ~9 min
  completed: "2026-06-12"
  tasks: 2
  files: 15
---

# Phase 3 Plan 02: Search, Filters, Provider Logos, and Model Family Summary

One-liner: Added search, provider dropdown, free tier checkbox, price/context range filters, provider logos, and model family grouping to the pricing comparison table.

## Tasks Completed

### Task 1: Create provider metadata map and SVG logos (1e311fc)

Created `app/lib/provider-metadata.ts` with:
- `providerLogos` Record mapping 17 normalized provider names (including aliases) to SVG logo paths
- `getProviderLogo(providerName)` function with case-insensitive, whitespace-trimming lookup
- `getUniqueProviders(data)` function extracting sorted unique provider names from PricingRow array

Created 12 SVG logo files in `public/logos/` -- each is a 24x24 colored circle with the provider's initial letter, using brand-accurate colors (e.g., OpenAI green #10A37F, Anthropic terracotta #D97757).

### Task 2: Add search, all filters, and provider logos to PricingTable (705fb5c, TDD)

Enhanced `app/components/PricingTable.tsx` with:
- **Global search**: Text input above table, filters rows by model name OR provider name (case-insensitive), uses `useDeferredValue` for debounce
- **Provider dropdown**: `<select>` populated with unique providers from data, wired as column filter on sourceName
- **Free tier checkbox**: Pre-filters to rows where both inputPricePer1m and outputPricePer1m are 0 or null
- **Price range filters**: Min/max number inputs for both input and output price ($/1M tokens), null values pass through
- **Context window filter**: Min/max number inputs for context window (tokens), null values pass through
- **Collapsible Advanced Filters**: Price range and context window inputs hidden behind toggle to keep UI clean
- **Provider logos**: 24x24 SVG logo rendered before provider name text, with fallback initial circle
- **Row count indicator**: "Showing X of Y models" below filter bar
- **Clear filters button**: Resets all filter states to defaults, only visible when filters are active
- **Pre-filter pipeline**: Free tier, price range, and context window filters applied via `useMemo` before `useReactTable`; globalFilter and columnFilter handled internally by tanstack

TDD: Provider-metadata unit tests written first (RED), then PricingTable implementation (GREEN). 11 new tests cover logo map completeness, case-insensitive lookup, alias resolution, and unique provider extraction.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| useDeferredValue over lodash.debounce | No new dependency; React built-in provides equivalent debounced search behavior |
| Pre-filter pipeline via useMemo | Free tier, price range, and context window filters are data-level filters that should reduce the dataset before tanstack processes it |
| Collapsible Advanced Filters | Keeps the primary filter bar (search + provider + free tier) uncluttered; advanced filters are secondary |
| Fallback initial circle for unknown providers | Ensures consistent visual layout even when a provider has no logo |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all filters are fully wired to data.

## Self-Check: PASSED

All 15 files verified present. All 3 commits (1e311fc, 7329810, 705fb5c) verified in git log.
