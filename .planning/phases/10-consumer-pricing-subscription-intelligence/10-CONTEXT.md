# Phase 10: Consumer Pricing & Subscription Intelligence — Context

## Domain

Expand data collection beyond API pricing to include consumer-facing subscription plans and their free trials, promotional offers, and beta programs from 10+ AI providers.

## Decisions

### D-01: Source Coverage — 10+ Consumer AI Products

Crawl the following consumer pricing pages:

**Tier 1 (must-have):**
- ChatGPT: openai.com/chatgpt or chatgpt.com/pricing
- Gemini: one.google.com or gemini.google.com/advanced
- Claude: claude.ai/pro or anthropic.com/claude
- Perplexity: perplexity.ai/pro
- Copilot: copilot.microsoft.com

**Tier 2 (should-have):**
- Poe: poe.com (subscription plans)
- Grok: x.com/i/grok (X Premium+ integration)
- You.com: you.com/pro
- Phind: phind.com (Phind Pro)
- Cursor: cursor.com/pricing (developer tool with AI)

**Crawl approach:** Same Playwright-based crawler as API adapters. Each provider gets a dedicated consumer adapter class.

### D-02: Schema — Separate `subscription_plans` Table

Create a new `subscription_plans` table (NOT extending promotions table):

```sql
subscription_plans (
  id SERIAL PRIMARY KEY,
  source_id INT REFERENCES sources(id),
  provider_name VARCHAR(100) NOT NULL,
  plan_name VARCHAR(255) NOT NULL,        -- e.g. "ChatGPT Plus", "Claude Pro"
  monthly_price DECIMAL(10,2),             -- USD monthly
  annual_price DECIMAL(10,2),              -- USD annual (if available)
  annual_monthly_price DECIMAL(10,2),      -- effective monthly when billed annually
  free_trial_days INT,                     -- e.g. 7, 14, 30
  free_trial_conditions TEXT,              -- e.g. "New users only", "Credit card required"
  key_features JSONB,                      -- array of feature strings
  currency VARCHAR(10) DEFAULT 'USD',
  source_url TEXT,
  start_date TIMESTAMP,                    -- promotion start
  end_date TIMESTAMP,                      -- promotion end
  crawled_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_id, plan_name)
)
```

Key design choices:
- Separate from `promotions` table — subscription plans are persistent products, not time-limited offers
- `key_features` as JSONB array for flexible feature storage
- `free_trial_days` as integer for easy comparison/sorting
- Unique constraint on `(source_id, plan_name)` for upsert

### D-03: Display — Dedicated `/subscriptions` Page

- New page route: `/subscriptions`
- Card grid layout (similar to `/promotions` page)
- Each card shows: provider logo, plan name, monthly/annual price, free trial badge, key features list
- Filter pills: All / Free Trial Available / Monthly / Annual
- Sort: Price (low→high, high→low), Free trial duration
- Add "Subscriptions" link to TopNav navigation
- Do NOT mix with API pricing in PricingTable — different data model

### D-04: Free Trial Tracking — Metadata Only

- Capture: trial duration (days), conditions (text), start/end dates if published
- Display: "Free trial: 30 days" badge on subscription cards
- Also surface in `/promotions` page as type `free_trial` (new enum value)
- No user-level tracking — this is read-only public data
- No expiry alerts — out of scope for v1

## Canonical Refs

- `src/providers/base.ts` — ProviderAdapter pattern to follow for consumer adapters
- `src/providers/schemas.ts` — Shared Zod schemas (will need consumer pricing schema)
- `src/db/schema.ts` — Database schema (add subscription_plans table)
- `src/pipeline/workers/extract.ts` — Extract worker pattern (upsert logic)
- `app/promotions/page.tsx` — Reference for similar card grid page
- `app/components/PromotionsPageClient.tsx` — Reference component pattern

## Code Context

**Reusable patterns:**
- ProviderAdapter base class with crawl/extract/normalize pattern
- Playwright-based crawling (base.ts `crawl()` method)
- Vercel AI SDK `generateObject()` for structured extraction
- Zod schema validation for extraction output
- Drizzle ORM with upsert (`onConflictDoUpdate`)
- Card grid UI pattern from PromotionsPageClient

**New components needed:**
- Consumer adapter classes (10+ providers)
- `subscription_plans` table + migration
- `/subscriptions` page + SubscriptionCard component
- TopNav link addition

## Deferred Ideas

- Price comparison between API and consumer plans (e.g., "ChatGPT Plus $20/mo vs API $0.005/1K tokens")
- Historical subscription price tracking (price change alerts)
- User trial tracking with expiry notifications
- Side-by-side subscription plan comparison tool
