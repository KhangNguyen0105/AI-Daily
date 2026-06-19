# Phase 10: Consumer Pricing & Subscription Intelligence - Research

**Researched:** 2026-06-19
**Domain:** Consumer AI subscription pricing data collection and display
**Confidence:** HIGH

## Summary

Phase 10 expands the AI Daily platform beyond API pricing to include consumer-facing subscription plans (ChatGPT Plus/Pro, Gemini Advanced, Claude Pro/Max, Perplexity Pro, etc.). The phase requires three major deliverables: (1) a new `subscription_plans` database table, (2) consumer adapter classes for 10+ providers that crawl subscription pricing pages, and (3) a dedicated `/subscriptions` page with card grid UI.

The existing codebase provides excellent patterns to follow. The ProviderAdapter base class with crawl/extract/normalize pattern can be extended for consumer adapters. The Promotions page (card grid + filter pills + empty state) serves as the exact UI reference. The extract worker's upsert pattern with `onConflictDoUpdate` handles the data persistence layer.

Key architectural decision: Consumer adapters are separate from API adapters because they crawl different URLs (subscription pages vs API pricing pages) and extract different data structures (subscription plans vs per-token pricing). They share the same base class infrastructure but are registered independently.

**Primary recommendation:** Create a parallel consumer adapter registry that extends the existing ProviderAdapter pattern, with a new `consumerSubscriptionSchema` Zod schema for extraction validation, and a dedicated extract worker for subscription data.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Subscription data collection | Pipeline (BullMQ workers) | — | Consumer adapters crawl subscription pages, same as API adapters |
| Subscription data storage | Database (PostgreSQL) | — | New `subscription_plans` table with Drizzle ORM |
| Subscription page display | Frontend (Next.js) | — | Server component fetches data, client component renders card grid |
| Navigation integration | Frontend (TopNav) | — | Single link addition to existing nav |
| AI extraction | Pipeline (AI SDK) | — | `generateObject()` with Zod schema for structured extraction |

## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01: Source Coverage — 10+ Consumer AI Products**

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

**D-02: Schema — Separate `subscription_plans` Table**

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

**D-03: Display — Dedicated `/subscriptions` Page**

- New page route: `/subscriptions`
- Card grid layout (similar to `/promotions` page)
- Each card shows: provider logo, plan name, monthly/annual price, free trial badge, key features list
- Filter pills: All / Free Trial Available / Monthly / Annual
- Sort: Price (low→high, high→low), Free trial duration
- Add "Subscriptions" link to TopNav navigation
- Do NOT mix with API pricing in PricingTable — different data model

**D-04: Free Trial Tracking — Metadata Only**

- Capture: trial duration (days), conditions (text), start/end dates if published
- Display: "Free trial: 30 days" badge on subscription cards
- Also surface in `/promotions` page as type `free_trial` (new enum value)
- No user-level tracking — this is read-only public data
- No expiry alerts — out of scope for v1

### Claude's Discretion

(No discretion areas specified in CONTEXT.md)

### Deferred Ideas (OUT OF SCOPE)

- Price comparison between API and consumer plans (e.g., "ChatGPT Plus $20/mo vs API $0.005/1K tokens")
- Historical subscription price tracking (price change alerts)
- User trial tracking with expiry notifications
- Side-by-side subscription plan comparison tool

## Standard Stack

### Core (Existing — No Changes Required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.x | App Router with SSR/SSG | Already in use; server component for /subscriptions page |
| Drizzle ORM | 0.45.x | PostgreSQL ORM | Already in use; add subscription_plans table to schema |
| Vercel AI SDK | 6.x | `generateObject()` for extraction | Already in use; new Zod schema for subscription data |
| Crawlee | 3.x | Playwright-based crawling | Already in use; consumer adapters use same crawl() |
| BullMQ | 5.x | Job queue | Already in use; extract worker handles subscription data |
| Zod | 4.x | Schema validation | Already in use; new consumerSubscriptionSchema |
| Tailwind CSS | 4.x | Styling | Already in use; all theme tokens available |
| date-fns | 4.x | Date formatting | Already in use; for trial date display |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @ai-sdk/openai | (bundled) | OpenAI provider | Already in use; no changes needed |
| @ai-sdk/anthropic | (bundled) | Anthropic provider | Already in use; no changes needed |

