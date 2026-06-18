# Phase 8: Admin Operations - Pattern Map

**Mapped:** 2026-06-16
**Files analyzed:** 35 (admin UI already implemented)
**Analogs found:** 35 / 35

## File Classification

| File | Role | Data Flow | Pattern Source | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/auth.ts` | config (auth) | request-response | NextAuth.js v5 Credentials provider | exact |
| `middleware.ts` | middleware | request-response | NextAuth.js wrapper with pathname matching | exact |
| `app/api/auth/[...nextauth]/route.ts` | route | request-response | NextAuth.js handler export | exact |
| `app/admin/layout.tsx` | component (layout) | N/A (client shell) | SessionProvider + AdminHeader + AdminSidebar | exact |
| `app/admin/page.tsx` | controller (page) | CRUD (read) | Server Component with Drizzle queries | exact |
| `app/admin/login/page.tsx` | controller (page) | request-response | Login form with signIn() | exact |
| `app/admin/articles/page.tsx` | controller (page) | CRUD (read) | Server Component with Drizzle queries | exact |
| `app/admin/articles/[id]/edit/page.tsx` | controller (page) | CRUD (read) | Server Component fetching article + versions + extractions | exact |
| `app/admin/articles/[id]/edit/EditArticleClient.tsx` | component | CRUD (read/write) | Client Component with fetch + useToast | exact |
| `app/admin/pipeline/page.tsx` | controller (page) | request-response + SSE | Client Component with EventSource + fetch | exact |
| `app/admin/sources/page.tsx` | controller (page) | CRUD (read) | Client Component with fetch + useToast | exact |
| `app/api/admin/articles/[id]/route.ts` | route | CRUD | Auth guard + Zod validation + Drizzle transaction | exact |
| `app/api/admin/articles/[id]/versions/route.ts` | route | CRUD | Auth guard + Zod + Drizzle transaction (rollback) | exact |
| `app/api/admin/pipeline/runs/route.ts` | route | CRUD (read) | Auth guard + Drizzle query | exact |
| `app/api/admin/pipeline/re-crawl/route.ts` | route | event-driven | Auth guard + Zod + BullMQ collectQueue.add() | exact |
| `app/api/admin/pipeline/regenerate/route.ts` | route | event-driven | Auth guard + Zod + BullMQ generateQueue.add() | exact |
| `app/api/admin/pipeline/run-full/route.ts` | route | event-driven | Auth guard + orchestrateDailyRun() + background finalization | exact |
| `app/api/admin/pipeline/stream/route.ts` | route | streaming (SSE) | Auth guard + ReadableStream + 1s interval poll | exact |
| `app/api/admin/sources/[id]/trust/route.ts` | route | CRUD (update) | Auth guard + Zod + Drizzle update | exact |
| `app/api/admin/settings/route.ts` | route | CRUD | Auth guard + Zod + Drizzle upsert (onConflictDoUpdate) | exact |
| `app/components/admin/Toast.tsx` | component (utility) | event-driven | useToast hook + ToastContainer with auto-dismiss | exact |
| `app/components/admin/ConfirmDialog.tsx` | component (interactive) | request-response | Modal with focus trap + Escape key + backdrop click | exact |
| `app/components/admin/AutoPublishToggle.tsx` | component (interactive) | CRUD (update) | Optimistic UI toggle with revert on error | exact |
| `app/components/admin/AdminHeader.tsx` | component (layout) | N/A | Fixed header with hamburger + signOut | exact |
| `app/components/admin/AdminSidebar.tsx` | component (layout) | N/A | Fixed sidebar with mobile overlay + active state | exact |
| `app/components/admin/SummaryCard.tsx` | component (data) | N/A | White card with status dot | exact |
| `app/components/admin/PipelineRunsTable.tsx` | component (data) | request-response | Expandable table row (accordion pattern) | exact |
| `app/components/admin/ErrorLogTable.tsx` | component (data) | request-response | Expandable row with error details in `<pre>` | exact |
| `app/components/admin/SourcesTable.tsx` | component (data) | CRUD (read/update) | Expandable row + filter dropdowns + trust toggle | exact |
| `app/components/admin/VersionHistoryTable.tsx` | component (data) | CRUD (read) | Table with "Current" badge + rollback link | exact |
| `app/components/admin/ArticleEditForm.tsx` | component (form) | CRUD (write) | Tabbed Edit/Preview with react-markdown | exact |
| `app/components/admin/ReCrawlTrigger.tsx` | component (trigger) | event-driven | Select + button + ConfirmDialog + API call | exact |
| `app/components/admin/RegenerateTrigger.tsx` | component (trigger) | event-driven | Date input + button + ConfirmDialog + API call | exact |
| `app/components/admin/RunFullPipelineTrigger.tsx` | component (trigger) | event-driven | Purple button + ConfirmDialog + API call | exact |
| `app/components/admin/SessionProvider.tsx` | component (wrapper) | N/A | next-auth/react SessionProvider wrapper | exact |

## Pattern Assignments

### Pattern 1: Auth Guard (API Routes)

**Source:** `app/api/admin/pipeline/runs/route.ts` lines 1-12
**Apply to:** All API routes under `/api/admin/`

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/src/auth';
import { db } from '@/src/db/index';
import { pipelineRuns } from '@/src/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... business logic
}
```

