# Phase 6: Daily Content Engine - Research

**Researched:** 2026-06-14
**Domain:** AI article generation pipeline, Next.js dynamic routes, Markdown rendering
**Confidence:** HIGH

## Summary

Phase 6 transforms the placeholder `generate.ts` worker into a real AI-powered article generator and adds two new pages for browsing daily digests. The core challenge is threefold: (1) building the diff-based content generation that compares today's extractions with yesterday's, (2) implementing the Vercel AI SDK `generateText()` call with provider fallback, and (3) creating the /digest and /digest/[date] pages following the established ISR pattern.

The existing codebase provides strong foundations: the `articles` table exists, the `generate.ts` worker is a ready-to-replace placeholder, Vercel AI SDK is already installed with both Anthropic and OpenAI providers, and the ISR + `generateStaticParams` pattern from `/model/[slug]` can be directly reused. The main schema change needed is adding a `date` column (unique, date type) and a `summary` column to the `articles` table for upsert targeting and archive display.

**Primary recommendation:** Replace the placeholder generate worker with a real implementation using Vercel AI SDK `generateText()`, add `date` and `summary` columns to the articles table, and create /digest routes following the exact pattern from /model/[slug].

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Structured prose format — one flowing article with 4 fixed sections: headline, key changes, pricing highlights, what to watch. Like a daily newsletter.
- **D-02:** Diff-based content — compare today's extractions with yesterday's. Highlight new models, price changes, new promotions. Not just a snapshot.
- **D-03:** Short length — 300-500 words. Quick scan for developers.
- **D-04:** Neutral/factual tone. Data-driven, no opinions.
- **D-05:** Publish 'no changes' articles on quiet days. Shows the system is alive.
- **D-06:** Full data input — feed extractions, promotions, and confidence scores into the AI prompt for rich context.
- **D-07:** Store as Markdown in the existing `articles.content` text column.
- **D-08:** Date-based slug: /digest/2026-06-14. One article per day, deterministic URLs.
- **D-09:** Use Vercel AI SDK `generateText()` — already in dependencies.
- **D-10:** Single prompt strategy — one LLM call with all context.
- **D-11:** Primary provider + automatic fallback. Configurable via env vars.
- **D-12:** On total failure — BullMQ retry (3 attempts with exponential backoff).
- **D-13:** New `/digest` route for the archive list. Individual articles at `/digest/[date]`.
- **D-14:** Simple list layout — reverse-chronological with date, headline, and 1-line summary.
- **D-15:** Load more pagination — show 30 most recent articles initially, 'Load more' button for older ones.
- **D-16:** Individual article pages use the same SideNav + TopBar layout as the rest of the app.
- **D-17:** SSG with ISR — pre-render recent articles at build time via `generateStaticParams`, ISR revalidation every 60 seconds.
- **D-18:** Auto-publish immediately — article goes live as soon as AI finishes. No human review gate.
- **D-19:** Show 'Published: June 14, 2026' on each article and in the archive list.
- **D-20:** One article per day, upsert — if pipeline runs again, update the existing article for that date. No duplicates.
- **D-21:** Add 'Daily Digest' link to the SideNav for discoverability from any page.

### Claude's Discretion
- Article Markdown rendering (use a Markdown-to-HTML library or React Markdown component)
- Prompt template design (exact wording, section instructions, formatting rules)
- Empty state handling for the archive page (no articles yet)
- Loading states for article pages
- Chart/data snippets within articles (optional)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONT-01 | System auto-generates a daily article covering new model releases, pricing changes, promotions, and notable trends | Vercel AI SDK `generateText()` with diff-based prompt; BullMQ generate worker with retry |
| CONT-02 | User can view a chronological archive of all past daily digests | /digest route with Drizzle query, reverse-chronological, load-more pagination |
| CONT-03 | Each daily digest uses a scannable format: headline, key changes, pricing highlights, what to watch | Structured prompt with 4 fixed sections; Markdown rendering with react-markdown |
| CONT-04 | Daily article generation uses multi-provider AI (configurable) | Vercel AI SDK with @ai-sdk/anthropic + @ai-sdk/openai; primary + fallback pattern |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai (Vercel AI SDK) | 6.0.199 | `generateText()` for article generation | Already installed; provider-agnostic; supports retry |
| @ai-sdk/anthropic | 3.0.81 | Anthropic (Claude) provider | Already installed; primary AI provider |
| @ai-sdk/openai | 3.0.68 | OpenAI provider | Already installed; fallback AI provider |
| react-markdown | 10.1.0 | Markdown-to-React rendering | Standard React Markdown component; works in Server Components v9+ |
| remark-gfm | 4.0.1 | GFM support (tables, strikethrough, etc.) | Standard plugin for react-markdown |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-markdown | markdown-wasm | Faster but no React component model; harder to style |
| react-markdown | @next/mdx | More integrated but heavier; overkill for simple article rendering |
| remark-gfm | remark-breaks | GFM covers more use cases (tables, task lists) |

