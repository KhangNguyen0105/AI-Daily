# Research: Phase 8 — Admin Operations

## 1. NextAuth.js v5 with Credentials Provider

**Status:** `next-auth` is NOT in `package.json` — must be installed.

**Pattern (Next.js App Router + Credentials):**
- Create `src/auth.ts` with `NextAuth()` config using `CredentialsProvider`
- Credentials provider: single admin password from `process.env.ADMIN_PASSWORD`
- JWT session strategy (no DB sessions table needed)
- Session maxAge: 8 hours (28800s)
- Custom login page at `/admin/login` (overrides default NextAuth pages)

**Key files to create:**
- `src/auth.ts` — NextAuth config with Credentials provider
- `app/api/auth/[...nextauth]/route.ts` — NextAuth API route handler
- `middleware.ts` — Route protection for `/admin/*` and `/api/admin/*`

**Auth helpers:**
- `auth()` server helper for server components and API routes
- `useSession()` client hook for client components
- `signIn()` / `signOut()` for login/logout actions

**Dependencies to install:**
- `next-auth@5` (v5 beta/ stable for App Router support)
- `@auth/drizzle-adapter` (optional — not needed for JWT-only sessions)

**Reference:** https://next-auth.js.org/configuration/providers/credentials
**Reference:** https://next-auth.js.org/getting-started/example#app-router

---

## 2. Next.js Middleware for Route Protection

**Status:** No `middleware.ts` exists — must be created from scratch.

**Pattern:**
```ts
// middleware.ts (project root)
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
```

This protects all `/admin/*` pages and `/api/admin/*` API routes. Unauthenticated requests redirect to `/admin/login`.

**Alternative (custom middleware with more control):**
```ts
import { auth } from "@/src/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
});
```

---

## 3. Database Schema Extensions

### article_versions table (new)
```ts
export const articleVersions = pgTable('article_versions', {
  id: serial('id').primaryKey(),
  articleId: integer('article_id').references(() => articles.id).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  summary: varchar('summary', { length: 500 }),
  content: text('content').notNull(),
  version: integer('version').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Pattern:** On article save, INSERT current version into `article_versions` BEFORE updating `articles`. Version number = MAX(version) + 1 for that article.

### admin_settings table (new)
```ts
export const adminSettings = pgTable('admin_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).unique().notNull(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Pattern:** Key-value store for admin settings. `auto_publish` key with value `"true"` or `"false"`.

---

## 4. Existing Codebase Patterns to Reuse

### TanStack Table Pattern (from PricingTable.tsx)
- `createColumnHelper<T>()` for type-safe column definitions
- `useReactTable()` with `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel`
- `flexRender()` for cell rendering
- Responsive column visibility via `getColumnResponsiveClass()`
- Module-level row model factories (not per-render)

### Server/Client Component Pattern (from page.tsx)
- Server component: async function, fetches data from DB, passes to client component
- Client component: `'use client'`, receives data as props, handles interactivity
- `revalidate` export for ISR caching

### Drizzle Query Pattern
- `db.select().from().leftJoin().orderBy()` for JOINs
- `eq()`, `desc()`, `sql` from drizzle-orm
- `.returning()` for INSERT/UPDATE operations

### Date Formatting (date-fns)
- `format(date, 'MMM d, yyyy h:mm a')` for display
- Already in dependencies

### Markdown Rendering (react-markdown + remark-gfm)
- `react-markdown` and `remark-gfm` already in `package.json`
- Can reuse for article preview in edit form

---

## 5. BullMQ Manual Trigger Patterns

### Re-crawl a specific provider
```ts
import { collectQueue } from '@/src/pipeline/queues';

await collectQueue.add('collect', {
  providerName: selectedProvider,
  pipelineRunId: null, // manual trigger, not part of daily run
});
```

### Regenerate article for a specific date
```ts
import { generateQueue } from '@/src/pipeline/queues';

await generateQueue.add('generate', {
  date: selectedDate, // 'YYYY-MM-DD'
  force: true, // bypass auto-publish check
});
```

**Note:** The queue definitions in `src/pipeline/queues.ts` use `createQueue()` with standard config. Manual triggers use the same queues — just add jobs directly.

---

## 6. UI Component Patterns

### Toggle Switch (from UI-SPEC.md)
- `<button role="switch" aria-checked={checked}>`
- 44px minimum touch target
- Optimistic UI: toggle immediately, revert on failure
- Toast notification on success/failure

### Expandable Table Rows (from UI-SPEC.md)
- Click row or chevron to expand
- Only one row expanded at a time
- Chevron rotates 180° when expanded
- `max-height` transition, 150ms ease

### Confirmation Dialog (from UI-SPEC.md)
- Modal overlay (fixed, bg-black/50)
- Centered card (max-w-md)
- Action-specific confirm button text
- Escape/backdrop to dismiss
- Focus trap

### Toast Notifications (from UI-SPEC.md)
- Fixed bottom-right (bottom-6 right-6)
- Auto-dismiss 5 seconds
- Max 3 visible, queue additional
- Green left border (success), red left border (error)

---

## 7. File Structure Plan

```
src/
  auth.ts                          # NextAuth config
  db/schema.ts                     # Add articleVersions, adminSettings tables
  
middleware.ts                      # Route protection

app/
  api/auth/[...nextauth]/route.ts  # NextAuth API route
  api/admin/                       # Admin API routes
    articles/[id]/route.ts         # GET/PUT article
    articles/[id]/versions/route.ts # GET versions, POST rollback
    pipeline/re-crawl/route.ts     # POST re-crawl trigger
    pipeline/regenerate/route.ts   # POST regenerate trigger
    pipeline/runs/route.ts         # GET pipeline runs
    sources/[id]/trust/route.ts    # PATCH trust toggle
    settings/route.ts              # GET/PUT admin settings
  admin/
    layout.tsx                     # AdminLayout (sidebar + header)
    login/page.tsx                 # Login page
    page.tsx                       # Overview dashboard
    articles/page.tsx              # Articles list
    articles/[id]/edit/page.tsx    # Article edit
    pipeline/page.tsx              # Pipeline monitoring
    sources/page.tsx               # Source management
  components/admin/
    AdminHeader.tsx
    AdminSidebar.tsx
    ArticleEditForm.tsx
    AutoPublishToggle.tsx
    ConfirmDialog.tsx
    ErrorLogTable.tsx
    PipelineRunsTable.tsx
    RegenerateTrigger.tsx
    ReCrawlTrigger.tsx
    SourcesTable.tsx
    SummaryCard.tsx
    Toast.tsx
    VersionHistoryTable.tsx
```

---

## 8. External Documentation

- NextAuth.js v5: https://next-auth.js.org/getting-started/example#app-router
- NextAuth Credentials: https://next-auth.js.org/configuration/providers/credentials
- NextAuth Middleware: https://next-auth.js.org/configuration/nextjs#middleware
- BullMQ Job Addition: https://docs.bullmq.io/guide/jobs
- Drizzle JSONB: https://orm.drizzle.team/docs/column-types/jsonb
- react-markdown: https://github.com/remarkjs/react-markdown