### Pattern 2: Zod Validation + API Response

**Source:** `app/api/admin/articles/[id]/route.ts` lines 8-12, 63-67
**Apply to:** All POST/PUT/PATCH API routes

```typescript
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1),
  summary: z.string(),
  content: z.string().min(1),
});

// In handler:
const body = await request.json();
const parsed = updateSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: 'Invalid input', details: parsed.error.flatten() },
    { status: 400 }
  );
}
```

### Pattern 3: Drizzle Transaction (Multi-Step Writes)

**Source:** `app/api/admin/articles/[id]/route.ts` lines 72-111
**Apply to:** Any API route requiring atomic multi-step DB operations

```typescript
const updated = await db.transaction(async (tx) => {
  // Step 1: Read current state
  const current = await tx.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (current.length === 0) return null;

  // Step 2: Insert version record
  await tx.insert(articleVersions).values({
    articleId,
    title: current[0].title,
    summary: current[0].summary,
    content: current[0].content,
    version: nextVersion,
  });

  // Step 3: Update main record
  const result = await tx.update(articles).set({ title, summary, content, updatedAt: new Date() })
    .where(eq(articles.id, articleId)).returning();
  return result[0];
});
```

### Pattern 4: BullMQ Job Enqueue (Admin Triggers)

**Source:** `app/api/admin/pipeline/re-crawl/route.ts` lines 40-44
**Apply to:** Re-crawl, regenerate, run-full routes

```typescript
import { collectQueue } from '@/src/pipeline/queues';

await collectQueue.add(
  'collect',
  { providerName, pipelineRunId: null },
  { jobId: `re-crawl-${providerName}-${Date.now()}` }
);

return NextResponse.json({
  success: true,
  message: `Re-crawl job queued for ${providerName}`,
});
```

### Pattern 5: SSE Stream (Real-Time Updates)

**Source:** `app/api/admin/pipeline/stream/route.ts` lines 17-59
**Apply to:** Any real-time data endpoint