**Installation:**
```bash
pnpm add react-markdown remark-gfm
```

**Version verification:**
- `react-markdown`: 10.1.0 (npm registry, verified 2026-06-14)
- `remark-gfm`: 4.0.1 (npm registry, verified 2026-06-14)
- `ai`: 6.0.199 (already installed)
- `@ai-sdk/anthropic`: 3.0.81 (already installed)
- `@ai-sdk/openai`: 3.0.68 (already installed)

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Article generation (AI call) | API / Backend (BullMQ worker) | — | Runs in worker process, not browser; needs API keys |
| Diff computation (today vs yesterday) | API / Backend (BullMQ worker) | — | Database queries happen server-side |
| Article storage (upsert) | Database / Storage | — | PostgreSQL articles table |
| Archive page (/digest) | Frontend Server (SSR/SSG) | — | Server component with Drizzle query + ISR |
| Article detail (/digest/[date]) | Frontend Server (SSR/SSG) | — | Server component with generateStaticParams + ISR |
| Markdown rendering | Browser / Client | — | react-markdown renders in browser |
| SideNav link | Browser / Client | — | Navigation component |

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| react-markdown | npm | ~10 yrs | High | github.com/remarkjs/react-markdown | N/A (pre-existing knowledge) | Approved |
| remark-gfm | npm | ~6 yrs | High | github.com/remarkjs/remark-gfm | N/A (pre-existing knowledge) | Approved |
| ai | npm | ~2 yrs | High | github.com/vercel/ai | Already installed | Approved |
| @ai-sdk/anthropic | npm | ~2 yrs | High | github.com/vercel/ai | Already installed | Approved |
| @ai-sdk/openai | npm | ~2 yrs | High | github.com/vercel/ai | Already installed | Approved |

*Packages to install: react-markdown, remark-gfm. Both are well-established, widely-used packages from the remarkjs ecosystem.*

## Architecture Patterns

### System Architecture Diagram

```
Daily Cron (6 AM UTC)
    │
    ▼
BullMQ daily-pipeline queue
    │
    ▼
orchestrateDailyRun()
    │
    ├── collect → extract → score (existing pipeline)
    │
    ▼
generate worker (THIS PHASE)
    │
    ├── 1. Query today's extractions from DB
    ├── 2. Query yesterday's extractions from DB
    ├── 3. Query active promotions from DB
    ├── 4. Build diff context (new models, price changes, new promos)
    ├── 5. Call Vercel AI SDK generateText() with structured prompt
    ├── 6. Parse response → title, summary, content (Markdown)
    ├── 7. Upsert into articles table (date = today)
    └── 8. Set publishedAt = now()
```

### Recommended Project Structure
```
src/pipeline/
├── workers/
│   └── generate.ts          # REPLACE placeholder with real implementation
├── article-generator.ts     # NEW: generateText() call + prompt template
├── article-diff.ts          # NEW: diff computation (today vs yesterday)
└── ...existing files...

app/
├── digest/
│   ├── page.tsx             # NEW: archive list (/digest)
│   └── [date]/
│       └── page.tsx         # NEW: article detail (/digest/[date])
├── components/
│   ├── DigestList.tsx       # NEW: archive list client component
│   └── DigestArticle.tsx    # NEW: article detail client component
└── lib/
    └── digest-utils.ts      # NEW: date validation, slug utilities
```

