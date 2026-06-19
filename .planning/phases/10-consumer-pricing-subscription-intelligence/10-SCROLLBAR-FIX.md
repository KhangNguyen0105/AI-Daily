# Scrollbar Fix — Phase 10

**Date:** 2026-06-19
**Branch:** phase/consumer-pricing-subscription-intelligence/phase-10-schema-consumer-adapters

## Problem

Two unwanted scrollbars appeared on the home page:
1. **Vertical scrollbar on the entire page** — caused by `min-h-screen` on `<main>` combined with `maxHeight: calc(100vh - 220px)` on the table container (220px offset was ~200px too small)
2. **Horizontal scrollbar on the Pricing table** — caused by `overflow-x: auto` on the table container, which leaked horizontal overflow to the body level

## Root Causes

| Issue | File | Line | Problematic CSS/JSX |
|-------|------|------|---------------------|
| Vertical (body) | `app/components/PricingTable.tsx` | 578 | `maxHeight: 'calc(100vh - 220px)'` — offset too small |
| Vertical (body) | `app/page.tsx` | 73 | `min-h-screen` with no overflow constraint |
| Horizontal (table) | `app/components/PricingTable.tsx` | 578 | `overflow-x-auto` explicitly enables horizontal scrolling |
| Horizontal (body) | `app/layout.tsx` | 17-21 | No `overflow-x` constraint on `<html>` or `<body>` |

## Fixes Applied

### 1. `app/globals.css` — Add body overflow constraint
```css
html,
body {
  overflow-x: hidden;
}
```
Prevents any horizontal overflow from leaking to the page level.

### 2. `app/page.tsx` — Remove `min-h-screen`
```diff
- <main className="min-h-screen bg-white text-gray-900">
+ <main className="bg-white text-gray-900">
```
Let the page scroll naturally. `min-h-screen` is only appropriate for pages that need to fill the viewport (login pages, empty states).

### 3. `app/components/PricingTable.tsx` — Remove maxHeight, use overflow-x-clip
```diff
- <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
+ <div className="overflow-x-clip">
```
- Removed `maxHeight` — the table is now its natural height and the page scrolls
- Changed `overflow-x-auto` to `overflow-x-clip` — prevents horizontal scrollbar from appearing at the table level while still allowing content to be visible

## Rules for Future Development

### Rule 1: Never use `min-h-screen` on pages with scrollable content
`min-h-screen` forces the page to be at least viewport height. This is appropriate for:
- Login pages (centered form)
- Empty states
- Landing pages with fixed-height layouts

This is NOT appropriate for:
- Pages with tables that have internal scrolling
- Pages with long content lists
- Any page where content naturally exceeds viewport height

### Rule 2: Never use `maxHeight: calc(100vh - Npx)` for table containers
The `Npx` offset is always fragile — it depends on the exact height of surrounding elements (nav, headers, padding, margins). If any of those change, the offset becomes wrong and you get either:
- A vertical scrollbar on the body (offset too small)
- Unnecessary whitespace below the table (offset too large)

**Instead:** Let the page scroll naturally. If you need a fixed-height table with internal scrolling, use a container with a fixed `height` (not `maxHeight`) and `overflow-y: auto`.

### Rule 3: Always add `overflow-x: hidden` on `html` and `body`
This is a defensive measure. Horizontal overflow should NEVER appear at the page level. All horizontal scrolling should be contained within specific components (tables, code blocks, etc.).

### Rule 4: Use `overflow-x-clip` instead of `overflow-x-auto` for table containers
`overflow-x-auto` creates a horizontal scrollbar when the table is wider than its container. This is usually undesirable — the table should fit within its container.

`overflow-x-clip` prevents the scrollbar from appearing while still allowing the content to be visible. If horizontal scrolling is truly needed (e.g., on mobile), use `overflow-x-auto` with a clear visual indicator.

### Rule 5: Test scrollbar behavior on different viewport sizes
Always check:
- Does the page have an unwanted vertical scrollbar?
- Does the table have an unwanted horizontal scrollbar?
- Does the body have an unwanted horizontal scrollbar?
- Does the table scroll horizontally when it should (mobile)?

## Files Modified

| File | Change |
|------|--------|
| `app/globals.css` | Added `overflow-x: hidden` on `html`/`body` |
| `app/page.tsx` | Removed `min-h-screen` from `<main>` |
| `app/components/PricingTable.tsx` | Removed `maxHeight`, changed `overflow-x-auto` to `overflow-x-clip` |
