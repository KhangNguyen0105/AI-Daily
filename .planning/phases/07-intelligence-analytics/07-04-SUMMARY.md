# Phase 7 Plan 04 Summary: Compare Page + Alert System

**Status:** Complete
**Date:** 2026-06-15
**Requirements:** INTL-04, INTL-05

## What Was Built

### Task 1: /compare Page (INTL-04)

**New files created:**

- `app/components/ModelSelector.tsx` — Custom searchable dropdown. Type to filter by model name or provider. Click to select. Escape to close. Click outside to close. Shows model name + source name in options.

- `app/components/ComparisonCard.tsx` — Single model comparison card. Shows: model name, provider, confidence badge, input/output pricing, context window, all 4 practical cost scenarios (from COST_SCENARIOS), and free tier/promotion badges (green/blue/purple per type).

- `app/components/ComparePageClient.tsx` — Client wrapper with URL sync. Manages 2-5 model selectors. "Add model" button (disabled at 5). "Remove" button per selector (minimum 2). Syncs selected models to `?models=` query param with `encodeURIComponent`. Responsive grid layout (1-col mobile, 2-col md, 3-col lg).

- `app/compare/page.tsx` — Server component. Parses `?models=` query param. Queries: (1) all distinct models for dropdown, (2) selected models' pricing data, (3) practical costs with fallback calculation, (4) promotions matched by modelPattern. Passes all data to ComparePageClient.

### Task 2: Bell Icon + Alert Banner (INTL-05)

**New files created:**

- `app/components/BellIcon.tsx` — Interactive bell icon with SVG. Gray outline when no alert set, blue filled when alert exists. Toggles inline AlertSetForm on click. Min 44px touch target.

- `app/components/AlertSetForm.tsx` — Inline threshold form. Shows current price as reference. Number input for threshold price. "Set Alert" button (calls `addAlert`). "Remove Alert" button with inline confirmation per UI-SPEC copywriting. Sets `has_alerts` cookie for server-side price fetching.

- `app/components/AlertBanner.tsx` — Fixed bottom-right toast (fixed bottom-4 right-4 z-50). Reads alerts from `getAlerts()` on mount. Compares against `currentPrices` prop (server-fetched). Only shows alerts where `currentPrice < thresholdPrice` (D-17). Auto-dismiss after 10 seconds with 300ms fade. Individual dismiss and "Dismiss all" buttons.

**Modified files:**

- `app/components/ModelDetailClient.tsx` — Added BellIcon import and rendered it inline next to model name in the hero section h1 tag.

- `app/layout.tsx` — Added AlertBanner to root layout. Server component checks `has_alerts` cookie. When cookie exists, queries all latest model prices from DB. Passes `currentPrices` record to AlertBanner.

## Tests

**New test files:**

- `tests/components/model-selector.test.tsx` — 8 tests covering: renders input, opens on focus, filters by model name, filters by source name, calls onSelect on click, shows model+source in options, shows "No models found", displays selected name.

- `tests/components/compare-page.test.tsx` — 12 tests covering: ComparisonCard renders model name, source name, pricing, context window, practical costs, confidence badge, "No free tier" state, free tier badge. ComparePageClient shows empty state (0 models), "Add another" (1 model), page heading, Add model button.

- `tests/components/alert-banner.test.tsx` — 8 tests covering: renders nothing when no alerts, renders nothing when no prices, renders nothing when price above threshold, renders alert when price below threshold, renders multiple alerts, dismiss individual alert, auto-dismiss after 10s, no alert for missing model in prices.

**Results:** All 28 new tests pass. All existing tests pass (1 pre-existing timeout in score-worker.test.ts unrelated to this phase).

## Key Design Decisions

1. **Server-side price fetching for alerts:** layout.tsx queries all latest prices when `has_alerts` cookie exists. AlertBanner filters client-side against localStorage alerts. This avoids passing alert model names to the server.

2. **Practical costs fallback:** compare/page.tsx first tries to read from `practical_costs` DB table. Falls back to calculating from pricing data + COST_SCENARIOS if table is empty.

3. **Promotion matching:** Matches promotions by exact modelPattern or wildcard pattern (ending with `*`) against model names.

4. **URL sync:** Uses `encodeURIComponent` for model names in URL (Pitfall 3). Server reads with `decodeURIComponent`.

5. **Cookie-based alert detection:** AlertSetForm sets `has_alerts=1` cookie on alert creation, removes it when all alerts are cleared. Server checks this cookie to avoid unnecessary DB queries when no alerts exist.