### Pattern 1: Diff-Based Content Generation
**What:** Compare today's extractions with yesterday's to identify new models, price changes, and new promotions.
**When to use:** Every generate worker invocation.
**Example:**
```typescript
// src/pipeline/article-diff.ts
import { db } from '@/src/db/index';
import { extractions, promotions } from '@/src/db/schema';
import { eq, and, gte, lt, desc } from 'drizzle-orm';

interface DiffResult {
  newModels: Array<{ modelName: string; sourceName: string }>;
  priceChanges: Array<{
    modelName: string;
    field: 'input' | 'output';
    oldPrice: number;
    newPrice: number;
    changePercent: number;
  }>;
  newPromotions: Array<{ modelPattern: string; description: string }>;
  totalModelsToday: number;
}

export async function computeDiff(today: Date, yesterday: Date): Promise<DiffResult> {
  // Query today's extractions
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const yesterdayStart = new Date(yesterday);
  yesterdayStart.setHours(0, 0, 0, 0);
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);

  // Get latest extraction per model for each day
  // Compare to find: new models, price changes
  // Query promotions created since yesterday
  // Return structured diff
}
```

### Pattern 2: Vercel AI SDK generateText() with Provider Fallback
**What:** Call LLM to generate article from diff context, with automatic provider fallback.
**When to use:** Inside the generate worker after computing the diff.
**Example:**
```typescript
// src/pipeline/article-generator.ts
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

interface GeneratedArticle {
  title: string;
  summary: string;
  content: string; // Markdown
}

export async function generateArticle(context: string): Promise<GeneratedArticle> {
  const primaryProvider = process.env.AI_PROVIDER ?? 'anthropic';
  const fallbackProvider = process.env.AI_FALLBACK_PROVIDER ?? 'openai';

  const getModel = (provider: string) => {
    switch (provider) {
      case 'anthropic': return anthropic('claude-sonnet-4-5');
      case 'openai': return openai('gpt-4o');
      default: return anthropic('claude-sonnet-4-5');
    }
  };

  const prompt = buildPrompt(context);

  try {
    const result = await generateText({
      model: getModel(primaryProvider),
      system: SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 1024,
      temperature: 0.3,
    });
    return parseArticleResponse(result.text);
  } catch (err) {
    console.warn(`Primary provider (${primaryProvider}) failed, trying fallback:`, err);
    const result = await generateText({
      model: getModel(fallbackProvider),
      system: SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 1024,
      temperature: 0.3,
    });
    return parseArticleResponse(result.text);
  }
}
```

### Pattern 3: ISR + generateStaticParams for /digest/[date]
**What:** Pre-render recent articles at build time, ISR revalidation every 60 seconds.
**When to use:** For the /digest/[date] page.
**Example:**
```typescript
// app/digest/[date]/page.tsx
import { db } from '@/src/db/index';
import { articles } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { DigestArticle } from '@/app/components/DigestArticle';

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const rows = await db
      .select({ date: articles.date })
      .from(articles)
      .orderBy(desc(articles.date))
      .limit(90); // Pre-render last 90 days

    return rows.map((row) => ({
      date: row.date, // e.g., "2026-06-14"
    }));
  } catch {
    return [];
  }
}

export default async function DigestArticlePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

  try {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.date, date))
      .limit(1);

    if (!article) notFound();

    return <DigestArticle article={article} />;
  } catch {
    notFound();
  }
}
```

