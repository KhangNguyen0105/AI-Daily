# Phase 11 Context: Digest & Free Offers Enhancement

## Problem Statement

The current digest system has several issues with how free offers and promotions are displayed:

1. **Markdown formatting leaks**: Raw markdown like `**Free Tier Promotions:**` appears in the highlight banner
2. **Free offers not prominent**: Free models are buried in text paragraphs, not visually distinct
3. **No direct provider links**: Users can't click through to the provider's pricing page
4. **Deleted /promotions page**: Need to remove references and redesign approach

## User Requirements

1. **Free must always be first** — most prominent section at top of banner
2. **Link directly to provider pages** — not internal /promotions page
3. **Clean markdown rendering** — no raw `**...**` in displayed text
4. **Delete /promotions page** — no longer needed

## Current State

### Files Modified (uncommitted)
- `app/layout.tsx` — Fixed scrolling (`min-h-screen` instead of `h-screen overflow-hidden`)
- `app/components/DigestArticle.tsx` — Added highlight banner with Free/Promotions sections
- `app/components/TopNav.tsx` — Removed "Promotions" link
- `app/digest/page.tsx` — Added Free/Promos badges to archive list

### Files Deleted
- `app/promotions/page.tsx`
- `app/components/PromotionsPageClient.tsx`

### Known Issues
1. Markdown `**bold**` still leaking in some cases
2. Banner is text-based, not visually distinctive enough
3. Provider links mapping is hardcoded, not dynamic
4. No integration with promotions database table

## Technical Context

### Database Tables
- `extractions` — model pricing data (source_id, model_name, input/output prices)
- `promotions` — free tiers, discounts, beta access (source_id, model_pattern, type, description)
- `sources` — provider info (name, url)
- `articles` — daily digest content (markdown format)

### Current Architecture
- Article content is stored as Markdown in `articles.content`
- Highlights are extracted by parsing markdown text at runtime
- No structured data for free offers in the article itself

### Proposed Architecture
- Query `promotions` table directly for free offers
- Join with `sources` table for provider URLs
- Render structured cards instead of text list
- Keep markdown parsing as fallback for edge cases

## Success Criteria

1. Free models displayed as prominent cards with green "FREE" badge
2. Each card links directly to provider pricing page
3. Promotions section shows discounts with provider links
4. No raw markdown formatting visible in UI
5. Mobile responsive design
6. Works in both light and dark themes