```typescript
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  let isClosed = false;
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(new TextEncoder().encode(': keep-alive\n\n'));
      const interval = setInterval(async () => {
        if (isClosed) { clearInterval(interval); return; }
        const runsData = await db.select().from(pipelineRuns).orderBy(desc(pipelineRuns.startedAt)).limit(20);
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(runsData)}\n\n`));
      }, 1000);
      request.signal.addEventListener('abort', () => { isClosed = true; clearInterval(interval); });
    },
    cancel() { isClosed = true; },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive' },
  });
}
```

### Pattern 6: Client Page with Data Fetching + Toast

**Source:** `app/admin/sources/page.tsx` lines 16-85
**Apply to:** All client-side admin pages

```typescript
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useToast, ToastContainer } from '@/app/components/admin/Toast';

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toasts, addToast, removeToast } = useToast();

  const loadSources = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sources');
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources ?? []);
      } else {
        addToast('error', 'Could not load sources. The source list could not be retrieved. Refresh the page or check provider configuration.');
      }
    } catch {
      addToast('error', 'Could not load sources. The source list could not be retrieved. Refresh the page or check provider configuration.');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadSources(); }, [loadSources]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="text-sm text-gray-500">Loading sources...</div></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Sources</h1>
      <SourcesTable sources={sources} onToggleTrust={handleToggleTrust} />
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
```

### Pattern 7: Server Component Page (Drizzle Direct)

**Source:** `app/admin/articles/page.tsx` lines 9-94
**Apply to:** Overview dashboard, articles list, any read-only admin page

```typescript
import { db } from '@/src/db/index';
import { articles } from '@/src/db/schema';
import { desc } from 'drizzle-orm';
import { format } from 'date-fns';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminArticlesPage() {
  let articlesList = [];
  try {
    articlesList = await db.select({ id: articles.id, date: articles.date, title: articles.title, publishedAt: articles.publishedAt })
      .from(articles).orderBy(desc(articles.date));
  } catch {
    // Database may not be available during build
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Articles</h1>
      {articlesList.length === 0 ? (
        <div className="text-center py-12">...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">...</table>
        </div>
      )}
    </div>
  );
}
```

### Pattern 8: Expandable Table Row (Accordion)

**Source:** `app/components/admin/PipelineRunsTable.tsx` lines 29-193
**Apply to:** PipelineRunsTable, ErrorLogTable, SourcesTable

```typescript
const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

// In render:
<Fragment key={run.id}>
  <tr
    onClick={() => setExpandedRowId(isExpanded ? null : run.id)}
    className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50' : ''}`}
  >
    {/* columns */}
  </tr>
  {isExpanded && (
    <tr>
      <td colSpan={5} className="p-0 border-b border-gray-200">
        <div className="px-4 py-4 bg-gray-50/80 shadow-inner">
          {/* expanded detail content */}
        </div>
      </td>
    </tr>
  )}
</Fragment>
```

### Pattern 9: Optimistic Toggle Switch

**Source:** `app/components/admin/AutoPublishToggle.tsx` lines 10-51
**Apply to:** AutoPublishToggle, SourcesTable trust toggle

```typescript
const [enabled, setEnabled] = useState(initialValue);
const [isLoading, setIsLoading] = useState(false);

const handleToggle = async () => {
  const newValue = !enabled;
  setIsLoading(true);
  setEnabled(newValue); // Optimistic update
  try {
    await onChange(newValue);
  } catch {
    setEnabled(!newValue); // Revert on error
  } finally {
    setIsLoading(false);
  }
};

// Render:
<button
  role="switch"
  aria-checked={enabled}
  onClick={handleToggle}
  disabled={isLoading}
  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
    enabled ? 'bg-blue-600' : 'bg-gray-300'
  } ${isLoading ? 'opacity-50' : ''}`}
>
  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
    enabled ? 'translate-x-5' : 'translate-x-0'
  }`} />
</button>
```

### Pattern 10: ConfirmDialog + API Call Flow

**Source:** `app/components/admin/ReCrawlTrigger.tsx` lines 12-76
**Apply to:** ReCrawlTrigger, RegenerateTrigger, RunFullPipelineTrigger

```typescript
const [isConfirmOpen, setIsConfirmOpen] = useState(false);
const [isLoading, setIsLoading] = useState(false);

