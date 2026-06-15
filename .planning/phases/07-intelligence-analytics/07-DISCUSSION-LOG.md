# Phase 7: Intelligence & Analytics - Discussion Log

**Date:** 2026-06-15
**Phase:** 7

## Areas Discussed

### 1. Trend Charts Page
**Question:** Where should the pricing trend charts live?
**Options:** New /trends route (Recommended) / Integrated on landing page / Both (summary + detail page)
**Selection:** New /trends route (Recommended)

**Question:** What should the trend charts show?
**Options:** Per-model charts (Recommended) / Multi-model overlay / Top movers + per-model drill-down
**Selection:** Per-model charts (Recommended)

**Question:** Should users be able to filter by time range?
**Options:** All available data (Recommended) / Preset time ranges / Custom date range
**Selection:** All available data (Recommended)

**Question:** How should price drops and new launches be highlighted?
**Options:** Visual markers on chart (Recommended) / Events list below chart / Both markers + events list
**Selection:** Visual markers on chart (Recommended)

### 2. Promotion Tracker
**Question:** Where should the promotion tracker live?
**Options:** New /promotions route (Recommended) / Section on landing page / Both (summary + detail page)
**Selection:** New /promotions route (Recommended)

**Question:** How should promotions be displayed?
**Options:** Card grid with filters (Recommended) / Sortable table / Grouped sections
**Selection:** Card grid with filters (Recommended)

**Question:** How should expired promotions be handled?
**Options:** Show all, gray expired (Recommended) / Hide expired, toggle to show / Active only
**Selection:** Show all, gray expired (Recommended)

### 3. Multi-Model Comparison
**Question:** Where should multi-model comparison live?
**Options:** New /compare route (Recommended) / Comparison mode in PricingTable / Both (quick + full)
**Selection:** New /compare route (Recommended)

**Question:** How should users select models to compare?
**Options:** Dropdown selectors (Recommended) / Autocomplete input / Checkbox list
**Selection:** Dropdown selectors (Recommended)

**Question:** What dimensions should be compared?
**Options:** All dimensions (Recommended) / Pricing only / Pricing + practical costs
**Selection:** All dimensions (Recommended)

**Question:** What layout for the comparison view?
**Options:** Side-by-side cards (Recommended) / Comparison table / Radar chart + cards
**Selection:** Side-by-side cards (Recommended)

### 4. Price Alerts
**Question:** Where should price alerts be stored? (No user accounts in v1)
**Options:** localStorage (Recommended) / Database table / localStorage + optional email
**Selection:** localStorage (Recommended)

**Question:** How should users create and manage alerts?
**Options:** Bell icon + /alerts page (Recommended) / Bell icon only / /alerts page only
**Selection:** Bell icon + /alerts page (Recommended)

**Question:** How should users be notified when price crosses threshold?
**Options:** On-page check (Recommended) / Browser push notifications / Both on-page + push
**Selection:** On-page check (Recommended)

**Question:** What type of price threshold?
**Options:** Below threshold only (Recommended) / Above or below / Percentage change
**Selection:** Below threshold only (Recommended)

## Decisions Summary

1. **Trend Charts:** New /trends route, per-model charts, all data, visual markers
2. **Promotion Tracker:** New /promotions route, card grid with filters, show all with gray expired
3. **Multi-Model Comparison:** New /compare route, dropdown selectors, all dimensions, side-by-side cards
4. **Price Alerts:** localStorage, bell icon + /alerts page, on-page check, below threshold only

## Deferred Ideas

None — all selected areas discussed within scope.
