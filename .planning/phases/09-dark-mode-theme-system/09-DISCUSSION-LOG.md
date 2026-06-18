# Discussion Log: Phase 9 - Dark Mode & Theme System

**Date:** 2026-06-18

## Area 1: Color Palette

**Question:** What should be the primary dark background color?
**Options:** gray-900 (Recommended) vs gray-800
**Selection:** gray-900 (Recommended)
**Notes:** Darker, more contrast. Better for OLED screens.

**Question:** Should accent colors stay the same or shift in dark mode?
**Options:** Keep same (Recommended) vs Lighter in dark mode
**Selection:** Keep same (Recommended)

**Question:** Should Recharts trend chart colors change in dark mode?
**Options:** Keep same (Recommended) vs Brighter in dark mode
**Selection:** Keep same (Recommended)

## Area 2: SSR & Flash Prevention

**Question:** How to prevent flash of wrong theme on page load?
**Options:** Inline script (Recommended) vs next-themes library
**Selection:** Inline script (Recommended)
**Notes:** Tiny inline script in <head> reads localStorage and sets .dark class before React hydrates. Zero flash. No extra dependency.

## Area 3: Transition Behavior

**Question:** Should theme toggle have a smooth CSS transition or instant switch?
**Options:** Smooth transition (Recommended) vs Instant switch
**Selection:** Smooth transition (Recommended)
**Notes:** Add transition-colors duration-200 to html element.

## Area 4: Component Wave Plan

**Question:** How should we split the implementation across waves?
**Options:** 3 waves (Recommended) vs 2 waves
**Selection:** 3 waves (Recommended)
**Notes:**
- Wave 1: Foundation — globals.css, ThemeProvider, ThemeToggle, layout.tsx, TopNav
- Wave 2: Core pages — HomePageClient, PricingTable, CostCalculator, ModelDetailClient
- Wave 3: Remaining — Digest, Trends, Promotions, Compare, Alerts + Admin

## Decisions Summary

| # | Decision | Choice |
|---|----------|--------|
| D-01 | Color approach | CSS custom properties |
| D-02 | Dark primary bg | gray-900 (#111827) |
| D-03 | Light primary bg | white (#ffffff) |
| D-04 | Accent colors | Keep same |
| D-05 | Chart colors | Keep same |
| D-06 | SSR approach | Inline script |
| D-07 | Theme state | ThemeProvider context |
| D-08 | Transition | Smooth 200ms |
| D-09 | Wave plan | 3 waves |

---
