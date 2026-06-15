# Phase 8: Admin Operations - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers a secure admin dashboard for monitoring the data pipeline, managing published content, controlling data quality, and managing provider sources. The admin can authenticate, view pipeline health, edit/rollback articles, trigger re-crawls and article regeneration, toggle auto-publish for low-confidence items, and manage source trust status.

**In scope:** Admin authentication (NextAuth.js Credentials + JWT), admin dashboard with sidebar navigation, pipeline monitoring (runs table with stats), article editing (Markdown textarea + preview) with version history for rollback, source management (trusted/untrusted toggle), pipeline control actions (re-crawl provider, regenerate article), auto-publish toggle for low-confidence items, error log display.

**Out of scope:** Visitor accounts or registration (v1 constraint), email notifications, Bull Board integration, rich text editor, real-time WebSocket monitoring, admin user management (single admin only).

</domain>

<decisions>
## Implementation Decisions

### Authentication & Session (ADMN-09)

- **D-01:** NextAuth.js Credentials provider with JWT sessions — no database sessions table. Standard App Router setup.
- **D-02:** Admin password stored in `ADMIN_PASSWORD` environment variable. Change password = update env var + restart.
- **D-03:** 8-hour session expiry. Admin re-logs in next day. Standard workday length.
- **D-04:** Custom `/admin/login` page with minimal branded design. Matches site's Tailwind styling. Not NextAuth's built-in sign-in page.
- **D-05:** Next.js middleware (`middleware.ts`) protects both `/admin/*` pages AND `/api/admin/*` API routes. Unauthenticated requests redirect to `/admin/login` (pages) or return 401 (API).
- **D-06:** `NEXTAUTH_SECRET` in `.env` file. Required for JWT signing. Documented in setup instructions.
- **D-07:** Logout button in admin header. Calls NextAuth `signOut()` and redirects to `/admin/login`.
- **D-08:** "Admin" label in header — no custom display name. Minimal for single-admin system.
- **D-09:** Standard NextAuth catch-all route at `app/api/auth/[...nextauth]/route.ts`.
- **D-10:** Simple "Invalid password" error message on failed login. No rate limiting — acceptable for single-admin with strong password.
- **D-11:** Single `auth.ts` config file at project root with NextAuth configuration (providers, session, callbacks).
- **D-12:** Use NextAuth's `auth()` in server components and `useSession()` in client components. Built-in TypeScript types extended with admin role.
- **D-13:** Redirect to `/admin` after successful login (not original destination).

### Dashboard Layout & Routing

- **D-14:** Flat `/admin/*` routes: `/admin` (overview), `/admin/articles`, `/admin/pipeline`, `/admin/sources`. Each is a separate page. Bookmarkable, simple.
- **D-15:** Dedicated admin layout (`app/admin/layout.tsx`) with sidebar navigation (Overview, Articles, Pipeline, Sources) and header with "Admin" label + logout button. Separate from public site layout.
- **D-16:** Overview page (`/admin`) shows summary cards (last pipeline run status, total models tracked, total articles published) plus quick action links to other sections.
- **D-17:** Sidebar navigation with current page highlighting. Collapses to hamburger on mobile.
- **D-18:** Mobile-friendly responsive design. Sidebar collapses, tables scroll horizontally.
- **D-19:** No "Admin" link in public site's TopNav. Admin navigates to `/admin` directly.

### Article Editing & Rollback (ADMN-01, ADMN-02, ADMN-03)

- **D-20:** Markdown textarea with preview tab for article editing. Articles are already stored as Markdown — no format conversion needed.
- **D-21:** New `article_versions` table: `id`, `article_id`, `content`, `title`, `created_at`. Every edit creates a version before updating the article. Rollback = restore from version.
- **D-22:** Admin can edit title, summary, and content. All three are form fields on the edit page.
- **D-23:** Dedicated edit page at `/admin/articles/[id]/edit`. Click "Edit" on article list → edit page with form. Save creates version and updates article.

### Pipeline Control & Monitoring (ADMN-05, ADMN-06, ADMN-07, ADMN-08)

- **D-24:** Pipeline runs table on `/admin/pipeline` page. Shows status, duration, stats (succeeded/failed providers) from `pipelineRuns` table. Click row to expand and see per-provider breakdown.
- **D-25:** Action buttons on pipeline page: "Re-crawl provider" (dropdown to select provider + trigger button) and "Regenerate article" (date picker + trigger button). Both enqueue BullMQ jobs.
- **D-26:** Auto-publish toggle on pipeline page. When disabled, low-confidence extractions are flagged but not auto-published. Stored in a new `admin_settings` DB table.
- **D-27:** Error log table showing recent failures from pipeline runs (timestamp, provider, error message). Uses existing `pipelineRuns.stats` data.

### Source Management (ADMN-04)

