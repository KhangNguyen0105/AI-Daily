---
phase: 06-daily-content-engine
plan: 03
subsystem: frontend
tags: [digest, archive, navigation, react-markdown, isr]
depends_on:
  requires: [06-01]
  provides: [digest-pages, top-nav, markdown-rendering]
  affects: [app/layout.tsx, app/digest/*, app/components/*]
tech_stack:
  added: [react-markdown, remark-gfm]
  patterns: [isr, generate-static-params, server-components, client-components]
key_files:
  created:
    - app/digest/page.tsx
    - app/digest/[date]/page.tsx
    - app/components/DigestArticle.tsx
    - app/components/TopNav.tsx
  modified:
    - app/layout.tsx
    - src/pipeline/article-generator.ts
    - package.json
    - pnpm-lock.yaml
decisions:
  - "Used react-markdown `components` prop for Tailwind styling instead of @tailwindcss/typography plugin (per UI-SPEC.md decision)"
  - "Adapted D-16/D-21 from SideNav to TopNav — SideNav does not exist in codebase"
  - "TopNav is a client component with usePathname() for active link detection"
  - "Pricing link uses exact match (pathname === '/') to avoid false active state on /digest"
metrics:
  duration: ~15 minutes
  completed: 2026-06-14
  tasks_completed: 2
  tasks_total: 2
---

# Phase 6 Plan 3: Digest Pages & Navigation Summary

Built the frontend pages for browsing daily digests — an archive list at /digest, individual article pages at /digest/[date] with Markdown rendering, and a site-wide TopNav navigation bar.

## Tasks Completed

- [x] Task 1: Install dependencies and create digest pages
- [x] Task 2: Article renderer and navigation components

## What Was Built

### /digest Archive Page (`app/digest/page.tsx`)
- Server component with ISR (revalidate = 60)
- Queries articles table reverse-chronologically with date, title, summary
- Server-side pagination via `searchParams.offset` (30 articles per page)
- "Load more" link when more articles exist
- Empty state: "No articles yet. Check back after the first pipeline run."
- Tailwind styling: max-w-4xl centered, white background, gray-900 text

### /digest/[date] Article Page (`app/digest/[date]/page.tsx`)
- SSG with ISR via `generateStaticParams` (pre-renders last 90 articles)
- Date validation with regex `/^\d{4}-\d{2}-\d{2}$/` before DB query (T-06-04)
- `notFound()` for invalid dates or missing articles
- Renders article via DigestArticle component

### DigestArticle Component (`app/components/DigestArticle.tsx`)
- Client component with react-markdown + remark-gfm
- Uses `components` prop for Tailwind styling (no @tailwindcss/typography dependency)
- Styles: h1, h2, h3, p, ul, ol, li, strong, a, blockquote, code, pre, table, th, td, hr
- Shows "Published: {formatted date}" timestamp (D-19)
- "Back to digest" link at top

### TopNav Component (`app/components/TopNav.tsx`)
- Client component with `usePathname()` for active link detection
- Fixed top navigation: "AI Daily" brand + "Pricing" + "Daily Digest" links
- Active state: `text-sm font-bold text-blue-600`; inactive: `text-sm text-gray-600`
- Pricing uses exact match (`pathname === '/'`), Digest uses prefix match

### Layout Update (`app/layout.tsx`)
- TopNav imported and rendered before `{children}`
- Content wrapped in `<div className="pt-14">` for fixed nav offset

## Dependencies Added

- `react-markdown` 10.1.0 — Markdown-to-React rendering
- `remark-gfm` 4.0.1 — GFM support (tables, strikethrough, task lists)

## Build Results

- `pnpm build` — SUCCESS
- TypeScript compilation — PASS (no errors in plan files)
- Routes generated:
  - `/digest` — dynamic server-rendered (supports searchParams pagination)
  - `/digest/[date]` — SSG with generateStaticParams

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed @ai-sdk/openai type error in article-generator.ts**
- **Found during:** Task 2 (build verification)
- **Issue:** `openai('mimo-v2.5-pro', { baseURL, apiKey })` passed 2 arguments to `openai()` which expects 1
- **Fix:** Changed to use `createOpenAI()` to create a custom provider instance with baseURL/apiKey, then call it with the model ID
- **Files modified:** `src/pipeline/article-generator.ts`
- **Commit:** (pre-existing file from plan 06-02, fixed inline)

### Adaptations

**2. [D-16/D-21] SideNav adapted to TopNav**
- **Reason:** SideNav component does not exist in codebase (finding A1 from RESEARCH.md)
- **Decision:** Created TopNav component instead — provides same navigation functionality (Daily Digest link accessible from all pages) in a simpler, mobile-friendly format

**3. [UI-SPEC] Used components prop instead of @tailwindcss/typography**
- **Reason:** Per UI-SPEC.md decision — explicit, Tailwind-native, no additional plugin dependency
- **Impact:** Markdown elements styled individually via react-markdown's `components` prop

## Known Stubs

None — all components render real data from the database.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-06-04 | app/digest/[date]/page.tsx | Date validated with regex before DB query |
| T-06-05 | app/components/DigestArticle.tsx | react-markdown sanitizes output by default |

Both threats mitigated per plan threat model.

## Self-Check: PASSED

All files exist. All key content assertions verified:
- DigestArticle.tsx uses ReactMarkdown
- TopNav.tsx uses usePathname
- layout.tsx imports TopNav
- digest/page.tsx has ISR revalidate
- digest/[date]/page.tsx has generateStaticParams and notFound
