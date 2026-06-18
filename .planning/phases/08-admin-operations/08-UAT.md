---
status: testing
phase: 08-admin-operations
source: [08-VERIFICATION.md]
started: 2026-06-17T00:00:00Z
updated: 2026-06-17T00:00:00Z
---

## Current Test

number: 1
name: Login Flow
expected: |
  Navigate to /admin → redirects to /admin/login. Enter wrong password → shows "Invalid password. Please try again." Enter correct ADMIN_PASSWORD → redirects to /admin dashboard.
awaiting: user response

## Tests

### 1. Login Flow
expected: Navigate to /admin → redirects to /admin/login. Enter wrong password → shows error. Enter correct password → redirects to /admin.
result: [pending]

### 2. Admin Layout & Overview
expected: /admin shows sidebar with Overview, Articles, Pipeline, Sources links. Header shows "Admin" label and Logout button. Overview page shows 3 summary cards (last pipeline run, total models, total articles). Active sidebar link highlighted blue.
result: [pending]

### 3. Mobile Responsive
expected: Below 768px, sidebar hidden, hamburger icon visible. Clicking hamburger shows overlay sidebar. Clicking overlay closes sidebar.
result: [pending]

### 4. Articles List
expected: /admin/articles shows table with Date, Title, Status, Edit columns. Published articles show green badge, drafts show gray. Edit link navigates to article edit page. Empty state shows "No articles yet".
result: [pending]

### 5. Article Edit & Preview
expected: Article edit page shows title, summary, content fields with Edit/Preview tabs. Preview tab renders Markdown correctly. Sources tab shows related extractions.
result: [pending]

### 6. Article Version History & Rollback
expected: Saving article creates version history entry. VersionHistoryTable shows versions with "Current" badge on latest. "Rollback to This Version" link on older versions. Clicking rollback shows confirmation dialog. Confirming rollback restores article and shows success toast.
result: [pending]

### 7. Pipeline Monitoring
expected: /admin/pipeline shows runs table with status icons, start time, duration, stats. Clicking row expands to show per-provider breakdown. Error log shows failed runs. Manual refresh button works.
result: [pending]

### 8. Pipeline Actions
expected: Re-crawl trigger shows provider dropdown + button with confirmation. Regenerate trigger shows date picker + button with confirmation. Run Full Pipeline button with confirmation. Auto-publish toggle saves immediately on change.
result: [pending]

### 9. Sources Management
expected: /admin/sources shows table with Name, Type, Status, Last, Trust columns. Filter dropdowns for status and type. Trust toggle saves immediately with optimistic UI. Expandable rows show URL and details. Toast on toggle success/failure.
result: [pending]

### 10. Logout
expected: Clicking Logout in header redirects to /admin/login. Navigating to /admin after logout redirects to login.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
