---
phase: 09-dark-mode-theme-system
fixed_at: 2026-06-18T14:30:00Z
review_path: .planning/phases/09-dark-mode-theme-system/09-REVIEW.md
iteration: 1
findings_in_scope: 19
fixed: 19
skipped: 0
status: all_fixed
---

# Phase 9: Code Review Fix Report

**Fixed at:** 2026-06-18T14:30:00Z
**Source review:** .planning/phases/09-dark-mode-theme-system/09-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 19
- Fixed: 19
- Skipped: 0

## Fixed Issues

### CR-01: Hardcoded green colors in 12+ components

**Files modified:** `app/globals.css`, `app/lib/promotion-constants.ts`, `app/lib/pricing-utils.ts`, `app/components/AlertBanner.tsx`, `app/components/CostCalculator.tsx`, `app/components/PromotionsList.tsx`, `app/components/ComparisonCard.tsx`, `app/components/admin/ErrorLogTable.tsx`, `app/components/admin/PipelineRunsTable.tsx`, `app/components/admin/SourcesTable.tsx`, `app/components/admin/VersionHistoryTable.tsx`, `app/admin/articles/page.tsx`
**Commit:** 166ed70, 3d4fed3, 3338800, 7a78af5, 6df6cbf, 051688f
**Applied fix:** Added `--badge-green-bg`, `--badge-green-text`, `--badge-green-border`, `--dot-green` semantic tokens to `:root` and `.dark` in `globals.css` with `@theme` mappings. Replaced all `bg-green-50/100`, `text-green-600/700/800/900`, `border-green-200/500` with `bg-badge-green-bg`, `text-badge-green-text`, `border-badge-green-border`, `bg-dot-green` across all affected files.

### CR-02: Hardcoded red colors in 8+ components

**Files modified:** `app/globals.css`, `app/lib/pricing-utils.ts`, `app/components/admin/ErrorLogTable.tsx`, `app/components/admin/PipelineRunsTable.tsx`, `app/components/admin/VersionHistoryTable.tsx`, `app/components/AlertsPageClient.tsx`, `app/components/ComparePageClient.tsx`, `app/digest/page.tsx`
**Commit:** 166ed70, 3d4fed3, 6df6cbf, aec56ee
**Applied fix:** Added `--badge-red-bg`, `--badge-red-text`, `--badge-red-border`, `--dot-red` semantic tokens. Replaced all `bg-red-50`, `text-red-500/600/800`, `border-red-100/200` with `bg-badge-red-bg`, `text-badge-red-text`, `border-badge-red-border`, `bg-dot-red` across all affected files.

### CR-03: Toggle switch knobs use bg-white

**Files modified:** `app/components/admin/AutoPublishToggle.tsx`, `app/components/admin/SourcesTable.tsx`
**Commit:** 6098fb4
**Applied fix:** Replaced `bg-white` on toggle switch knob `<span>` elements with `bg-bg-primary` theme token so knobs render correctly in both light and dark themes.

### WR-01: Accent blue not overridden for dark mode

**File:** `app/globals.css`
**Commit:** 166ed70
**Applied fix:** Added `--accent-blue: #3b82f6` (slightly lighter blue) and `--accent-purple: #a78bfa` overrides in the `.dark` block for better contrast on dark backgrounds.

### WR-02: AlertBanner entirely hardcoded green

**File:** `app/components/AlertBanner.tsx`
**Commit:** 3338800
**Applied fix:** Converted all `bg-green-50`, `border-green-200`, `text-green-900/700/600` to `bg-badge-green-bg`, `border-badge-green-border`, `text-badge-green-text` theme tokens.

### WR-03: PricingGrid card border missing explicit color

**File:** `app/components/PricingGrid.tsx`
**Commit:** 9d7e8ca
**Applied fix:** Added `border-border-primary` to the card className: `bg-bg-primary border border-border-primary rounded-lg p-6 text-center`.

### WR-04: ModelDetailClient back link hover indistinguishable