### Anti-Patterns to Avoid
- **Calling generateText() without try/catch:** The LLM call can fail (rate limits, API errors). Always wrap in try/catch with fallback.
- **Storing raw LLM response without parsing:** The LLM may return extra text around the structured article. Parse the response to extract title, summary, and content.
- **Using publishedAt for upsert targeting:** publishedAt is a timestamp, not a date. Add a dedicated `date` column (date type) with a unique constraint for clean upserts.
- **Hardcoding provider model names:** Use env vars for model selection to allow easy switching.
- **Not handling the "no extractions" case:** D-05 requires publishing "no changes" articles on quiet days. The generate worker must handle empty diff results.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering | Custom HTML parser | react-markdown + remark-gfm | Handles all Markdown edge cases; GFM support for tables |
| LLM provider abstraction | Custom fetch calls to OpenAI/Anthropic APIs | Vercel AI SDK `generateText()` | Handles retry, provider switching, token counting |
| Date parsing/validation | Manual string splitting | date-fns `parseISO`, `isValid`, `format` | Already installed; handles timezone edge cases |
| Upsert logic | SELECT then INSERT/UPDATE | Drizzle `onConflictDoUpdate` | Atomic; no race conditions |

## Common Pitfalls

### Pitfall 1: LLM Response Parsing
**What goes wrong:** The LLM returns the article with extra preamble text (e.g., "Here is your daily digest:") or wrapping (e.g., triple backticks). The raw text gets stored as the article content.
**Why it happens:** LLMs are conversational; they don't always return clean Markdown.
**How to avoid:** Use a structured prompt that explicitly instructs the LLM to return ONLY the article in a specific format. Parse the response to extract title, summary, and content. Consider using delimiters (e.g., `---TITLE---`, `---SUMMARY---`, `---CONTENT---`) in the prompt.
**Warning signs:** Articles stored with "Here is..." prefix or triple-backtick wrapping.

### Pitfall 2: Timezone Handling for "Today"
**What goes wrong:** The generate worker uses `new Date()` to determine "today", but the server is in UTC while the user expects a specific timezone. Articles may be dated incorrectly.
**Why it happens:** JavaScript Date is UTC-based; the daily cron runs at 6 AM UTC.
**How to avoid:** Use UTC dates consistently. The daily cron runs at 6 AM UTC, so "today" should be the UTC date at the time of generation. Document this clearly.
**Warning signs:** Articles dated one day off from expected.

### Pitfall 3: Empty Diff on First Run
**What goes wrong:** On the first day of operation, there are no "yesterday's extractions" to compare against. The diff computation returns empty results, and the LLM has nothing to write about.
**Why it happens:** No historical data exists yet.
**How to avoid:** When yesterday's data is empty, treat ALL extractions as "new models" in the diff. The first article introduces the full dataset.
**Warning signs:** First article says "no changes detected" when there should be data.

### Pitfall 4: Duplicate Articles from Pipeline Re-runs
**What goes wrong:** If the pipeline runs twice in one day (e.g., manual trigger), two articles are created for the same date.
**Why it happens:** No unique constraint on date; insert without upsert.
**How to avoid:** Add a unique constraint on the `date` column and use `onConflictDoUpdate` for upsert.
**Warning signs:** Archive shows two entries for the same date.

### Pitfall 5: generateStaticParams Returns Empty at Build Time
**What goes wrong:** During `next build`, the database may not be available (Docker not running). `generateStaticParams` returns empty array, so no pages are pre-rendered.
**Why it happens:** Build environment doesn't have DB access.
**How to avoid:** Wrap in try/catch and return empty array. ISR will catch up at runtime when the DB is available. This is the established pattern from `/model/[slug]`.
**Warning signs:** All /digest/[date] pages return 404 immediately after deploy, then work after ISR kicks in.

## Code Examples

### generateText() with Provider Fallback
```typescript
// Source: Vercel AI SDK docs (https://ai-sdk.dev/docs/ai-core/generate-text)
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

const result = await generateText({
  model: anthropic('claude-sonnet-4-5'),
  system: 'You are a professional data analyst...',
  prompt: 'Generate a daily digest...',
  maxOutputTokens: 1024,
  temperature: 0.3,
});

console.log(result.text);      // Generated article
console.log(result.usage);     // { promptTokens, completionTokens, totalTokens }
```

