# Phase 8: Admin Operations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 8-Admin Operations
**Areas discussed:** Auth & session strategy, Dashboard layout & routing, Article editing & rollback, Pipeline control & monitoring, Source management

---

## Auth & Session Strategy

### Q1: Auth method

| Option | Description | Selected |
|--------|-------------|----------|
| NextAuth Credentials + JWT | Standard NextAuth.js setup with credential provider. Admin enters password, gets a JWT session. Middleware protects /admin/* routes. No DB sessions table needed. | ✓ |
| NextAuth Credentials + DB sessions | Same login flow but sessions stored in PostgreSQL. Can invalidate sessions server-side. Needs a sessions table. | |
| Simple middleware + env var | Skip NextAuth entirely. A single API route sets an httpOnly cookie on correct password. Minimal dependencies but less standard. | |

**User's choice:** NextAuth Credentials + JWT

### Q2: Password storage

| Option | Description | Selected |
|--------|-------------|----------|
| Environment variable | ADMIN_PASSWORD stored in .env. Simple, standard for single-admin setups. Change password = update env var + restart. | ✓ |
| Database-stored hash | Password hashed and stored in a DB table. Can change password without restart. Adds complexity for a single-admin use case. | |

**User's choice:** Environment variable

### Q3: Session duration

| Option | Description | Selected |
|--------|-------------|----------|
| 8 hours | Session expires after 8 hours of inactivity. Standard workday length. Admin re-logs in next day. | ✓ |
| 24 hours | Session expires after 24 hours. Convenient for daily checks. Less secure if admin forgets to log out. | |
| 7 days | Session lasts 7 days. Very convenient but less secure. | |

**User's choice:** 8 hours

### Q4: Login page

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal branded page | Simple /admin/login page with password field. Matches the rest of the site's Tailwind styling. | ✓ |
| Modal overlay on /admin | Same login but shown as a modal/dialog overlay when accessing /admin without auth. | |

**User's choice:** Minimal branded page

### Q5: Route guard

| Option | Description | Selected |
|--------|-------------|----------|
| Next.js middleware | middleware.ts intercepts all /admin/* requests, checks session, redirects to /admin/login if unauthenticated. | ✓ |
| Per-page server component check | Each admin page checks session in its server component and redirects if unauthenticated. | |

**User's choice:** Next.js middleware

### Q6: NEXTAUTH_SECRET

| Option | Description | Selected |
|--------|-------------|----------|
| Env var | NEXTAUTH_SECRET in .env file, required for JWT signing. Standard NextAuth pattern. | ✓ |
| Auto-generate on first run | Auto-generate a secret on first run and store it. More convenient but less standard. | |

**User's choice:** Env var

### Q7: Logout

| Option | Description | Selected |
|--------|-------------|----------|
| Logout button in admin header | Logout link in admin sidebar/header. Clicking it calls signOut() and redirects to /admin/login. | ✓ |
| No logout — session expires naturally | No explicit logout button. Session expires after 8 hours. | |

**User's choice:** Logout button in admin header

### Q8: Admin identity

| Option | Description | Selected |
|--------|-------------|----------|
| "Admin" label | Just show 'Admin' in the header. No user profile, no avatar. | ✓ |
| Custom display name via env var | ADMIN_NAME env var lets the admin customize their display name. | |

**User's choice:** "Admin" label

### Q9: API routes

| Option | Description | Selected |
|--------|-------------|----------|
| Standard NextAuth route | app/api/auth/[...nextauth]/route.ts. Handles login, logout, session. One file. | ✓ |
| Custom auth API routes | Custom API route for login + separate session check endpoint. | |

**User's choice:** Standard NextAuth route

### Q10: Login errors

| Option | Description | Selected |
|--------|-------------|----------|
| Simple error message | Show 'Invalid password' on the login page. No rate limiting. | ✓ |
| Generic error + rate limiting | Show generic 'Invalid credentials' and add rate limiting. | |

**User's choice:** Simple error message

### Q11: API protection

| Option | Description | Selected |
|--------|-------------|----------|
| Protect both pages and API routes | Middleware protects both /admin/* pages AND /api/admin/* API routes. | ✓ |
| Pages only — API routes self-check | Middleware only protects pages. API routes check auth individually. | |

**User's choice:** Protect both pages and API routes

### Q12: Config file

| Option | Description | Selected |
|--------|-------------|----------|
| Single auth.ts | Single auth.ts file at project root with NextAuth config. Clean, standard pattern. | ✓ |
| Split config files | Split into auth.ts (config) + auth-options.ts (provider setup). | |

**User's choice:** Single auth.ts

### Q13: Session access

| Option | Description | Selected |
|--------|-------------|----------|
| NextAuth helpers | Use auth() in server components, useSession() in client components. Standard pattern. | ✓ |
| Custom session wrapper | Custom wrapper around NextAuth's session. | |

**User's choice:** NextAuth helpers

### Q14: Auth types

| Option | Description | Selected |
|--------|-------------|----------|
| Built-in types | Use NextAuth's built-in TypeScript types. Extend session type with admin role. | ✓ |
| Custom type definitions | Create custom types for admin session. | |

**User's choice:** Built-in types

### Q15: Sign-in page

| Option | Description | Selected |
|--------|-------------|----------|
| Custom login page | Custom /admin/login page that calls signIn(). Full control over design. | ✓ |
| NextAuth built-in page | NextAuth's built-in sign-in page at /api/auth/signin. | |

**User's choice:** Custom login page

### Q16: Post-login redirect

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to /admin | After successful login, redirect to /admin (dashboard overview). | ✓ |
| Redirect to original destination | After login, redirect to the page the admin originally tried to access. | |

**User's choice:** Redirect to /admin

---

## Dashboard Layout & Routing

### Q1: Route structure

| Option | Description | Selected |
|--------|-------------|----------|
| Flat /admin/* routes | /admin (overview), /admin/articles, /admin/pipeline, /admin/sources. Each is a separate page. | ✓ |
| Nested with detail routes | Nested routes: /admin/articles/[id]/edit for article editing. | |
| Single page with tabs | Single /admin page with tabs for all sections. | |

**User's choice:** Flat /admin/* routes

### Q2: Admin layout

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated admin layout | Admin gets its own layout.tsx with sidebar nav and header. Separate from public site layout. | ✓ |
| Shared TopNav + admin sidebar | Admin pages use the same TopNav as the public site but add an admin sidebar. | |

**User's choice:** Dedicated admin layout

### Q3: Overview page

| Option | Description | Selected |
|--------|-------------|----------|
| Summary cards + quick actions | Overview shows: last pipeline run status, total models tracked, total articles published, quick action links. | ✓ |
| Navigation links only | Overview shows just links to the other sections. | |
| Detailed stats dashboard | Overview shows detailed stats: pipeline runs over time, extraction counts by confidence. | |

**User's choice:** Summary cards + quick actions

### Q4: Admin navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar navigation | Sidebar with: Overview, Articles, Pipeline, Sources. Highlight current page. Collapse on mobile. | ✓ |
| Top tabs | Top tabs under the admin header. | |
| Breadcrumbs only | Breadcrumb navigation at the top of each page. | |

**User's choice:** Sidebar navigation

### Q5: Responsive

| Option | Description | Selected |
|--------|-------------|----------|
| Mobile-friendly | Admin dashboard works on mobile. Sidebar collapses to hamburger menu. Tables scroll horizontally. | ✓ |
| Desktop-only | Admin dashboard is desktop-only. Show message on mobile suggesting to use desktop. | |

**User's choice:** Mobile-friendly

### Q6: Admin link in public nav

| Option | Description | Selected |
|--------|-------------|----------|
| No admin link in public nav | No 'Admin' link in the public TopNav. Admin navigates to /admin directly. | ✓ |
| Small admin link in public nav | Small 'Admin' link in the public TopNav footer or corner. | |

**User's choice:** No admin link in public nav

---

## Article Editing & Rollback

### Q1: Editor

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown textarea + preview | Simple textarea for Markdown editing. Preview tab shows rendered output. No new dependencies. | ✓ |
| Rich text editor (Tiptap) | WYSIWYG editing with formatting toolbar. New dependency. | |
| Field-level form edits | Edit specific fields (title, summary, content) as separate form inputs. | |

**User's choice:** Markdown textarea + preview

### Q2: Rollback

| Option | Description | Selected |
|--------|-------------|----------|
| Version history table | New article_versions table. Every edit creates a version. Rollback = restore from version. | ✓ |
| JSONB versions column | Add versions JSONB array to articles table. | |
| Bounded version history | Only keep last N versions in a separate table. | |

**User's choice:** Version history table

### Q3: Edit scope

| Option | Description | Selected |
|--------|-------------|----------|
| Edit all fields | Admin can edit title, summary, and content. All three are form fields. | ✓ |
| Content only — title/summary locked | Admin can only edit content. Title and summary are read-only. | |

**User's choice:** Edit all fields

### Q4: Edit flow

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated edit page | Click 'Edit' on article list → /admin/articles/[id]/edit page with form. | ✓ |
| Inline editing on article page | Click 'Edit' on article detail → inline editing on the same page. | |

**User's choice:** Dedicated edit page

---

## Pipeline Control & Monitoring

### Q1: Monitoring

| Option | Description | Selected |
|--------|-------------|----------|
| Pipeline runs table | Table of recent pipeline runs. Shows status, duration, stats. Click to expand per-provider breakdown. | ✓ |
| Table + real-time BullMQ status | Same table plus real-time BullMQ job status. | |
| Bull Board integration | Integrate Bull Board as a separate /admin/bullmq route. | |

**User's choice:** Pipeline runs table

### Q2: Controls location

| Option | Description | Selected |
|--------|-------------|----------|
| Action buttons on pipeline page | Buttons on the pipeline page: 'Trigger re-crawl', 'Regenerate article'. | ✓ |
| Quick actions on overview page | Same buttons but on the /admin overview page. | |
| Both pages | Buttons on both overview and pipeline pages. | |

**User's choice:** Action buttons on pipeline page

### Q3: Re-crawl trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Provider selector + trigger button | Dropdown to select a provider, then click 'Re-crawl'. Enqueues a collect job. | ✓ |
| Provider list with individual buttons | List of all providers with a 'Re-crawl' button next to each. | |

**User's choice:** Provider selector + trigger button

### Q4: Regenerate trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Date picker + trigger button | Date picker to select a date, then click 'Regenerate'. Enqueues a generate job. | ✓ |
| Article list with regenerate buttons | List of recent articles with a 'Regenerate' button next to each. | |

**User's choice:** Date picker + trigger button

### Q5: Auto-publish toggle

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle on pipeline page | Toggle on the pipeline page. When disabled, low-confidence items are flagged but not auto-published. | ✓ |
| Environment variable config | Config in .env file. Requires restart to change. | |
| Database setting | Setting stored in admin_settings DB table. Persistent, changeable without restart. | |

**User's choice:** Toggle on pipeline page (stored in DB)

### Q6: Error logs

| Option | Description | Selected |
|--------|-------------|----------|
| Error log table | Show recent errors from pipeline runs. Simple table with timestamp, provider, error message. | ✓ |
| Error log + run details link | Same table plus link to the raw pipeline run details. | |
| Real-time error stream | Real-time error streaming from BullMQ. | |

**User's choice:** Error log table

### Q7: Run details

| Option | Description | Selected |
|--------|-------------|----------|
| Expandable row details | Click a pipeline run row to see details: per-provider status, extraction counts. | ✓ |
| Dedicated detail page | Click a pipeline run row to go to /admin/pipeline/[id] detail page. | |
| Summary table only | No detail view — just the summary table. | |

**User's choice:** Expandable row details

---

## Source Management

### Q1: Sources page

| Option | Description | Selected |
|--------|-------------|----------|
| Sources table with toggle | Table of all sources. Columns: name, provider type, status, last crawled. Toggle to mark trusted/untrusted. | ✓ |
| Sources table + re-crawl buttons | Same table plus 'Re-crawl' button per source. | |
| Card grid layout | Card grid showing each source with status, last crawled, and trust toggle. | |

**User's choice:** Sources table with toggle

### Q2: Trust toggle

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle switch | Toggle switch next to each source. When toggled off, source is excluded from future crawls. | ✓ |
| Three-state dropdown | Dropdown with 'Trusted', 'Untrusted', 'Pending' states. | |
| Checkbox | Checkbox to mark as trusted. | |

**User's choice:** Toggle switch

### Q3: Source details

| Option | Description | Selected |
|--------|-------------|----------|
| Expandable row details | Click a source row to see details: URL, provider type, crawl history, extraction count. | ✓ |
| Dedicated detail page | Click a source row to go to /admin/sources/[id] detail page. | |
| Summary table only | No detail view — just the summary table. | |

**User's choice:** Expandable row details

### Q4: Source filter

| Option | Description | Selected |
|--------|-------------|----------|
| Status + provider type filters | Filter sources by status (all, active, inactive) and by provider type. | ✓ |
| Search by name only | Search box to filter by source name. | |
| Filters + search | Both filters and search. | |

**User's choice:** Status + provider type filters

---

## Claude's Discretion

- Admin sidebar styling (colors, hover states) — follow existing Tailwind theme tokens
- Table styling for pipeline runs, sources, error logs — follow existing PricingTable patterns
- Form styling for article editing — follow existing form patterns
- Loading states for all admin pages
- Empty states for all admin tables
- Confirmation dialogs for destructive actions (rollback, re-crawl)
- Toast notifications for action success/failure
- Admin settings table schema design (for auto-publish toggle)

## Deferred Ideas

None — discussion stayed within phase scope.
