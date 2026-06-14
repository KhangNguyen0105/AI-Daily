# Phase 6: Daily Content Engine - Context

**Gathered:** 2026-06-14
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers auto-generated daily articles covering AI pricing changes, with a chronological archive. The generate worker (currently a placeholder) becomes a real AI-powered article generator, and two new pages let users browse today's digest and past articles.

**In scope:** AI article generation in the generate worker, diff-based content (today vs yesterday), fixed 4-section format (headline, key changes, pricing highlights, what to watch), /digest archive page, /digest/[date] detail page, SideNav link, auto-publish on generation.

**Out of scope:** Admin editing/rollback (Phase 8), email subscriptions (v2), article search/filtering, social sharing, article ratings/comments.

</domain>

<decisions>
## Implementation Decisions

### Article Content & Format
- **D-01:** Structured prose format — one flowing article with 4 fixed sections: headline, key changes, pricing highlights, what to watch. Like a daily newsletter.
- **D-02:** Diff-based content — compare today's extractions with yesterday's. Highlight new models, price changes, new promotions. Not just a snapshot.
- **D-03:** Short length — 300-500 words. Quick scan for developers.
- **D-04:** Neutral/factual tone. Data-driven, no opinions. 'GPT-4o input price dropped 20% to $2.50/1M tokens.'
- **D-05:** Publish 'no changes' articles on quiet days. 'No pricing changes detected today. 15 models tracked.' Shows the system is alive.
- **D-06:** Full data input — feed extractions, promotions, and confidence scores into the AI prompt for rich context.
- **D-07:** Store as Markdown in the existing `articles.content` text column.
- **D-08:** Date-based slug: /digest/2026-06-14. One article per day, deterministic URLs.

### Generation Pipeline Integration
- **D-09:** Use Vercel AI SDK `generateText()` — already in dependencies. Supports Claude, OpenAI, Gemini via config.
- **D-10:** Single prompt strategy — one LLM call with all context (today's extractions, yesterday's for diff, promotions, article instructions). Simple, sufficient for 300-500 word articles.
- **D-11:** Primary provider + automatic fallback. Configurable via env vars (e.g., `AI_PROVIDER=anthropic`, `AI_FALLBACK_PROVIDER=openai`). If primary fails, try fallback.
- **D-12:** On total failure — BullMQ retry (3 attempts with exponential backoff). If all fail, mark pipeline run as failed. Admin can manually regenerate in Phase 8.

### Archive Page & Routing
- **D-13:** New `/digest` route for the archive list. Individual articles at `/digest/[date]`. Separate from the main pricing page.
- **D-14:** Simple list layout — reverse-chronological with date, headline, and 1-line summary. Each row links to /digest/[date].
- **D-15:** Load more pagination — show 30 most recent articles initially, 'Load more' button for older ones.
- **D-16:** Individual article pages use the same SideNav + TopBar layout as the rest of the app. Consistent navigation.
- **D-17:** SSG with ISR — pre-render recent articles at build time via `generateStaticParams`, ISR revalidation every 60 seconds. Same pattern as /model/[slug].

### Publish Flow & Freshness
- **D-18:** Auto-publish immediately — article goes live as soon as AI finishes. No human review gate. Admin can edit later (Phase 8).
- **D-19:** Show 'Published: June 14, 2026' on each article and in the archive list.
- **D-20:** One article per day, upsert — if pipeline runs again, update the existing article for that date. No duplicates.
- **D-21:** Add 'Daily Digest' link to the SideNav for discoverability from any page.

### Claude's Discretion
- Article Markdown rendering (use a Markdown-to-HTML library or React Markdown component)
- Prompt template design (exact wording, section instructions, formatting rules)
- Empty state handling for the archive page (no articles yet)
- Loading states for article pages
- Chart/data snippets within articles (optional — Claude decides if worth including)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema
- `src/db/schema.ts` — Existing `articles` table (id, title, content, publishedAt). May need `summary` column for archive list.
- `drizzle.config.ts` — Drizzle Kit configuration for migrations.

### Pipeline
- `src/pipeline/workers/generate.ts` — Current placeholder worker. This is the primary file to modify.
- `src/pipeline/orchestrator.ts` — Pipeline orchestration with stats tracking.
- `src/pipeline/queues.ts` — BullMQ queue definitions.
- `src/pipeline/scheduler.ts` — Daily job scheduling.

### Existing Pages (patterns to follow)
- `app/page.tsx` — Server component with Drizzle query and ISR pattern.
- `app/model/[slug]/page.tsx` — Dynamic route with generateStaticParams + ISR. Direct pattern analog for /digest/[date].

### Design System
- `app/globals.css` — Tailwind v4 @theme tokens.
- `app/components/` — Existing components for layout reference.

### Requirements
- `REQUIREMENTS.md` § CONT-01 through CONT-04 — Phase 6 requirements.
- `REQUIREMENTS.md` § FRNT-04 — 'Last updated: [date]' display.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `articles` table: Already has id, title, content (text), publishedAt. May need summary column.
- `generate.ts` worker: Placeholder ready to be replaced with real AI generation.
- Vercel AI SDK (`ai` package): Already installed. `generateText()` ready to use.
- SideNav component: Add 'Daily Digest' link alongside existing Pricing and Cost Calculator links.
- ISR pattern from `app/model/[slug]/page.tsx`: Direct reuse for /digest/[date].

### Established Patterns
- Server component fetches data, passes to client component
- ISR with `revalidate = 60` for periodic refresh
- Drizzle queries with try/catch fallback for DB unavailability
- Tailwind v4 @theme tokens for all styling
- generateStaticParams for build-time pre-rendering of dynamic routes

### Integration Points
- `src/pipeline/workers/generate.ts` — Replace placeholder with real article generation
- `src/db/schema.ts` — Potentially add `summary` column to articles table
- `app/components/` — New DigestList and DigestArticle components
- SideNav — Add digest link
- `src/pipeline/queues.ts` — Generate queue already exists

</code_context>

<specifics>
## Specific Ideas

- Article should feel like a daily pricing brief — quick, factual, actionable for developers.
- The diff approach (today vs yesterday) is key — it gives readers a clear 'what changed' signal rather than just a data dump.
- Date-based URLs (/digest/2026-06-14) make articles easy to share and reference.
- One article per day with upsert keeps the archive clean — no duplicates from multiple pipeline runs.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 6-Daily Content Engine*
*Context gathered: 2026-06-14*
