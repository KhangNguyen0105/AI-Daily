---
phase: 9-dark-mode-theme-system
plan: 05
subsystem: ui
tags: [tailwind, dark-mode, css-variables, theme-tokens, color-conversion, admin]

requires:
  - phase: 9-dark-mode-theme-system
    provides: "Theme foundation with CSS tokens, ThemeProvider, ThemeToggle (09-01)"
provides:
  - Admin layout components fully converted to theme tokens (AdminHeader, AdminSidebar, admin/layout.tsx)
  - All admin pages fully converted to theme tokens (overview, login, articles, edit, pipeline, sources)
  - No hardcoded bg-white, text-gray-*, border-gray-* remain in admin layout/pages
affects: [09-06]

tech-stack:
  added: []
  patterns:
    - "Admin shell conversion: layout background, sidebar, header all use theme tokens"
    - "Login page conversion: card background, form inputs, labels all themed"
    - "Large admin file conversion: EditArticleClient with 23 occurrences handled systematically"

key-files:
  created: []
  modified:
    - app/admin/layout.tsx
    - app/admin/page.tsx
    - app/admin/login/page.tsx
    - app/admin/login/LoginForm.tsx
    - app/admin/articles/page.tsx
    - app/admin/articles/[id]/edit/EditArticleClient.tsx
    - app/admin/pipeline/page.tsx
    - app/admin/sources/page.tsx
    - app/components/admin/AdminHeader.tsx
    - app/components/admin/AdminSidebar.tsx

key-decisions:
  - "bg-gray-50 in admin layout mapped to bg-bg-secondary (consistent with sidebar/header pattern)"
  - "Draft badge bg-gray-100 mapped to bg-bg-tertiary for inactive state"
  - "Accent colors (bg-green-100 text-green-800 for Published badge, text-blue-600 for links) left unchanged per D-04"
  - "focus:ring-blue-600 and focus:border-transparent left unchanged — accent colors are theme-invariant"

patterns-established:
  - "Admin layout shell: bg-bg-secondary for main area, bg-bg-secondary for sidebar and header"
  - "Color replacement pattern applied consistently across all admin files: bg-white -> bg-bg-primary, bg-gray-50 -> bg-bg-secondary, bg-gray-100 -> bg-bg-tertiary"
  - "Text replacement pattern: text-gray-900 -> text-text-primary, text-gray-700 -> text-text-secondary, text-gray-600 -> text-text-secondary, text-gray-500 -> text-text-secondary, text-gray-400 -> text-text-tertiary"
  - "Border replacement pattern: border-gray-200 -> border-border-primary, border-gray-300 -> border-border-secondary"

requirements-completed: [UI-02]

duration: 6min
completed: 2026-06-18
status: complete
---

# Plan 09-05: Admin Layout and Pages Color Conversion Summary

**Admin layout, sidebar, header, and all admin pages converted from hardcoded Tailwind gray/white classes to semantic theme token classes for dual-theme support**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-06-18T22:30:00Z
- **Completed:** 2026-06-18T22:36:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Admin layout.tsx: main area background converted from bg-gray-50 to bg-bg-secondary
- AdminHeader.tsx: 4 hardcoded color classes replaced — header background, title text, bottom border, subtitle text
- AdminSidebar.tsx: 4 hardcoded color classes replaced — sidebar background, border, link text, active link text
- admin/page.tsx: 2 hardcoded color classes replaced — page title and section heading
- admin/login/page.tsx: 5 hardcoded color classes replaced — page background, card background, title, subtitle, card border
- admin/login/LoginForm.tsx: 3 hardcoded color classes replaced — label text, input border, password toggle icon
- admin/articles/page.tsx: 14 hardcoded color classes replaced — title, count, empty state, table header, row borders, cell text, status badges
- EditArticleClient.tsx: 23 hardcoded color classes replaced — tab bar, preview section, sources table, version history
- admin/pipeline/page.tsx: 5 hardcoded color classes replaced — loading state, page title, section headings
- admin/sources/page.tsx: 3 hardcoded color classes replaced — loading state, page title, count badge

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert Admin Layout Components (AdminHeader, AdminSidebar, admin/layout.tsx)** - `a6a59ae` (feat)
2. **Task 2: Convert Admin Pages (overview, login, articles, pipeline, sources)** - `1ae03e4` (feat)

## Files Created/Modified
- `app/admin/layout.tsx` - Admin shell main area background converted
- `app/components/admin/AdminHeader.tsx` - Header background, title, border, subtitle converted
- `app/components/admin/AdminSidebar.tsx` - Sidebar background, border, link text converted
- `app/admin/page.tsx` - Dashboard overview title and section heading converted
- `app/admin/login/page.tsx` - Login page background, card, title, subtitle converted
- `app/admin/login/LoginForm.tsx` - Form label, input border, password toggle converted
- `app/admin/articles/page.tsx` - Articles list with table, badges, empty state converted
- `app/admin/articles/[id]/edit/EditArticleClient.tsx` - Article editor with tabs, sources table, version history converted
- `app/admin/pipeline/page.tsx` - Pipeline monitor with loading state and section headings converted
- `app/admin/sources/page.tsx` - Sources page with loading state and title converted

## Decisions Made
- Admin layout main area uses `bg-bg-secondary` (consistent with sidebar and header using the same token)
- Draft badge uses `bg-bg-tertiary text-text-secondary` for inactive state
- Accent colors (Published badge green, link blue, focus rings) left unchanged per plan decision D-04
- All `text-gray-700` label instances mapped to `text-text-secondary` for consistency with established pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All admin layout and page components now use theme tokens — render correctly in both light and dark themes
- Remaining plan (09-06) can follow the same color mapping pattern
- Admin dashboard fully themed: overview, articles, article editor, pipeline monitor, sources management
- Login page renders correctly in both themes

---
*Phase: 9-dark-mode-theme-system*
*Completed: 2026-06-18*