- **D-28:** Sources table on `/admin/sources` page. Columns: name, provider type, status (active/inactive), last crawled. Toggle switch to mark trusted/untrusted (maps to existing `isActive` field).
- **D-29:** Expandable row details for each source showing URL, provider type, crawl history, extraction count.
- **D-30:** Filter sources by status (all, active, inactive) and by provider type.

### Claude's Discretion

- Admin sidebar styling (colors, hover states) — follow existing Tailwind theme tokens
- Table styling for pipeline runs, sources, error logs — follow existing PricingTable patterns
- Form styling for article editing — follow existing form patterns
- Loading states for all admin pages
- Empty states for all admin tables
- Confirmation dialogs for destructive actions (rollback, re-crawl)
- Toast notifications for action success/failure
- Admin settings table schema design (for auto-publish toggle)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema
- `src/db/schema.ts` — Existing tables: `sources` (with `isActive`), `pipelineRuns` (with `status`, `stats`), `articles` (with `content`, `date`, `publishedAt`). New tables needed: `article_versions`, `admin_settings`.
- `drizzle.config.ts` — Drizzle Kit configuration for migrations.

### Pipeline Infrastructure
- `src/pipeline/queues.ts` — BullMQ queue definitions (collect, extract, score, generate). Re-crawl and regenerate actions enqueue jobs here.
- `src/pipeline/orchestrator.ts` — `orchestrateDailyRun()` function and `PipelineStats` interface. Source of pipeline run data.
- `src/pipeline/workers/collect.ts` — Collect worker. Re-crawl trigger enqueues a collect job.
- `src/pipeline/workers/generate.ts` — Generate worker. Regenerate trigger enqueues a generate job.

### Existing Components (patterns to follow)
- `app/components/PricingTable.tsx` — TanStack Table with sorting/filtering. Pattern for admin data tables.
- `app/components/TopNav.tsx` — Navigation pattern. Admin sidebar follows similar active-link detection.
- `app/components/HomePageClient.tsx` — Client wrapper pattern. Admin pages follow same server→client data flow.

### Existing Pages (patterns to follow)
- `app/page.tsx` — Server component with Drizzle query and ISR pattern.
- `app/digest/page.tsx` — Archive list with pagination. Pattern for article list page.
- `app/digest/[date]/page.tsx` — Article detail with SSG. Pattern for article edit page.

### Design System
- `app/globals.css` — Tailwind v4 `@theme` tokens. All admin styling uses these tokens.
- `app/layout.tsx` — Root layout with TopNav. Admin layout is separate but follows same structure.

### Requirements
- `REQUIREMENTS.md` § ADMN-01 through ADMN-09 — Phase 8 requirements.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pipelineRuns` table: Already tracks status, stats (JSONB with per-provider breakdown), timestamps. Direct data source for pipeline monitoring.
- `sources` table: Already has `isActive` field (integer 0/1). Maps to trusted/untrusted toggle.
- `articles` table: Already has `content` (text), `title`, `summary`, `date`, `publishedAt`. Direct data source for article editing.
- BullMQ queues (collect, extract, score, generate): Already wired. Re-crawl and regenerate actions enqueue jobs directly.
- `PipelineStats` interface: Defines the stats structure stored in `pipelineRuns.stats`. Used to display pipeline monitoring data.
- TanStack Table: Already used in PricingTable. Direct reuse for admin data tables.
- Tailwind v4 @theme tokens: All design tokens available for admin styling.

### Established Patterns
- Server component fetches data, passes to client component (page.tsx → ClientComponent)
- Drizzle queries with try/catch fallback for DB unavailability
- ISR with `revalidate = 60` for periodic refresh (not needed for admin — admin pages are dynamic)
- TanStack Table for data tables with sorting/filtering
- Tailwind v4 @theme tokens for all styling

### Integration Points
- `app/admin/` — New directory for all admin routes
- `app/admin/layout.tsx` — Admin layout with sidebar
- `app/api/auth/[...nextauth]/route.ts` — NextAuth catch-all route
- `middleware.ts` — Route protection for /admin/* and /api/admin/*
- `auth.ts` — NextAuth configuration
- `src/db/schema.ts` — New tables: `article_versions`, `admin_settings`
- `src/pipeline/queues.ts` — Enqueue jobs for re-crawl and regenerate

</code_context>

<specifics>
## Specific Ideas

- Admin dashboard should feel like a clean, functional back-office — not a consumer UI. Prioritize clarity and speed over visual flair.
- Article editing with Markdown textarea + preview is the right call — the admin is likely technical and comfortable with Markdown.
- Version history table is clean and queryable — better than JSONB for rollback use case.
- Pipeline monitoring should show what's actionable: which providers failed, when, and why. Not just a status dashboard.
- Source management toggle should have immediate visual feedback — toggle off, source stops being crawled next run.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 8-Admin Operations*
*Context gathered: 2026-06-15*
