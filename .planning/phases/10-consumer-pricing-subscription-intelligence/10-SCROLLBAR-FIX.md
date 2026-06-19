# Scrollbar Fix — Phase 10

**Date:** 2026-06-19
**Branch:** phase/consumer-pricing-subscription-intelligence/phase-10-schema-consumer-adapters
**Pattern restored from:** commit `5b68a1b` (Phase 9 scrollbar fix, overwritten by Phase 10 changes)

## Problem

Two unwanted scrollbars appeared on the home page:
1. **Vertical scrollbar on the entire page** — body should be `h-screen overflow-hidden`, each panel scrolls internally
2. **Horizontal scrollbar on the Pricing table** — table should have `overflow-x-hidden`, no `min-w` constraints on columns

## Correct Pattern: "Fixed Page, Internal Scroll"

The page itself NEVER scrolls. Each content panel scrolls independently within its own container.

### Layout Hierarchy

```
html
└── body (h-screen overflow-hidden)          ← Page doesn't scroll
    ├── TopNav (fixed, h-14 = 56px)
    └── div.pt-14
        └── main (h-[calc(100vh-56px)] flex flex-col)  ← Fills viewport minus nav
            ├── Branding section (shrink-0)             ← Fixed height
            └── Content area (flex-1 min-h-0)           ← Fills remaining space
                └── HomePageClient (h-full)
                    ├── Left: Pricing Table (flex flex-col min-h-0)
                    │   ├── Header (shrink-0)
                    │   ├── Filter bar (shrink-0)
                    │   ├── Row count (shrink-0)
                    │   ├── Table (flex-1 min-h-0 overflow-y-auto overflow-x-hidden)  ← Scrolls vertically
                    │   └── Pagination (shrink-0)
                    └── Right: Cost Calculator (flex flex-col min-h-0)
                        ├── Header (shrink-0)
                        ├── Description (shrink-0)
                        └── Calculator (flex-1 min-h-0 overflow-y-auto)  ← Scrolls vertically
```

### For Content Pages (digest, promotions, subscriptions)

```
main (h-[calc(100vh-56px)] overflow-y-auto)   ← Scrolls internally
└── Content...
```

## Files Modified

| File | Change |
|------|--------|
| `app/layout.tsx` | `body` → `h-screen overflow-hidden` |
| `app/page.tsx` | `main` → `h-[calc(100vh-56px)] flex flex-col`, branding `shrink-0`, content `flex-1 min-h-0` |
| `app/components/HomePageClient.tsx` | `h-full` on container, both panels `flex flex-col min-h-0`, headers `shrink-0` |
| `app/components/PricingTable.tsx` | `h-full flex flex-col` on root, filter/count/pagination `shrink-0`, table `flex-1 min-h-0 overflow-y-auto overflow-x-hidden`, removed `min-w` constraints |
| `app/components/PromotionsPageClient.tsx` | `h-[calc(100vh-56px)] overflow-y-auto` |
| `app/digest/page.tsx` | `h-[calc(100vh-56px)] overflow-y-auto` |
| `app/globals.css` | Reset to `@import "tailwindcss"` only |

## Rules for Future Development

### Rule 1: Body is ALWAYS `h-screen overflow-hidden`
```jsx
<body className="h-screen overflow-hidden">
```
The page itself NEVER scrolls. This prevents both vertical and horizontal scrollbars at the page level.

### Rule 2: Main content fills viewport minus nav
```jsx
<main className="h-[calc(100vh-56px)] flex flex-col">
```
56px = `pt-14` (TopNav height). The main element fills the remaining viewport.

### Rule 3: Use `shrink-0` for fixed-height elements
Headers, filter bars, pagination, descriptions — anything that should NOT grow or shrink gets `shrink-0`.

### Rule 4: Use `flex-1 min-h-0` for scrollable containers
The scrollable area fills remaining space (`flex-1`) and can shrink below its content (`min-h-0`). Without `min-h-0`, flex children won't overflow.

### Rule 5: Table scrolls vertically only
```jsx
<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
```
- `overflow-y-auto`: scroll rows when they exceed container height
- `overflow-x-hidden`: NEVER show horizontal scrollbar

### Rule 6: No `min-w` constraints on table columns
Remove `min-w-[120px]`, `min-w-[80px]`, etc. from table cells. These force horizontal overflow. Let columns auto-size based on content.

### Rule 7: Content pages use internal scroll
```jsx
<main className="h-[calc(100vh-56px)] overflow-y-auto">
```
For pages without side-by-side panels (digest, promotions, subscriptions), the main element itself scrolls.

### Rule 8: Test scrollbar behavior on every change
After ANY layout change, verify:
- [ ] No vertical scrollbar on body
- [ ] No horizontal scrollbar on body
- [ ] Pricing table scrolls vertically within its container
- [ ] Cost Calculator scrolls vertically within its container
- [ ] Neither table has a horizontal scrollbar
- [ ] Pagination controls are always visible (not scrolled away)