const handleConfirm = async () => {
  setIsLoading(true);
  try {
    const res = await fetch('/api/admin/pipeline/re-crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerName: selectedProvider }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed');
    onSuccess(data.message ?? `Re-crawl job queued for ${selectedProvider}.`);
    setSelectedProvider('');
  } catch {
    onError('Re-crawl failed to queue. Check the pipeline status and try again.');
  } finally {
    setIsLoading(false);
    setIsConfirmOpen(false);
  }
};

// Render:
<ConfirmDialog
  isOpen={isConfirmOpen}
  title="Re-crawl Provider"
  message={`This will queue a new crawl job for ${selectedProvider}. Continue?`}
  confirmLabel="Yes, Re-crawl"
  onConfirm={handleConfirm}
  onCancel={() => setIsConfirmOpen(false)}
  variant="danger"
/>
```

### Pattern 11: Toast Hook

**Source:** `app/components/admin/Toast.tsx` lines 1-63
**Apply to:** All client pages using toast notifications

```typescript
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
```

### Pattern 12: Auth Configuration (NextAuth.js v5)

**Source:** `src/auth.ts` lines 1-36
**Apply to:** Auth setup

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { auth, signIn, signOut, handlers } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (credentials.password === adminPassword) {
          return { id: "admin", name: "Admin" };
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 28800 },
  pages: { signIn: "/admin/login" },
  secret: process.env.NEXTAUTH_SECRET,
});
```

### Pattern 13: Auth Middleware

**Source:** `middleware.ts` lines 1-29
**Apply to:** Route protection

```typescript
import { auth } from "@/src/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  if (pathname === "/admin/login") return NextResponse.next();
  if (pathname.startsWith("/admin") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  if (pathname.startsWith("/api/admin") && !isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
});

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
```

### Pattern 14: Admin Layout (Client Shell)

**Source:** `app/admin/layout.tsx` lines 1-22
**Apply to:** Admin layout wrapping all `/admin/*` pages

```typescript
'use client';
import { useState } from 'react';
import { SessionProviderWrapper } from '@/app/components/admin/SessionProvider';
import { AdminHeader } from '@/app/components/admin/AdminHeader';
import { AdminSidebar } from '@/app/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <SessionProviderWrapper>
      <AdminHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="ml-0 md:ml-60 pt-12 min-h-screen bg-gray-50">
        <div className="p-6">{children}</div>
      </main>
    </SessionProviderWrapper>
  );
}
```

### Pattern 15: Upsert (Drizzle onConflictDoUpdate)

**Source:** `app/api/admin/settings/route.ts` lines 55-60
**Apply to:** Settings, any key-value store pattern

```typescript
await db.insert(adminSettings)
  .values({ key, value })
  .onConflictDoUpdate({
    target: adminSettings.key,
    set: { value, updatedAt: new Date() },
  });
```

### Pattern 16: Server Component with Client Component (Data Serialization)

**Source:** `app/admin/articles/[id]/edit/page.tsx` lines 9-104
**Apply to:** Any page needing Server Component data fetching + Client Component interactivity

```typescript
// Server Component (page.tsx)
export const dynamic = 'force-dynamic';
export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const articleId = parseInt(id, 10);
  if (isNaN(articleId)) notFound();

  const result = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  const article = result[0];
  if (!article) notFound();

  // Serialize dates for client component
  const serializedArticle = {
    ...article,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };

  return <EditArticleClient article={serializedArticle} initialVersions={serializedVersions} />;
}
```

### Pattern 17: Table Header Styling

**Source:** `app/components/admin/PipelineRunsTable.tsx` lines 91-98
**Apply to:** All admin tables

```typescript
<thead>
  <tr className="border-b border-gray-200 bg-gray-50">
    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Started</th>
    {/* ... */}
  </tr>
</thead>
```

### Pattern 18: Empty State

**Source:** `app/components/admin/PipelineRunsTable.tsx` lines 48-57
**Apply to:** All tables when data is empty

