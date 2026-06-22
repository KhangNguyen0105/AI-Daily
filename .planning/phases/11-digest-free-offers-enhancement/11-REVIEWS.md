---
phase: 11
reviewers: [codex]
reviewed_at: "2026-06-22T14:00:00.000Z"
plans_reviewed: ["11-01-PLAN.md"]
---

# Cross-AI Plan Review — Phase 11

## Codex Review

**Model:** gpt-5.5 (OpenAI Codex v0.141.0)

### Summary

Plan 11-01 is a solid verification and cleanup plan for Phase 11, but it reads more like a post-implementation QA plan than a full implementation plan. The test coverage targets the right components and behaviors, and the visual QA checkpoint is appropriate because the phase is UI-heavy. The main risk is that the plan assumes the new digest card components, routing changes, markdown cleanup, and `/promotions` removal already exist or are covered elsewhere. If this is the only plan for the phase, it is incomplete.

### Strengths

- Covers the key user-facing requirements: structured free offer cards, promotion cards, provider links, markdown cleanup, responsive layout, and dark mode.
- Includes component-level tests for the main UI building blocks instead of relying only on page-level assertions.
- Explicitly verifies stale cleanup by deleting the old promotions page test and updating subscription pipeline expectations.
- Good visual QA checkpoint for layout, theme, and card styling, which are hard to fully validate with unit tests.
- `must_haves.truths` are concrete and testable, especially around empty/loading/error states.

### Concerns

- **HIGH:** The plan does not include implementation tasks for the actual digest redesign. It only lists tests, cleanup, and visual QA. If no earlier plan creates `FreeOfferCard`, `PromotionCard`, `FreeOffersSection`, `PromotionsSection`, and updates the digest page, this plan cannot achieve the phase goal.
- **HIGH:** Deleting `/promotions` is listed only indirectly through stale test cleanup. The plan should explicitly cover route deletion, navigation/link cleanup, sitemap or metadata cleanup if present, and handling any stale inbound references.
- **MEDIUM:** Direct provider links need validation. The plan does not mention URL sanitization, allowed protocols, missing URLs, broken provider links, or `target="_blank"` security attributes such as `rel="noopener noreferrer"`.
- **MEDIUM:** Markdown cleanup is listed as a truth, but the plan does not specify whether markdown is stripped, rendered safely, or normalized at the data layer. This matters for XSS risk if provider/promotion text is rendered from external feeds.
- **MEDIUM:** `route.test.ts` is vague. It should specify whether it tests the digest route, deleted `/promotions` route, API route, or page rendering behavior.
- **LOW:** The responsive grid expectations are good, but unit tests usually cannot prove real responsive behavior unless using class assertions. Visual or browser tests should cover actual viewport behavior.
- **LOW:** Loading and error states may not be needed for purely server-rendered static sections. If the digest page fetches server-side data, these states should map to the actual rendering model.

### Suggestions

- Add explicit implementation coverage or confirm this plan depends on a prior implementation plan.
- Add a cleanup task for deleting `/promotions` route files and removing links from navigation, tests, sitemap, redirects, and docs where applicable.
- Specify link behavior: direct provider URL, safe fallback when missing, external-link attributes, and no internal `/promotions` links.
- Define markdown handling clearly: render sanitized markdown, strip markdown markers, or transform known markdown to plain text.
- Split `route.test.ts` into clearer assertions, such as digest page renders free offers first, `/promotions` no longer exists, and provider links point externally.
- Add at least one integration/browser test or screenshot QA item for mobile/tablet/desktop layout, since responsive behavior is central to the phase.
- Include data edge cases: no free offers, no promotions, mixed offers, long provider names, long promotion copy, missing discount labels, expired promotions, and duplicate provider offers.

### Risk Assessment

**Overall risk: MEDIUM.**

The verification targets are sensible and mostly aligned with UI-04 and UI-05, but the plan is incomplete if it stands alone. The biggest risks are unplanned implementation work, incomplete `/promotions` removal, and unsafe or inconsistent rendering of external provider content and links. With explicit implementation dependencies and stronger route/link/markdown coverage, this would become a low-risk QA and cleanup plan.

---

## Antigravity Review

**Status:** Failed — no output produced. The agy CLI did not return a review for this workspace.

---

## Consensus Summary

### Agreed Strengths
- Comprehensive test coverage for new UI components
- Visual QA checkpoint appropriate for UI-heavy phase
- must_haves.truths are concrete and testable

### Agreed Concerns
- Plan assumes implementation is already complete (HIGH)
- /promotions deletion coverage is indirect (HIGH)
- Provider link security attributes not explicitly verified (MEDIUM)

### Divergent Views
- Only one reviewer produced output — no consensus data available

---

## Recommendations for /gsd-plan-phase --reviews

The codex review raised valid concerns that should be addressed:

1. **Clarify implementation dependency** — The plan should explicitly state that implementation was completed before planning began, or reference a prior implementation plan.

2. **Expand /promotions cleanup** — Add explicit task for:
   - Verifying route file deletion
   - Checking TopNav for stale links (already done)
   - Grepping for remaining /promotions references

3. **Add link security verification** — Ensure all provider links have:
   - `target="_blank"`
   - `rel="noopener noreferrer"`
   - Valid URL format (not empty or malformed)

4. **Clarify markdown handling** — Document that:
   - Article content uses react-markdown with custom components
   - Free/promotion data comes from database (not markdown parsing)
   - No user-generated content is rendered unsanitized
