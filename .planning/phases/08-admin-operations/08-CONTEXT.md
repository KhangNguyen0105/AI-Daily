# Phase 8: Admin Operations - Context

**Gathered:** 2026-06-16
**Status:** Ready for execution

<domain>
## Phase Boundary

This phase delivers admin-only operations: authentication, pipeline monitoring, article content management with versioning, and source data quality control. Admin can log in, view pipeline health, edit/rollback articles, trigger re-crawls and regeneration, and manage source trust levels.

**In scope:** NextAuth.js credential auth, admin dashboard layout, article editing with markdown preview and version history, pipeline runs monitoring, error logs, re-crawl/regenerate triggers, source trust toggle, auto-publish toggle.

**Out of scope:** Visitor registration (v1 constraint — read-only public), email notifications, role-based access control (single admin), real-time WebSocket updates, audit logging beyond version history.

</domain>

<decisions>
## Implementation Decisions

### Pipeline Action Execution (ADMN-04, ADMN-06, ADMN-07)
- **D-01:** Re-crawl and regenerate actions queue via BullMQ — API routes enqueue jobs to existing collect/generate workers. Consistent with daily pipeline architecture. Admin sees "job enqueued" toast on success.
- **D-02:** Re-crawl uses existing `collectQueue.add()` with provider name. Regenerate uses existing `generateQueue.add()` with date parameter. No new worker code needed — reuse existing pipeline infrastructure.
- **D-03:** Confirmation dialog required before all destructive actions (re-crawl, regenerate). ConfirmDialog component from 08-03 is reused.

### Admin Data Refresh (ADMN-02, ADMN-08)
- **D-04:** Dashboard and pipeline pages use SWR with 30-second auto-revalidation. Fresh data without manual page refresh. Uses Next.js fetch patterns.
- **D-05:** Overview dashboard shows: last pipeline run status, total models tracked, total articles published. Fetched from existing `pipelineRuns`, `extractions`, and `articles` tables.
- **D-06:** Pipeline runs table and error log auto-refresh via same SWR config. Manual refresh button also available.

### Article Version Storage (ADMN-01, ADMN-03)
- **D-07:** Store full article snapshot in `articleVersions` table — title, summary, content, metadata. Simple rollback: swap content from version record. Articles are small text, DB impact negligible.
- **D-08:** Keep all versions forever. No auto-pruning. v1 constraint — articles are daily digests, volume is bounded (~365/year).
- **D-09:** Version created on every save (not just significant changes). Simple rule, no diffing logic needed.
- **D-10:** Rollback creates a NEW version from the current state, then swaps content from the target version. Preserves full history — rollback is itself recorded.

### Claude's Discretion
- Admin sidebar collapse behavior (hamburger at <768px) — standard responsive pattern, no user preference needed.
- Toast notification positioning — bottom-right, auto-dismiss after 3s. Standard pattern from Phase 3-7 UI.
- Error log display — most recent first, limited to last 100 entries. No pagination needed for v1.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Plans
- `.planning/phases/08-admin-operations/08-01-PLAN.md` — Auth layer: NextAuth.js, login page, session management
- `.planning/phases/08-admin-operations/08-02-PLAN.md` — Admin layout: sidebar, header, overview dashboard
- `.planning/phases/08-admin-operations/08-03-PLAN.md` — Articles management: edit, preview, version history, rollback
- `.planning/phases/08-admin-operations/08-04-PLAN.md` — Pipeline monitoring: runs, errors, re-crawl, regenerate, sources

### Prior Phase Decisions
- `.planning/phases/07-intelligence-analytics/07-CONTEXT.md` — UI patterns (charts, cards, responsive)
- `.planning/phases/06-daily-content-engine/06-CONTEXT.md` — Article generation, digest format
- `.planning/phases/02-data-collection-pipeline/02-CONTEXT.md` — Pipeline architecture, BullMQ queues, provider adapters

### Requirements
- `.planning/REQUIREMENTS.md` — ADMN-01 through ADMN-09 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **BullMQ queues** (`src/pipeline/queues.ts`): `collectQueue`, `generateQueue` — reuse for re-crawl/regenerate triggers
- **NextAuth.js v5**: Already in tech stack, credentials provider pattern documented
- **Toast/Dialog patterns**: Can extract from existing UI components in Phases 3-7
- **Drizzle ORM**: `articles`, `pipelineRuns`, `sources`, `extractions` tables already exist
- **SWR**: Not yet installed — needs `npm install swr` or use Next.js built-in `fetch` with `revalidate`

### Established Patterns
- **Server Components + Client Components**: Next.js App Router pattern used throughout Phases 3-7
- **Tailwind + Tremor**: UI component library for dashboards (stat cards, tables)
- **API routes**: `/api/` pattern with Drizzle queries, established in Phase 3

### Integration Points
- **Auth middleware**: Protects `/admin/*` and `/api/admin/*` routes
- **Pipeline orchestrator**: Admin triggers call into existing orchestrator functions
- **Article generator**: Regenerate calls existing generate worker
- **Sources table**: Trust toggle updates existing `sources` table columns

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Plans are detailed enough for direct execution.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 8-Admin Operations*
*Context gathered: 2026-06-16*