### Drizzle Upsert (onConflictDoUpdate)
```typescript
// Source: Drizzle ORM docs (https://orm.drizzle.team/docs/insert)
await db
  .insert(articles)
  .values({
    date: '2026-06-14',
    title: 'AI Daily - June 14, 2026',
    summary: 'GPT-4o price drops 20%, new Gemini model launched',
    content: '# AI Daily - June 14, 2026\n\n...',
    publishedAt: new Date(),
  })
  .onConflictDoUpdate({
    target: articles.date,
    set: {
      title: 'AI Daily - June 14, 2026',
      summary: 'GPT-4o price drops 20%, new Gemini model launched',
      content: '# AI Daily - June 14, 2026\n\n...',
      publishedAt: new Date(),
      updatedAt: new Date(),
    },
  });
```

### react-markdown in Server Component
```typescript
// Source: react-markdown v9+ supports Server Components
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function DigestArticle({ content }: { content: string }) {
  return (
    <article className="prose prose-slate max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Placeholder article generation | Real AI-powered generation | Phase 6 | Actual daily content |
| No archive pages | /digest and /digest/[date] | Phase 6 | Users can browse history |
| No SideNav link | Daily Digest in navigation | Phase 6 | Discoverability |

**Deprecated/outdated:**
- Placeholder `generate.ts` worker: Replace entirely with real implementation

## Runtime State Inventory

> Not applicable — Phase 6 is a greenfield feature addition, not a rename/refactor/migration. No existing runtime state needs migration.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SideNav component exists in the codebase (mentioned in Stitch integration summary) | D-21 Integration | If missing, need to create simple nav component or defer D-21. Verified: SideNav.tsx does NOT exist in app/components/. The Stitch integration summary references it but it was not persisted. |
| A2 | react-markdown v10.1.0 works in Next.js 16 Server Components | Markdown Rendering | If not, need 'use client' wrapper. Low risk — react-markdown v9+ supports Server Components. |
| A3 | Vercel AI SDK generateText() accepts model objects from @ai-sdk/anthropic and @ai-sdk/openai | AI Generation | Already verified — the `ai` package exports `generateText`, and the provider packages are installed. |
| A4 | The `date` column type in Drizzle (pgCore `date`) stores as a date string 'YYYY-MM-DD' | Schema Design | If stored differently, upsert targeting may fail. Standard PostgreSQL behavior. |

**Important finding:** The SideNav component referenced in D-21 does NOT exist in `app/components/`. The Stitch integration summary (03-STITCH-INTEGRATION-SUMMARY.md) documents its creation, but the file is not present in the working tree. The planner must either create a simple navigation component or adapt D-21 to use a different navigation approach (e.g., top nav bar, inline links on pages).

## Open Questions (RESOLVED)

1. **SideNav existence:** The Stitch integration summary mentions SideNav.tsx was created, but it does not exist in app/components/. Was it reverted? Should Phase 6 create it, or should D-21 be adapted? **RESOLVED:** Plans create a TopNav component instead.
   - What we know: The summary says it was created with 240px fixed sidebar, navigation links, AI Daily branding.
   - What's unclear: Why it's not in the working tree. Whether to recreate it or use a simpler approach.
   - Recommendation: Create a simple top navigation bar with links to Home, Daily Digest, and (future) admin. This is simpler than a full SideNav and works on mobile.

2. **AI provider env vars:** The current env.ts has MIMO_API_KEY and OPENAI_API_KEY. D-11 wants `AI_PROVIDER` and `AI_FALLBACK_PROVIDER` env vars. Should these be added to env.ts? **RESOLVED:** Plan 06-01 adds AI_PROVIDER and AI_FALLBACK_PROVIDER to env.ts.
   - What we know: env.ts uses Zod validation. MIMO_API_KEY is the current primary.
   - What's unclear: Whether to add new env vars or reuse existing ones.
   - Recommendation: Add AI_PROVIDER and AI_FALLBACK_PROVIDER to env.ts with defaults. Map 'anthropic' to ANTHROPIC_API_KEY, 'openai' to OPENAI_API_KEY, 'mimo' to MIMO_API_KEY.

3. **Article prompt template:** D-06 says to feed extractions, promotions, and confidence scores into the prompt. How much context fits within token limits? **RESOLVED:** Plan 06-02 uses compact diff format (changed models only) to stay under 2K tokens.
   - What we know: 30+ providers, potentially hundreds of extractions per day.
   - What's unclear: Whether to summarize extractions before sending to LLM or send raw.
   - Recommendation: Summarize extractions into a compact diff format (changed models only, not all models). This keeps the prompt under 2K tokens.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All pipeline code | ✓ | (check runtime) | — |
| PostgreSQL | Article storage | ✓ | (check runtime) | — |
| Redis | BullMQ queues | ✓ | (check runtime) | — |
| AI API key (MIMO/OpenAI/Anthropic) | generateText() | ✓ | — | If no key configured, generation fails gracefully |

**Missing dependencies with no fallback:**
- None identified — all core dependencies are available.

**Missing dependencies with fallback:**
- react-markdown, remark-gfm: Need to install (`pnpm add react-markdown remark-gfm`). If installation fails, can use a simple regex-based Markdown-to-HTML converter (not recommended but functional).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.6 |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-01 | Article generation from diff context | unit | `pnpm test tests/pipeline/article-generator.test.ts` | ❌ Wave 0 |
| CONT-01 | Diff computation (today vs yesterday) | unit | `pnpm test tests/pipeline/article-diff.test.ts` | ❌ Wave 0 |
| CONT-01 | Generate worker upserts article | unit | `pnpm test tests/pipeline/generate-worker.test.ts` | ❌ Wave 0 |
| CONT-02 | /digest page renders archive list | unit | `pnpm test tests/digest/digest-list.test.tsx` | ❌ Wave 0 |
| CONT-02 | Load more pagination | unit | `pnpm test tests/digest/digest-list.test.tsx` | ❌ Wave 0 |
| CONT-03 | Article has 4 sections (headline, key changes, pricing highlights, what to watch) | unit | `pnpm test tests/pipeline/article-generator.test.ts` | ❌ Wave 0 |
| CONT-03 | Markdown renders correctly | unit | `pnpm test tests/digest/digest-article.test.tsx` | ❌ Wave 0 |
| CONT-04 | Provider fallback works | unit | `pnpm test tests/pipeline/article-generator.test.ts` | ❌ Wave 0 |
| CONT-04 | Provider configurable via env vars | unit | `pnpm test tests/pipeline/article-generator.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/pipeline/article-generator.test.ts` — covers CONT-01, CONT-03, CONT-04
- [ ] `tests/pipeline/article-diff.test.ts` — covers CONT-01 (diff computation)
- [ ] `tests/pipeline/generate-worker.test.ts` — covers CONT-01 (worker integration)
- [ ] `tests/digest/digest-list.test.tsx` — covers CONT-02
- [ ] `tests/digest/digest-article.test.tsx` — covers CONT-03
- [ ] Install react-markdown + remark-gfm: `pnpm add react-markdown remark-gfm`

## Sources

### Primary (HIGH confidence)
- Vercel AI SDK docs (https://ai-sdk.dev/docs/ai-core/generate-text) — generateText API, parameters, return type
- Vercel AI SDK settings docs (https://ai-sdk.dev/docs/ai-sdk-core/settings) — maxOutputTokens, temperature, provider config
- Drizzle ORM docs (https://orm.drizzle.team/docs/insert) — onConflictDoUpdate upsert pattern
- Codebase: src/db/schema.ts — articles table structure
- Codebase: src/pipeline/workers/generate.ts — placeholder worker to replace
- Codebase: app/model/[slug]/page.tsx — ISR + generateStaticParams pattern

### Secondary (MEDIUM confidence)
- react-markdown npm registry — v10.1.0, React component for Markdown rendering
- remark-gfm npm registry — v4.0.1, GFM plugin for react-markdown

### Tertiary (LOW confidence)
- react-markdown Server Component support — based on training knowledge that v9+ works in Server Components

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in npm registry or already installed
- Architecture: HIGH — patterns directly from existing codebase (ISR, Drizzle queries, BullMQ workers)
- Pitfalls: HIGH — derived from codebase patterns and common LLM integration issues

**Research date:** 2026-06-14
**Valid until:** 2026-07-14 (30 days — stable stack, no fast-moving dependencies)
