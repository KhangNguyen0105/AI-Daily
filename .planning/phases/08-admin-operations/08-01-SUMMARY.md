---
phase: 08-admin-operations
plan: 01
subsystem: auth
tags: [nextauth, jwt, credentials, middleware, drizzle, postgresql]

# Dependency graph
requires: []
provides:
  - "NextAuth.js Credentials provider with JWT sessions (8-hour expiry)"
  - "Middleware protecting /admin/* and /api/admin/* routes"
  - "Custom login page at /admin/login"
  - "Session provider wrapper for admin layout"
  - "articleVersions and adminSettings database tables"
affects: [admin-operations, admin-dashboard, admin-articles, admin-pipeline]

# Tech tracking
tech-stack:
  added: [next-auth@5.0.0-beta.31]
  patterns: [credentials-auth, jwt-session, middleware-route-protection, admin-login-flow]

key-files:
  created:
    - src/auth.ts
    - app/api/auth/[...nextauth]/route.ts
    - middleware.ts
    - app/admin/login/page.tsx
    - app/admin/login/LoginForm.tsx
    - app/components/admin/SessionProvider.tsx
  modified:
    - src/db/schema.ts
    - package.json

key-decisions:
  - "NextAuth v5 beta used for App Router native support (credentials provider, JWT strategy)"
  - "8-hour session expiry balances security with admin convenience"
  - "NEXTAUTH_SECRET validated at module load in production to prevent silent auth failures"

patterns-established:
  - "Auth config in src/auth.ts exports auth, signIn, signOut, handlers"
  - "Middleware wraps auth() with pathname-based protection for /admin and /api/admin"
  - "SessionProviderWrapper client component for admin layout session context"

requirements-completed: [ADMN-09]

# Metrics
duration: 1min
completed: 2026-06-17
---

# Phase 8 Plan 01: Admin Auth & Schema Summary

**NextAuth.js v5 Credentials provider with JWT sessions, middleware route protection, login page, and admin schema tables (articleVersions, adminSettings)**

## Performance

- **Duration:** 1 min (verification-only -- code was pre-implemented)
- **Started:** 2026-06-17T14:22:16Z
- **Completed:** 2026-06-17T14:23:00Z
- **Tasks:** 2
- **Files verified:** 8

## Accomplishments

- Verified NextAuth.js v5 Credentials provider configured with ADMIN_PASSWORD env var and JWT sessions (8-hour expiry)
- Confirmed middleware protects /admin/* (redirect to login) and /api/admin/* (401 Unauthorized) while allowing /admin/login through
- Validated login page renders centered card with "Admin Access" heading, password form with show/hide toggle, and error handling
- Confirmed articleVersions (article version history) and adminSettings (key-value config) tables in Drizzle schema

## Task Commits

All tasks were pre-committed in a prior execution session. Verification confirmed all must_haves are satisfied.

1. **Task 1: Auth config, API route, middleware, schema extensions** - pre-committed
2. **Task 2: Login page, login form, session provider** - pre-committed

## Files Created/Modified

- `src/auth.ts` - NextAuth configuration: Credentials provider comparing password against ADMIN_PASSWORD, JWT strategy with 28800s (8h) maxAge, custom signIn page, production NEXTAUTH_SECRET validation
- `app/api/auth/[...nextauth]/route.ts` - NextAuth API route handler exporting GET and POST
- `middleware.ts` - Route protection: auth() wrapper with matcher for /admin/:path* and /api/admin/:path*, redirects unauthenticated /admin to /admin/login, returns 401 for unauthenticated /api/admin
- `app/admin/login/page.tsx` - Server component rendering centered login card with "AI Daily" branding, "Admin Access" heading, LoginForm child
- `app/admin/login/LoginForm.tsx` - Client component with password input (show/hide toggle), signIn("credentials") call, error display ("Invalid password. Please try again."), redirect to /admin on success
- `app/components/admin/SessionProvider.tsx` - Client wrapper exporting SessionProviderWrapper that wraps children with NextAuth's SessionProvider
- `src/db/schema.ts` - Added articleVersions (id, articleId FK, title, summary, content, version, createdAt) and adminSettings (id, key unique, value, updatedAt) tables
- `package.json` - Added next-auth@5.0.0-beta.31 dependency

## Must-Have Verification

| Must-Have | Status | Evidence |
|-----------|--------|----------|
| Admin can log in at /admin/login with ADMIN_PASSWORD | PASS | auth.ts Credentials provider compares against process.env.ADMIN_PASSWORD |
| Unauthenticated /admin/* redirects to /admin/login | PASS | middleware.ts lines 14-17: redirect when !isLoggedIn and startsWith("/admin") |
| Unauthenticated /api/admin/* returns 401 | PASS | middleware.ts lines 20-22: 401 JSON when !isLoggedIn and startsWith("/api/admin") |
| Successful login redirects to /admin | PASS | LoginForm.tsx line 28: router.push('/admin') when result?.ok |
| Session expires after 8 hours | PASS | auth.ts line 29: maxAge: 28800 |
| articleVersions and adminSettings tables exist | PASS | schema.ts lines 338-356: both tables defined with correct columns |

## Key Link Verification

| From | To | Pattern | Status |
|------|----|---------|--------|
| middleware.ts | src/auth.ts | `import { auth } from "@/src/auth"` | PASS (line 1) |
| LoginForm.tsx | next-auth/react | `signIn('credentials', ...)` | PASS (line 20) |
| admin/layout.tsx | SessionProvider.tsx | `SessionProviderWrapper` wraps children | PASS (lines 4, 12) |

## Decisions Made

- NextAuth v5 beta (5.0.0-beta.31) chosen for native App Router support with credentials provider
- JWT session strategy (not database sessions) -- sufficient for single-admin use case
- 8-hour session expiry balances security with admin workflow convenience
- Production NEXTAUTH_SECRET validation at module load prevents silent auth failures

## Deviations from Plan

None -- plan executed exactly as written. All code was pre-implemented and verified.

## Issues Encountered

None -- all files existed and satisfied acceptance criteria.

## User Setup Required

Two environment variables must be configured:
- `ADMIN_PASSWORD` -- Set a strong password in .env file
- `NEXTAUTH_SECRET` -- Generate with: `openssl rand -base64 32`, add to .env file

## Next Phase Readiness

- Auth foundation complete for all subsequent admin plans (02-07)
- articleVersions and adminSettings tables available for article editing and pipeline configuration plans
- SessionProviderWrapper available for admin layout integration
- Middleware already protects future /admin/* and /api/admin/* routes

## Self-Check: PASSED

- [x] 08-01-SUMMARY.md exists at `.planning/phases/08-admin-operations/08-01-SUMMARY.md`
- [x] Commit c76aa69 found in git log

---
*Phase: 08-admin-operations*
*Completed: 2026-06-17*