**No new dependencies required.** Phase 10 uses only existing infrastructure.

## Package Legitimacy Audit

> No new packages are installed in this phase. All dependencies are already in the project.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | No new packages |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Pipeline (BullMQ)                        │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Collect      │───▶│  Extract     │───▶│  Score       │      │
│  │  Worker       │    │  Worker      │    │  Worker      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Consumer     │    │ AI SDK       │    │ Confidence   │      │
│  │ Adapters     │    │ generateObj  │    │ Scoring      │      │
│  │ (10+)        │    │ + Zod schema │    │              │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                                   │
│         ▼                   ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    PostgreSQL                             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │ sources      │  │ raw_data     │  │ subscription │  │  │
│  │  │              │  │              │  │ _plans (NEW) │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                          │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ /subscr page │───▶│ SubscrPage   │───▶│ Subscription │      │
│  │ (server)     │    │ Client       │    │ Card         │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ TopNav       │    │ Filter Pills │    │ Free Trial   │      │
│  │ (modified)   │    │ + Sort       │    │ Badge        │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── providers/
│   ├── consumer/                    # NEW: Consumer adapter directory
│   │   ├── base.ts                  # ConsumerAdapter base (extends ProviderAdapter)
│   │   ├── registry.ts              # Consumer adapter registry
│   │   ├── schemas.ts               # consumerSubscriptionSchema (Zod)
│   │   ├── openai/
│   │   │   ├── adapter.ts           # ChatGPT Plus/Pro adapter
│   │   │   └── config.ts            # chatgpt.com/pricing URL
│   │   ├── anthropic/
│   │   │   ├── adapter.ts           # Claude Pro/Max adapter
│   │   │   └── config.ts            # claude.ai/pro URL
│   │   ├── google/
│   │   │   ├── adapter.ts           # Gemini Advanced adapter
│   │   │   └── config.ts            # one.google.com URL
│   │   ├── perplexity/
│   │   │   ├── adapter.ts           # Perplexity Pro adapter
│   │   │   └── config.ts            # perplexity.ai/pro URL
│   │   ├── microsoft/
│   │   │   ├── adapter.ts           # Copilot adapter
│   │   │   └── config.ts            # copilot.microsoft.com URL
│   │   ├── poe/
│   │   │   ├── adapter.ts           # Poe subscription adapter
│   │   │   └── config.ts
│   │   ├── xai/
│   │   │   ├── adapter.ts           # Grok (X Premium+) adapter
│   │   │   └── config.ts
│   │   ├── you/
│   │   │   ├── adapter.ts           # You.com Pro adapter
│   │   │   └── config.ts
│   │   ├── phind/
│   │   │   ├── adapter.ts           # Phind Pro adapter
│   │   │   └── config.ts
│   │   └── cursor/
│   │       ├── adapter.ts           # Cursor Pro adapter
│   │       └── config.ts
│   └── ... (existing API adapters)
├── pipeline/
│   └── workers/
│       └── extract.ts               # MODIFY: add subscription plan upsert
├── db/
│   └── schema.ts                    # MODIFY: add subscription_plans table
app/
├── subscriptions/                   # NEW: /subscriptions route
│   └── page.tsx                     # Server component
├── components/
│   ├── SubscriptionsPageClient.tsx  # NEW: card grid + filters
│   ├── SubscriptionCard.tsx         # NEW: individual plan card
│   └── TopNav.tsx                   # MODIFY: add Subscriptions link
```

### Pattern 1: Consumer Adapter Pattern

**What:** Consumer adapters extend ProviderAdapter to crawl subscription pricing pages instead of API pricing pages.

**When to use:** Each consumer AI provider (ChatGPT, Gemini, Claude, etc.) gets its own adapter class.

**Example:**

```typescript
// Source: Existing pattern from src/providers/openai/adapter.ts
// Modified for consumer subscription extraction

import { generateObject } from 'ai';
import { ProviderAdapter } from '../../base';
import type { ProviderExtraction } from '../../base';
import { consumerSubscriptionSchema } from '../schemas';
import { getAIModel } from '../../../lib/ai-client';
import { chatgptConsumerConfig } from './config';