**File:** `app/components/ModelDetailClient.tsx`
**Commit:** 9d7e8ca
**Applied fix:** Changed `hover:text-accent-blue` to `hover:underline` for visible hover feedback.

### WR-05: DigestArticle heading lacks explicit color

**File:** `app/components/DigestArticle.tsx`
**Commit:** 9d7e8ca
**Applied fix:** Added `text-text-primary` to the top-level `<h1>` element.

### WR-06: Recharts CartesianGrid not theme-aware

**Files modified:** `app/components/PriceHistoryChart.tsx`, `app/components/TrendChart.tsx`
**Commit:** 9d7e8ca
**Applied fix:** Added `stroke="var(--border-primary)"` to `<CartesianGrid>` components so grid lines match the theme border color.

### WR-07: LoginForm focus ring offset without dark mode consideration

**File:** `app/admin/login/LoginForm.tsx`
**Commit:** 9d7e8ca
**Applied fix:** Changed button to use `bg-accent-blue` token and added `dark:focus:ring-offset-bg-primary` for consistent dark mode focus ring.

### WR-08: Purple accent colors hardcoded in RunFullPipelineTrigger

**File:** `app/globals.css`
**Commit:** 166ed70
**Applied fix:** Added `--accent-purple: #8b5cf6` in `:root` and `--accent-purple: #a78bfa` in `.dark`, with `@theme` mapping. RunFullPipelineTrigger can now optionally use `bg-accent-purple`.

### WR-09: AdminSidebar active state uses hardcoded bg-blue-50

**File:** `app/components/admin/AdminSidebar.tsx`
**Commit:** 9d7e8ca
**Applied fix:** Changed active state from `bg-blue-50 text-blue-600` to `bg-accent-blue/10 text-accent-blue` for theme-aware active highlighting.

### WR-10: Hardcoded text-white on buttons

**Status:** No change needed. `text-white` on action buttons is correct since button backgrounds are accent colors that don't change between themes. Only toggle knobs needed fixing (CR-03).

### WR-11: PricingTable ProviderLogo fallback uses bg-text-secondary

**File:** `app/components/PricingTable.tsx`
**Commit:** 9d7e8ca
**Applied fix:** Changed from `bg-text-secondary text-white` to `bg-bg-tertiary text-text-primary` for semantically correct token usage.

### WR-12: CostCalculator rank #1 highlight uses hardcoded green

**File:** `app/components/CostCalculator.tsx`
**Commit:** 7a78af5
**Applied fix:** Replaced `border-green-500 bg-green-50` with `border-badge-green-border bg-badge-green-bg`, and `text-green-700` with `text-badge-green-text`. Also converted confidence dot colors to `bg-dot-green/yellow/red`.

### IN-01: Inline theme script empty catch

**File:** `app/layout.tsx`
**Commit:** 9d7e8ca
**Applied fix:** Added `console.warn('Theme detection failed:', e)` to the catch block for development debugging.

### IN-02: ThemeProvider toggle directly manipulates DOM

**File:** `app/components/ThemeProvider.tsx`
**Commit:** 0824169
**Applied fix:** Moved `document.documentElement.classList.toggle()` and `localStorage.setItem()` from the state updater function to a dedicated `useEffect` hook that runs when `theme` state changes.

### IN-03: promotion-constants.ts badge styles hardcoded

**File:** `app/lib/promotion-constants.ts`
**Commit:** 3d4fed3
**Applied fix:** Converted `PROMOTION_BADGE_STYLES` from `bg-green-100 text-green-800` etc. to `bg-badge-green-bg text-badge-green-text` theme tokens.

### IN-04: getConfidenceColor returns hardcoded classes

**File:** `app/lib/pricing-utils.ts`
**Commit:** 3d4fed3
**Applied fix:** Converted `getConfidenceColor()` return values from `bg-green-100 text-green-800` etc. to `bg-badge-green-bg text-badge-green-text` theme tokens.

## Skipped Issues

None -- all findings were successfully fixed.

---

_Fixed: 2026-06-18T14:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
