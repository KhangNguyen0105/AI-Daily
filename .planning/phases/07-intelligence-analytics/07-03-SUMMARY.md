# Phase 07-03 Summary: Promotions Page

**Completed:** 2026-06-15
**Plan:** 07-03-PLAN.md
**Wave:** 2
**Status:** DONE

## What Was Built

### Files Created

| File | Purpose |
|------|---------|
| `app/components/PromotionCard.tsx` | Individual promotion card with type badge, active/expired styling, days remaining, credits, source link |
| `app/components/PromotionsPageClient.tsx` | Client wrapper with type filter pills (All/Free Tier/Promotion/Beta), responsive card grid, sorting |
| `app/promotions/page.tsx` | Server component querying promotions table with sources LEFT JOIN |
| `tests/components/promotions-page.test.tsx` | 24 tests covering PromotionCard and PromotionsPageClient |

### What It Delivers

- **INTL-03**: Dedicated promotion/free tier tracker page at `/promotions`
- Card grid layout (1-col mobile, 2-col md, 3-col lg)
- Type filter pills: All, Free Tier, Promotion, Beta
- Active promotions sorted first, expired ones grayed out (opacity-60)
- Badge colors match existing PromotionsList: free_tier=green, promotion=blue, beta=purple
- Days remaining calculation with timezone-consistent `Date.now()` comparison (Pitfall 4)
- Source links validated with `isSafeUrl`
- Empty state: "No active promotions" with descriptive subtext

## Test Results

```
tests/components/promotions-page.test.tsx — 24 passed
```

All tests green. One pre-existing timeout failure in `tests/pipeline/score-worker.test.ts` (unrelated).

## Key Decisions

1. **Reused `typeBadgeStyles` pattern** from PromotionsList.tsx rather than importing — small record, keeps components independent
2. **`Date.now()` for timezone consistency** per Pitfall 4 — avoids SSR/client hydration mismatch
3. **Client-side filtering** — data is already fetched by server component, filter is pure UI state
4. **Separate `PromotionCardData` interface** — extends the pattern from PromotionsList with `sourceName` field for provider display

## Acceptance Criteria Met

- [x] PromotionCard.tsx exports PromotionCard component
- [x] Active cards have bg-white, expired have opacity-60
- [x] Type badge uses correct color classes matching typeBadgeStyles
- [x] Days remaining shows correct text for various date scenarios
- [x] tests/components/promotions-page.test.tsx passes (24/24)
- [x] app/promotions/page.tsx exports default async function with revalidate = 60
- [x] Server component queries promotions table with sources JOIN
- [x] PromotionsPageClient renders filter pills: All, Free Tier, Promotion, Beta
- [x] Active filter highlighted with bg-blue-600
- [x] Card grid uses responsive columns: 1-col mobile, 2-col md, 3-col lg
- [x] Active promotions sorted before expired ones
- [x] Empty state shows "No active promotions" message
- [x] Page uses max-w-6xl mx-auto px-4 py-8 container per UI-SPEC