```typescript
if (runs.length === 0) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-gray-500">No pipeline runs recorded</p>
      <p className="text-xs text-gray-400 mt-1">
        Pipeline runs will appear here after the first daily collection completes.
      </p>
    </div>
  );
}
```

### Pattern 19: Badge Styling (Status)

**Source:** `app/components/admin/SourcesTable.tsx` lines 113-121
**Apply to:** Status badges across all tables

```typescript
{/* Active badge */}
<span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">Active</span>
{/* Inactive badge */}
<span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">Inactive</span>
{/* Current version badge */}
<span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">Current</span>
```

### Pattern 20: SSE Client Consumer

**Source:** `app/admin/pipeline/page.tsx` lines 72-92
**Apply to:** Any client page consuming SSE streams

```typescript
useEffect(() => {
  loadData();
  const eventSource = new EventSource('/api/admin/pipeline/stream');
  eventSource.onmessage = (event) => {
    try {
      const parsedRuns = JSON.parse(event.data);
      setRuns(parsedRuns);
    } catch (e) {
      console.error('Failed to parse SSE data', e);
    }
  };
  eventSource.onerror = (err) => { console.error('SSE Error:', err); };
  return () => { eventSource.close(); };
}, [loadData]);
```

## Shared Patterns

### Auth Middleware
**Source:** `middleware.ts`
**Apply to:** All `/admin/*` and `/api/admin/*` routes
```typescript
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  if (pathname === "/admin/login") return NextResponse.next();
  if (pathname.startsWith("/admin") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  if (pathname.startsWith("/api/admin") && !isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
});
```

### Error Handling (API Routes)
**Source:** All API routes under `app/api/admin/`
**Apply to:** All API route handlers
```typescript
try {
  // business logic
} catch (error) {
  console.error('Error <description>:', error);
  return NextResponse.json({ error: '<description>' }, { status: 500 });
}
```

### Error Toast (Client Pages)
**Source:** All client pages (pipeline, sources, articles)
**Apply to:** All client-side fetch calls
```typescript
addToast('error', '<Action> failed. <What went wrong>. <What to try>.');
```

### Success Toast (Client Pages)
**Source:** All client pages
**Apply to:** All successful API calls
```typescript
addToast('success', '<Action completed>.');
```

### Table Container
**Source:** All table components
**Apply to:** All admin tables
```html
<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
  <table className="w-full text-sm">
    <!-- thead + tbody -->
  </table>
</div>
```

### Loading State
**Source:** Client pages (pipeline, sources)
**Apply to:** All client pages
```typescript
if (isLoading) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-sm text-gray-500">Loading {noun} data...</div>
    </div>
  );
}
```

### Drizzle Import Pattern
**Source:** All API routes and server components
**Apply to:** All files using database
```typescript
import { db } from '@/src/db/index';
import { tableName } from '@/src/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
```

### Tab Indicator Pattern
**Source:** `app/components/admin/ArticleEditForm.tsx` lines 77-96, `app/admin/articles/[id]/edit/EditArticleClient.tsx` lines 100-131
**Apply to:** All tabbed interfaces
```typescript
<button
  onClick={() => setActiveTab('edit')}
  className={`text-sm pb-1 ${
    activeTab === 'edit'
      ? 'text-blue-600 border-b-2 border-blue-600 font-semibold'
      : 'text-gray-500'
  }`}
>
  Edit
</button>
```

### Sidebar Active State
**Source:** `app/components/admin/AdminSidebar.tsx` lines 49-54
**Apply to:** Sidebar navigation
```typescript
className={`flex items-center px-4 py-2 text-sm rounded-md mb-1 ${
  isActive(item.href)
    ? 'bg-blue-50 text-blue-600 font-semibold'
    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-normal'
}`}
```

## No Analog Found

All files in Phase 8 have exact analogs in the existing codebase. No new patterns need to be invented.

## Metadata

**Analog search scope:** `app/`, `src/`, `middleware.ts`
**Files scanned:** 35 admin files
**Pattern extraction date:** 2026-06-16