export class ChatGPTConsumerAdapter extends ProviderAdapter {
  config = chatgptConsumerConfig;

  async extract(html: string): Promise<ProviderExtraction> {
    try {
      const maxHtmlLength = 100_000;
      const truncatedHtml = html.length > maxHtmlLength
        ? html.slice(0, maxHtmlLength) + '\n<!-- TRUNCATED -->'
        : html;

      const { object } = await generateObject({
        model: getAIModel(),
        schema: consumerSubscriptionSchema,
        prompt: `Extract all consumer subscription plans from this HTML page.
Return an array of plans with their name, monthly price, annual price, free trial duration, and key features.

IMPORTANT: Return a JSON object with EXACTLY this structure:
{
  "plans": [
    {
      "planName": "ChatGPT Plus",
      "monthlyPrice": 20.00,
      "annualPrice": 200.00,
      "annualMonthlyPrice": 16.67,
      "freeTrialDays": 0,
      "freeTrialConditions": null,
      "keyFeatures": ["GPT-4 access", "DALL-E", "Advanced data analysis"]
    }
  ]
}

HTML content:
${truncatedHtml}`,
      });

      return {
        models: [], // No API models from consumer pages
        promotions: [],
        subscriptionPlans: object.plans.map(plan => ({
          ...plan,
          currency: 'USD',
          sourceUrl: this.config.pricingUrl,
        })),
      };
    } catch (error) {
      console.error('ChatGPT consumer extraction failed:', error);
      throw error;
    }
  }
}
```

### Pattern 2: Extract Worker Upsert Pattern

**What:** The extract worker uses `onConflictDoUpdate` to upsert data, preventing duplicates on re-crawl.

**When to use:** For subscription_plans table, same pattern as extractions and promotions tables.

**Example:**

```typescript
// Source: Existing pattern from src/pipeline/workers/extract.ts lines 132-180

