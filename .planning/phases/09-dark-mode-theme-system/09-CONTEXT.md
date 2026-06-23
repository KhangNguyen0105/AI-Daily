# Phase 9: Dark Mode & Theme System - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a dark/light theme toggle to the entire application. Users can switch themes via a button in the TopNav. Theme preference persists in localStorage. On first visit, system preference (prefers-color-scheme) is used as default. All public and admin pages render correctly in both themes with no flash of wrong theme on page load.

</domain>

<decisions>
## Implementation Decisions

### Color Palette
- **D-01:** CSS custom properties approach (not `dark:` Tailwind variants). Define semantic tokens in globals.css, reference in components.
- **D-02:** Primary dark background: gray-900 (#111827). Secondary dark background: gray-800 (#1f2937).
- **D-03:** Light backgrounds stay as-is: white (#ffffff), gray-50 (#f9fafb).
- **D-04:** Accent colors (blue-600, green-500, yellow-500, red-500) stay the same in both themes.
- **D-05:** Recharts chart colors stay the same in both themes.

### SSR & Flash Prevention
- **D-06:** Inline `<script>` in `<head>` reads localStorage and sets `.dark` class on `<html>` before React hydrates. No external dependency (no next-themes).
- **D-07:** ThemeProvider React context manages theme state for client components (toggle, read current theme).

### Transition Behavior
- **D-08:** Smooth CSS transition on theme toggle: `transition: background-color 200ms, color 200ms` on `html` element.

### Component Wave Plan
- **D-09:** 3-wave implementation:
  - Wave 1: Foundation — globals.css (CSS tokens), ThemeProvider.tsx, ThemeToggle.tsx, layout.tsx, TopNav.tsx
  - Wave 2: Core pages — HomePageClient.tsx, PricingTable.tsx, CostCalculator.tsx, ModelDetailClient.tsx
  - Wave 3: Remaining — Digest, Trends, Promotions, Compare, Alerts pages + Admin layout + Admin pages

### Claude's Discretion
- Exact CSS token naming (e.g., `--bg-primary` vs `--color-bg`)
- Tailwind dark mode config approach in v4 (CSS-based `@variant` or `@custom-variant`)
- Whether to use `suppressHydrationWarning` on `<html>` for Next.js

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Tailwind CSS 4
- `app/globals.css` — Current CSS entry point (`@import "tailwindcss"`). Dark mode tokens will be added here.

### Layout & Navigation
- `app/layout.tsx` — Root layout with `<html>`, `<body>`, TopNav. Inline script goes here.
- `app/components/TopNav.tsx` — Fixed top nav. ThemeToggle button will be added here.

### Core Components (Wave 2)
- `app/components/HomePageClient.tsx` — Homepage layout with PricingTable + CostCalculator
- `app/components/PricingTable.tsx` — Main pricing comparison table
- `app/components/CostCalculator.tsx` — Practical cost scenarios
- `app/components/ModelDetailClient.tsx` — Model detail page

### Admin (Wave 3)
- `app/admin/` — Admin layout and pages

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 21 React components in `app/components/` — all need dark mode styles
- `globals.css` — single CSS file, currently just `@import "tailwindcss"`
- `TopNav.tsx` — fixed nav bar, ideal placement for ThemeToggle

### Established Patterns
- Tailwind CSS 4.x with CSS-based config (no tailwind.config.js)
- All colors are hardcoded Tailwind classes (bg-white, text-gray-900, border-gray-200, etc.)
- No existing CSS custom properties or theme system
- Server components (page.tsx) + client components ('use client') pattern

### Integration Points
- `layout.tsx` — Root layout where inline script and ThemeProvider wrap children
- `globals.css` — Where CSS custom properties are defined
- Every component file — Where hardcoded colors need to reference CSS tokens

</code_context>

<specifics>
## Specific Ideas

- User explicitly chose CSS custom properties over `dark:` Tailwind variants for maintainability
- Inline script approach for SSR (no next-themes dependency)
- Smooth 200ms transition on theme toggle
- 3-wave implementation: foundation → core pages → remaining + admin

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 9-Dark Mode & Theme System*
*Context gathered: 2026-06-18*
