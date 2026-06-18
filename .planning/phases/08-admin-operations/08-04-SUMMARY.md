---
phase: 08-admin-operations
plan: 04
subsystem: admin-operations
tags: [admin, article-edit, version-history, rollback, markdown-preview]
dependency_graph:
  requires: [08-03]
  provides: [article-edit-ui, version-history-api, rollback-api]
  affects: [admin-article-management]
tech_stack:
  added: [react-markdown, remark-gfm]
  patterns: [drizzle-transaction, server-component-with-client, tab-indicator]
key_files:
  created:
    - app/components/admin/ArticleEditForm.tsx
    - app/components/admin/VersionHistoryTable.tsx
    - app/api/admin/articles/[id]/route.ts
    - app/api/admin/articles/[id]/versions/route.ts
    - app/admin/articles/[id]/edit/page.tsx
    - app/admin/articles/[id]/edit/EditArticleClient.tsx
  modified: []
decisions:
  - "Sources tab uses server-component inline query instead of client-side API fetch (Pattern 16)"
  - "Rollback creates audit trail by saving current state as new version before restoring"
metrics:
  duration: ~5 min
  completed: "2026-06-17"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 8 Plan 04: Article Edit & Version History Summary

Article edit page with Markdown preview, version history tracking, rollback functionality, and source evidence display. All API routes use Drizzle transactions for atomicity and Zod for input validation.

## Tasks Completed

### Task 1: ArticleEditForm, VersionHistoryTable, and article API routes

**Status:** Verified (already implemented)

- `ArticleEditForm` — client component with title, summary, Markdown content fields; Edit/Preview tabs; ReactMarkdown with remarkGfm for preview; tab indicator pattern (text-blue-600 border-b-2)
- `VersionHistoryTable` — client component showing version list with "Current" badge (bg-green-100 text-green-800) and "Rollback to This Version" links; empty state per UI-SPEC copy
- `PUT /api/admin/articles/[id]` — Zod validation, auth check, db.transaction() wrapping version creation + article update (Pattern 3)
- `POST /api/admin/articles/[id]/versions` — Zod validation, auth check, db.transaction() wrapping rollback with articleId scope check (CR-01) and audit trail creation (CR-02)

### Task 2: Article edit page with client wrapper

**Status:** Verified (already implemented)

- Server component (`page.tsx`) — force-dynamic, fetches article + versions + extractions by date, serializes dates for client
- `EditArticleClient` — tabbed interface (Edit, Preview, Sources); Sources tab shows extractions with model, source, prices, confidence, collected-at; save/rollback handlers with toast notifications; ConfirmDialog for rollback confirmation
- Sources data fetched via server-component inline query (efficient Pattern 16 approach)

## Verification Results

| Must Have | Status | Evidence |
|-----------|--------|----------|
| Admin can click Edit to open article edit page | PASS | page.tsx renders EditArticleClient with article data |
| Edit/Preview tabs with Markdown rendering | PASS | ArticleEditForm has Edit/Preview tabs, ReactMarkdown with remarkGfm |
| Save creates version history before update | PASS | PUT handler uses db.transaction(): read current, insert version, update article |
| Version history with rollback | PASS | VersionHistoryTable shows versions, rollback calls POST versions API |
| Rollback requires confirmation | PASS | ConfirmDialog with "Rollback Article" / "Yes, Rollback" per UI-SPEC |
| Toast notifications | PASS | useToast + ToastContainer for save/rollback success and errors |
| Sources tab with extractions | PASS | Sources tab shows model, source, prices, confidence, collected-at |
| Zod validation on API inputs | PASS | updateSchema and rollbackSchema with safeParse |
| Transaction atomicity | PASS | Both PUT and POST use db.transaction() |
| ArticleId scope check on rollback | PASS | WHERE clause includes both versionId and articleId |

## Deviations from Plan

None — all must_haves satisfied by existing implementation.

## Self-Check: PASSED