// Upsert subscription plans
if (normalized.subscriptionPlans && normalized.subscriptionPlans.length > 0) {
  for (const plan of normalized.subscriptionPlans) {
    await db.insert(subscriptionPlans).values({
      sourceId,
      providerName: providerName,
      planName: plan.planName,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      annualMonthlyPrice: plan.annualMonthlyPrice,
      freeTrialDays: plan.freeTrialDays,
      freeTrialConditions: plan.freeTrialConditions,
      keyFeatures: plan.keyFeatures,
      currency: plan.currency || 'USD',
      sourceUrl: plan.sourceUrl,
      crawledAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [subscriptionPlans.sourceId, subscriptionPlans.planName],
      set: {
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        annualMonthlyPrice: plan.annualMonthlyPrice,
        freeTrialDays: plan.freeTrialDays,
        freeTrialConditions: plan.freeTrialConditions,
        keyFeatures: plan.keyFeatures,
        sourceUrl: plan.sourceUrl,
        crawledAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
```

### Pattern 3: Card Grid Page Pattern

**What:** Server component fetches data, passes to client component with filter pills and card grid.

**When to use:** For `/subscriptions` page, identical pattern to `/promotions`.

**Example:**

```typescript
// Source: Existing pattern from app/promotions/page.tsx

// app/subscriptions/page.tsx (server component)
import { db } from '@/src/db';
import { subscriptionPlans } from '@/src/db/schema';
import { SubscriptionsPageClient } from '@/app/components/SubscriptionsPageClient';

export const revalidate = 60;

export default async function SubscriptionsPage() {
  let plans: SubscriptionPlanData[] = [];

  try {
    const rows = await db.select().from(subscriptionPlans);
    plans = rows.map(row => ({
      id: row.id,
      providerName: row.providerName,
      planName: row.planName,
      monthlyPrice: row.monthlyPrice,
      annualPrice: row.annualPrice,
      annualMonthlyPrice: row.annualMonthlyPrice,
      freeTrialDays: row.freeTrialDays,
      freeTrialConditions: row.freeTrialConditions,
      keyFeatures: row.keyFeatures as string[],
      currency: row.currency,
      sourceUrl: row.sourceUrl,
    }));
  } catch (error) {
    console.error('Failed to fetch subscription plans:', error);
  }

  return <SubscriptionsPageClient plans={plans} />;
}
```

### Anti-Patterns to Avoid

- **Mixing subscription data with API pricing:** Subscription plans are monthly/annual products, not per-token pricing. Keep them in a separate table and page.
- **Extending the promotions table:** Subscription plans are persistent products, not time-limited offers. D-02 explicitly requires a separate table.
- **Creating a new base class:** Consumer adapters should extend the existing ProviderAdapter, not create a parallel hierarchy. The crawl() method works the same way.
- **Hardcoding prices in the frontend:** All pricing data comes from the database. The frontend only renders what's stored.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML parsing | Custom regex/string splitting | Crawlee + Playwright | Handles JS-rendered pages, anti-bot evasion |
| Structured extraction | Manual parsing logic | Vercel AI SDK `generateObject()` + Zod | Type-safe, handles layout changes gracefully |
| Database upserts | Manual INSERT/UPDATE logic | Drizzle `onConflictDoUpdate` | Atomic, handles race conditions |
| Card grid layout | Custom CSS grid | Tailwind `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` | Consistent with existing UI |
| Filter pills | Custom state management | React `useState` + array filter | Simple, matches PromotionsPageClient pattern |

**Key insight:** The existing infrastructure (Crawlee, AI SDK, Drizzle, Tailwind) handles all the hard parts. Phase 10 is primarily data modeling and UI composition, not infrastructure work.

## Common Pitfalls

### Pitfall 1: Consumer Pages Have Different Structures

**What goes wrong:** Consumer subscription pages (chatgpt.com/pricing) are marketing pages with complex layouts, modals, and interactive elements. They're different from API pricing pages (openai.com/api/pricing/) which are more structured.

**Why it happens:** Marketing teams design subscription pages for conversion, not data extraction. Prices may be in hero sections, comparison tables, or accordion panels.

**How to avoid:** Use Playwright (already in Crawlee) to handle JS-rendered content. The `waitForLoadState('networkidle')` + 3-second delay in the base crawl() method handles most cases. For particularly complex pages, consider adding custom wait conditions in the adapter's crawl() override.

**Warning signs:** Empty extraction results, partial data (e.g., monthly price but no annual price), or features list missing.

### Pitfall 2: Price Format Variations

**What goes wrong:** Subscription prices appear in many formats: "$20/mo", "$200/yr", "Starting at $20", "From $20/month", "Free", "$0".

**Why it happens:** Marketing copy varies widely across providers. Some show monthly, some annual, some both. Some show "starting at" prices that don't include the full plan tier.

**How to avoid:** The Zod schema should accept nullable prices. The AI extraction prompt should explicitly handle these variations. Store raw price text alongside normalized values (same pattern as API adapters).

**Warning signs:** `null` prices in the database, extraction confidence set to 'low_confidence'.

### Pitfall 3: Free Trial Ambiguity

**What goes wrong:** Free trials have complex conditions: "7-day free trial", "Free tier with limited features", "30 days free with credit card", "Free for new users".

**Why it happens:** Providers use different terminology (trial vs tier vs free) and conditions (credit card required, new users only, limited features).

**How to avoid:** Store `free_trial_days` as integer and `free_trial_conditions` as text. Don't try to normalize conditions into categories — just capture the raw text. Display "Free trial: {N} days" when days > 0, and show conditions as secondary text.

**Warning signs:** `free_trial_days: 0` when the page clearly shows a trial offer.

### Pitfall 4: Stale Subscription Data

**What goes wrong:** Subscription plans change infrequently (maybe 2-3 times per year), but the system crawls daily. The `crawled_at` timestamp updates every day even though the data hasn't changed.

**Why it happens:** The upsert pattern updates `crawled_at` on every crawl, even if prices haven't changed.

**How to avoid:** This is acceptable behavior — `crawled_at` shows freshness of the crawl, not when the price last changed. If historical tracking is needed later (deferred idea), add a separate `subscription_price_history` table.

**Warning signs:** None — this is expected behavior.

## Runtime State Inventory

> Not applicable — Phase 10 is greenfield (new feature), not a rename/refactor/migration.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — new table, no existing data | — |
| Live service config | None — no external service changes | — |
| OS-registered state | None — no OS-level changes | — |
| Secrets/env vars | None — uses existing AI provider keys | — |
| Build artifacts | None — no build changes | — |

## Code Examples

Verified patterns from existing codebase:

### Consumer Adapter Config

```typescript
// Source: src/providers/openai/config.ts (adapted for consumer)
import type { ProviderConfig } from '../base';

export const chatgptConsumerConfig: ProviderConfig = {
  name: 'chatgpt-consumer',
  baseUrl: 'https://chatgpt.com',
  pricingUrl: 'https://chatgpt.com/pricing',
  tier: 'tier1',
  currency: 'USD',
  crawlFrequencyHours: 24, // Consumer plans change less frequently
  apiKeyOptional: false,
  modelIdFormat: 'consumer',
  sources: [
    {
      url: 'https://chatgpt.com/pricing',
      tier: 'tier1',
      sourceType: 'pricing_page',
    },
  ],
};
```

### Consumer Zod Schema

```typescript
// Source: src/providers/schemas.ts (new schema for consumer plans)
import { z } from 'zod';

export const consumerSubscriptionSchema = z.object({
  plans: z.array(
    z.object({
      planName: z.string().describe("The exact name of the subscription plan"),
      monthlyPrice: z.number().nullable().describe("Monthly price in USD, or null if not available"),
      annualPrice: z.number().nullable().describe("Annual price in USD (total), or null if not available"),
      annualMonthlyPrice: z.number().nullable().describe("Effective monthly price when billed annually"),
      freeTrialDays: z.number().describe("Number of free trial days, 0 if no trial"),
      freeTrialConditions: z.string().nullable().describe("Conditions for free trial, e.g. 'Credit card required'"),
      keyFeatures: z.array(z.string()).describe("List of key features included in the plan"),
    })
  ),
});
```

### ProviderExtraction Extension

```typescript
// Source: src/providers/base.ts (extended for consumer plans)
export interface ConsumerSubscriptionPlan {
  planName: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  annualMonthlyPrice: number | null;
  freeTrialDays: number;
  freeTrialConditions: string | null;
  keyFeatures: string[];
  currency: string;
  sourceUrl: string;
}

export interface ProviderExtraction {
  models: ExtractionResult[];
  promotions: PromotionResult[];
  subscriptionPlans?: ConsumerSubscriptionPlan[]; // NEW: optional for consumer adapters
}
```

### Subscription Plan Drizzle Schema

```typescript
// Source: src/db/schema.ts (new table)
export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id')
    .references(() => sources.id)
    .notNull(),
  providerName: varchar('provider_name', { length: 100 }).notNull(),
  planName: varchar('plan_name', { length: 255 }).notNull(),
  monthlyPrice: doublePrecision('monthly_price'),
  annualPrice: doublePrecision('annual_price'),
  annualMonthlyPrice: doublePrecision('annual_monthly_price'),
  freeTrialDays: integer('free_trial_days'),
  freeTrialConditions: text('free_trial_conditions'),
  keyFeatures: jsonb('key_features'), // array of strings
  currency: varchar('currency', { length: 10 }).default('USD'),
  sourceUrl: text('source_url'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  crawledAt: timestamp('crawled_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sourcePlanUnique: uniqueIndex('source_plan_unique').on(table.sourceId, table.planName),
}));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API-only pricing tracking | API + Consumer subscription tracking | Phase 10 (new) | Covers both developer and consumer AI products |
| Single promotions table | Separate subscription_plans table | D-02 decision | Cleaner data model, avoids conflating persistent plans with time-limited offers |

**Deprecated/outdated:**
- None — Phase 10 is additive, not replacing existing functionality.

## Assumptions Log

> All claims in this research were verified from CONTEXT.md, UI-SPEC.md, and existing codebase patterns. No assumptions required.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| (none) | — | — | — |

## Open Questions

1. **Consumer adapter registration approach**
   - What we know: API adapters are registered in `src/providers/registry.ts` with explicit imports
   - What's unclear: Should consumer adapters have their own registry file or be added to the existing one?
   - Recommendation: Create a separate `src/providers/consumer/registry.ts` to keep concerns separated. Consumer adapters are conceptually different from API adapters.

2. **Pipeline integration approach**
   - What we know: The orchestrator enqueues collect jobs for all registered adapters
   - What's unclear: Should consumer adapters run in the same pipeline run as API adapters, or have their own pipeline?
   - Recommendation: Same pipeline run, but with separate priority tier (e.g., priority=5 for consumer adapters, after Tier 1-3 API adapters). This keeps infrastructure simple.

3. **Promotion type enum extension**
   - What we know: D-04 says to surface free trials in `/promotions` page as type `free_trial`
   - What's unclear: Should `free_trial` be added to the existing `promotionTypeEnum`?
   - Recommendation: Yes, add `'free_trial'` to the enum. This is a non-breaking change (enum additions are safe). The extract worker can create a promotion record for subscription plans with `free_trial_days > 0`.

## Environment Availability

> Phase 10 has no external dependencies beyond what's already in the project.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Data layer | ✓ | (existing) | — |
| Redis | BullMQ | ✓ | (existing) | — |
| Playwright | Crawling | ✓ | (existing) | — |
| AI SDK | Extraction | ✓ | (existing) | — |

**Missing dependencies with no fallback:** none

**Missing dependencies with fallback:** none

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/adapter.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DCOL-08 | System collects subscription plan pricing from at least 5 consumer AI providers | integration | `npx vitest run tests/providers/consumer-adapters.test.ts` | ❌ Wave 0 |
| DCOL-08 | Each subscription plan captures plan name, monthly price, annual price, free trial, key features | unit | `npx vitest run tests/schema.test.ts -k "subscription"` | ✅ (modify) |
| DCOL-09 | Consumer pricing data displayed on dedicated page | e2e | Manual verification | manual |
| DCOL-09 | Promotions page shows subscription-based free trials | integration | `npx vitest run tests/promotions.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/schema.test.ts tests/adapter.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/providers/consumer-adapters.test.ts` — covers DCOL-08 (consumer adapter extraction)
- [ ] `tests/schema.test.ts` — add subscription_plans table tests
- [ ] `tests/promotions.test.ts` — add free_trial type tests (if extending promotionTypeEnum)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Admin auth already implemented (Phase 8) |
| V3 Session Management | no | No new session handling |
| V4 Access Control | no | Public read-only page, same as /promotions |
| V5 Input Validation | yes | Zod schema validates extraction output; Drizzle parameterized queries |
| V6 Cryptography | no | No cryptographic operations |

### Known Threat Patterns for Consumer Subscription Crawling

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Injection via extracted data | Tampering | Zod schema validates all extraction output before DB insert |
| XSS via subscription card rendering | Elevation of Privilege | React auto-escapes; no `dangerouslySetInnerHTML` |
| Rate limiting by target sites | Denial of Service | Crawlee built-in rate limiting; 24h crawl frequency for consumer pages |
| Stale/misleading data | Information Disclosure | `crawled_at` timestamp shows data freshness; confidence scoring |

## Sources

### Primary (HIGH confidence)

- `src/providers/base.ts` — ProviderAdapter pattern (lines 115-175)
- `src/providers/schemas.ts` — Zod pricingSchema (lines 9-28)
- `src/db/schema.ts` — Drizzle table definitions (full file)
- `src/pipeline/workers/extract.ts` — Upsert pattern (lines 132-180)
- `app/promotions/page.tsx` — Server component pattern (lines 1-46)
- `app/components/PromotionsPageClient.tsx` — Card grid + filter pills (lines 1-92)
- `app/components/PromotionCard.tsx` — Card component pattern (lines 1-91)
- `app/components/TopNav.tsx` — Navigation pattern (lines 1-64)
- `app/globals.css` — Theme tokens (lines 1-170)

### Secondary (MEDIUM confidence)

- `10-CONTEXT.md` — User decisions (D-01 through D-04)
- `10-UI-SPEC.md` — UI design contract (approved 2026-06-19)

### Tertiary (LOW confidence)

- None — all findings verified from existing codebase and user-provided context.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies
- Architecture: HIGH — follows existing patterns (ProviderAdapter, PromotionsPage, extract worker)
- Pitfalls: MEDIUM — consumer page structures vary; extraction quality depends on page complexity

**Research date:** 2026-06-19
**Valid until:** 2026-07-19 (30 days — stable phase, no fast-moving dependencies)
