import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  doublePrecision,
  uniqueIndex,
  uuid,
  date,
  index,
} from 'drizzle-orm/pg-core';

// Confidence scoring enum (D-06)
export const confidenceEnum = pgEnum('confidence', [
  'verified',
  'likely',
  'low_confidence',
]);

// Model status enum (D-04)
export const modelStatusEnum = pgEnum('model_status', [
  'announced',
  'active',
  'deprecated',
  'replaced',
  'quarantined',
]);

// Freshness status enum (D-02)
export const freshnessStatusEnum = pgEnum('freshness_status', [
  'fresh',
  'recent',
  'aging',
  'stale',
]);

// Event type enum for model status audit (D-04)
export const eventTypeEnum = pgEnum('event_type', [
  'created',
  'renamed',
  'aliased',
  'deprecated',
  'replaced',
  'quarantined',
]);

// Pricing model type enum (D-05)
export const pricingModelTypeEnum = pgEnum('pricing_model_type', [
  'token_usage',
  'request_based',
  'fixed_monthly',
  'tiered_usage',
  'credit_based',
  'free_quota',
  'enterprise_only',
  'unknown',
]);

// Normalization confidence enum (D-05)
export const normalizationConfidenceEnum = pgEnum('normalization_confidence', [
  'high',
  'medium',
  'low',
  'unknown',
]);

// Verification status enum (D-08) — replaces simple confidence for verification workflow
export const verificationStatusEnum = pgEnum('verification_status', [
  'verified',
  'verified_with_warning',
  'needs_review',
  'conflicted',
  'quarantined',
  'unsupported_pricing_model',
]);

// Human review status enum (D-07)
export const humanReviewStatusEnum = pgEnum('human_review_status', [
  'unreviewed',
  'approved',
  'corrected',
  'rejected',
  'quarantined',
]);

// Sources table - provider information
export const sources = pgTable('sources', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  url: text('url').notNull(),
  providerType: varchar('provider_type', { length: 100 }).notNull(),
  isActive: integer('is_active').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Raw data table - crawled HTML/JSON responses (D-07)
export const rawData = pgTable('raw_data', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id')
    .references(() => sources.id)
    .notNull(),
  url: text('url').notNull(),
  evidence: jsonb('evidence').notNull(),
  crawledAt: timestamp('crawled_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Extractions table - structured pricing data (D-06, D-07, D-08)
export const extractions = pgTable('extractions', {
  id: serial('id').primaryKey(),
  rawDataId: integer('raw_data_id')
    .references(() => rawData.id)
    .notNull(),
  sourceId: integer('source_id')
    .references(() => sources.id)
    .notNull(),
  modelName: varchar('model_name', { length: 255 }).notNull(),
  inputPricePer1m: doublePrecision('input_price_per_1m'),
  outputPricePer1m: doublePrecision('output_price_per_1m'),
  contextWindow: integer('context_window'),
  confidence: confidenceEnum('confidence').notNull(),
  rawEvidence: jsonb('raw_evidence'),
  collectedAt: timestamp('collected_at').notNull(),
  // Freshness metadata columns (D-02)
  lastVerifiedAt: timestamp('last_verified_at'),
  freshnessStatus: freshnessStatusEnum('freshness_status'),
  dataAgeMinutes: integer('data_age_minutes'),
  // Multi-level normalization columns (D-05)
  pricingModelType: pricingModelTypeEnum('pricing_model_type'),
  rawPriceText: text('raw_price_text'),
  rawUnit: varchar('raw_unit', { length: 100 }),
  rawCurrency: varchar('raw_currency', { length: 3 }),
  rawBillingModel: varchar('raw_billing_model', { length: 50 }),
  cachedInputUsdPer1mTokens: doublePrecision('cached_input_usd_per_1m_tokens'),
  reasoningUsdPer1mTokens: doublePrecision('reasoning_usd_per_1m_tokens'),
  normalizationConfidence: normalizationConfidenceEnum('normalization_confidence'),
  normalizationNotes: text('normalization_notes'),
  // Canonical model reference (D-04)
  canonicalModelId: uuid('canonical_model_id'),
  // Evidence anchoring columns (D-08)
  sourceUrl: text('source_url'),
  rawHtmlSnapshotId: varchar('raw_html_snapshot_id', { length: 255 }),
  extractedTextSnippet: text('extracted_text_snippet'),
  evidenceQuote: text('evidence_quote'),
  evidenceSelector: varchar('evidence_selector', { length: 500 }),
  evidenceHash: varchar('evidence_hash', { length: 64 }),
  extractedAt: timestamp('extracted_at'),
  // Per-field evidence quotes (JSONB) — stores quote + selector for each field
  evidenceQuotes: jsonb('evidence_quotes'),
  // Edge case classification (JSONB, D-08) — detected non-standard pricing
  edgeCaseFlags: jsonb('edge_case_flags'),
  // Verification status (D-08) — replaces simple confidence for verification workflow
  verificationStatus: verificationStatusEnum('verification_status'),
  verificationNotes: text('verification_notes'),
  // Multi-dimensional confidence scores (D-07, Phase 2.1-03)
  sourceConfidence: integer('source_confidence'),
  extractionConfidence: integer('extraction_confidence'),
  freshnessConfidence: integer('freshness_confidence'),
  verificationConfidence: integer('verification_confidence'),
  overallConfidence: integer('overall_confidence'),
  confidenceLabel: varchar('confidence_label', { length: 20 }),
  confidenceBreakdown: text('confidence_breakdown'),
  perFieldConfidence: jsonb('per_field_confidence'),
  priceChangeFlag: varchar('price_change_flag', { length: 10 }).default('false'),
  largeChangeReason: text('large_change_reason'),
  // Human-in-the-loop fields (D-07)
  humanReviewStatus: humanReviewStatusEnum('human_review_status').default('unreviewed'),
  reviewedBy: varchar('reviewed_by', { length: 255 }),
  reviewedAt: timestamp('reviewed_at'),
  humanConfidenceOverride: integer('human_confidence_override'),
  reviewNotes: text('review_notes'),
  // Change history tracking — comparison between pass1 and pass2
  disagreementReason: text('disagreement_reason'),
  pass1Values: jsonb('pass1_values'),
  pass2Values: jsonb('pass2_values'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    sourceModelUnique: uniqueIndex('source_model_unique').on(table.sourceId, table.modelName),
    canonicalModelIdIdx: index('canonical_model_id_idx').on(table.canonicalModelId),
    verificationStatusIdx: index('verification_status_idx').on(table.verificationStatus),
    humanReviewStatusIdx: index('human_review_status_idx').on(table.humanReviewStatus),
    extractedAtIdx: index('extracted_at_idx').on(table.extractedAt),
  };
});

// Canonical models table - registry of canonical model records (D-04)
export const canonicalModels = pgTable('canonical_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  canonicalName: varchar('canonical_name', { length: 255 }).notNull().unique(),
  provider: varchar('provider', { length: 100 }).notNull(),
  family: varchar('family', { length: 255 }),
  aliases: text('aliases').array(), // e.g. ["gpt-4o", "gpt-4o-2024-08-06"]
  apiModelIds: text('api_model_ids').array(), // e.g. ["gpt-4o"] from provider API
  status: modelStatusEnum('status').notNull().default('active'),
  firstSeen: timestamp('first_seen').notNull().defaultNow(),
  lastSeen: timestamp('last_seen'),
  lineage: jsonb('lineage'), // tracks GPT-4 → GPT-4 Turbo → GPT-4o progression
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    canonicalNameIdx: index('canonical_name_idx').on(table.canonicalName),
    providerIdx: index('provider_idx').on(table.provider),
    statusIdx: index('status_idx').on(table.status),
  };
});

// Pricing history table - append-only pricing log (D-05)
export const pricingHistory = pgTable('pricing_history', {
  id: serial('id').primaryKey(),
  canonicalModelId: uuid('canonical_model_id')
    .references(() => canonicalModels.id)
    .notNull(),
  extractionId: integer('extraction_id')
    .references(() => extractions.id)
    .notNull(),
  sourceId: integer('source_id')
    .references(() => sources.id)
    .notNull(),
  rawPriceText: text('raw_price_text'),
  rawUnit: varchar('raw_unit', { length: 100 }),
  rawCurrency: varchar('raw_currency', { length: 3 }),
  rawBillingModel: varchar('raw_billing_model', { length: 50 }),
  inputUsdPer1mTokens: doublePrecision('input_usd_per_1m_tokens'),
  outputUsdPer1mTokens: doublePrecision('output_usd_per_1m_tokens'),
  normalizationConfidence: normalizationConfidenceEnum('normalization_confidence'),
  normalizationNotes: text('normalization_notes'),
  effectiveDate: date('effective_date'),
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    canonicalModelIdIdx: index('pricing_canonical_model_id_idx').on(table.canonicalModelId),
    extractionIdIdx: index('pricing_extraction_id_idx').on(table.extractionId),
    recordedAtIdx: index('pricing_recorded_at_idx').on(table.recordedAt),
  };
});

// Model status audit table - immutable log of model lifecycle events (D-04)
export const modelStatusAudit = pgTable('model_status_audit', {
  id: serial('id').primaryKey(),
  canonicalModelId: uuid('canonical_model_id')
    .references(() => canonicalModels.id),
  eventType: eventTypeEnum('event_type').notNull(),
  previousStatus: varchar('previous_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }),
  details: jsonb('details'), // context for the event
  triggeredBy: varchar('triggered_by', { length: 50 }), // "auto_detection", "admin", "verification_conflict"
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
  return {
    canonicalModelIdIdx: index('audit_canonical_model_id_idx').on(table.canonicalModelId),
    eventTypeIdx: index('audit_event_type_idx').on(table.eventType),
    createdAtIdx: index('audit_created_at_idx').on(table.createdAt),
  };
});

// Articles table - generated daily articles
export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  date: varchar('date', { length: 10 }).unique().notNull(), // 'YYYY-MM-DD' for upsert targeting (D-08, D-20)
  title: varchar('title', { length: 500 }).notNull(),
  summary: varchar('summary', { length: 500 }), // one-line summary for archive list (D-14)
  content: text('content').notNull(),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Pipeline runs table - job execution tracking
export const pipelineRuns = pgTable('pipeline_runs', {
  id: serial('id').primaryKey(),
  status: varchar('status', { length: 50 }).notNull(),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  stats: jsonb('stats'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Exchange rates table - daily USD/VND rates fetched from external API
export const exchangeRates = pgTable('exchange_rates', {
  id: serial('id').primaryKey(),
  fromCurrency: varchar('from_currency', { length: 3 }).notNull(),
  toCurrency: varchar('to_currency', { length: 3 }).notNull(),
  rate: doublePrecision('rate').notNull(),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Promotion type enum (D-09, D-04: free_trial added for subscription trials)
export const promotionTypeEnum = pgEnum('promotion_type', [
  'free_tier',
  'promotion',
  'beta',
  'free_trial',
]);

// Billing period enum (Phase 10, D-02: explicit billing period semantics)
export const billingPeriodEnum = pgEnum('billing_period', [
  'monthly',
  'annual',
  'one_time',
  'unknown',
]);

// Promotions table - free tiers, promotions, beta trials (D-09)
export const promotions = pgTable('promotions', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id')
    .references(() => sources.id)
    .notNull(),
  modelPattern: varchar('model_pattern', { length: 255 }).notNull(),
  type: promotionTypeEnum('type').notNull(),
  description: text('description').notNull(),
  credits: varchar('credits', { length: 255 }),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  sourceUrl: text('source_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Subscription plans table - consumer subscription plans (Phase 10, D-02)
// Separate from promotions: subscription plans are persistent products, not time-limited offers.
// Unique key: (sourceId, planName) with normalization rules:
//   - planName MUST be lowercase, trimmed, collapsed whitespace
//   - If monthly/annual are separate rows, include billing period in plan name
//     (e.g., "ChatGPT Plus Monthly", "ChatGPT Plus Annual")
//   - planSlug: lowercase, hyphenated, stable identifier for cross-crawl consistency
export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id')
    .references(() => sources.id)
    .notNull(),
  providerName: varchar('provider_name', { length: 100 }).notNull(),
  planName: varchar('plan_name', { length: 255 }).notNull(),
  planSlug: varchar('plan_slug', { length: 255 }), // Stable identifier: lowercase, hyphenated (e.g., "chatgpt-plus")
  monthlyPrice: doublePrecision('monthly_price'), // USD monthly. null = "not available" or "contact sales"
  annualPrice: doublePrecision('annual_price'), // USD annual total. null = annual pricing not available
  annualMonthlyPrice: doublePrecision('annual_monthly_price'), // Effective monthly when billed annually. null = not derivable
  rawPriceText: text('raw_price_text'), // Original price string from page (e.g., "$20/mo", "Starting at $20")
  billingPeriod: billingPeriodEnum('billing_period').default('monthly'), // Explicit billing period. 'unknown' when page doesn't specify
  freeTrialDays: integer('free_trial_days'), // Number of days. null = unknown duration, 0 = explicitly no trial
  freeTrialConditions: text('free_trial_conditions'), // e.g., "New users only", "Credit card required"
  keyFeatures: jsonb('key_features'), // Array of feature strings
  currency: varchar('currency', { length: 10 }).default('USD'), // Required when any price field is non-null
  confidence: confidenceEnum('confidence').default('likely'), // Extraction confidence: verified/likely/low_confidence
  extractionNotes: text('extraction_notes'), // Raw evidence snippets, extraction warnings, review flags
  sourceUrl: text('source_url'),
  startDate: timestamp('start_date'), // Promotional campaign start date. null for standard subscription plans.
  endDate: timestamp('end_date'), // Promotional campaign end date. null for standard subscription plans.
  crawledAt: timestamp('crawled_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    sourcePlanUnique: uniqueIndex('source_plan_unique').on(table.sourceId, table.planName),
    providerIdx: index('subscription_provider_idx').on(table.providerName),
  };
});

// Practical costs table - real-world cost examples
export const practicalCosts = pgTable('practical_costs', {
  id: serial('id').primaryKey(),
  extractionId: integer('extraction_id')
    .references(() => extractions.id)
    .notNull(),
  scenarioName: varchar('scenario_name', { length: 255 }).notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  estimatedCost: doublePrecision('estimated_cost').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Article versions table - version history for article edits (Phase 8)
export const articleVersions = pgTable('article_versions', {
  id: serial('id').primaryKey(),
  articleId: integer('article_id')
    .references(() => articles.id)
    .notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  summary: varchar('summary', { length: 500 }),
  content: text('content').notNull(),
  version: integer('version').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Admin settings table - key-value store for admin configuration (Phase 8)
export const adminSettings = pgTable('admin_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).unique().notNull(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================
// Model Discovery & Lifecycle Tracking (Wave 5, D-02, D-04)
// ============================================================

// Discovery source type enum — how a model was first detected
export const discoverySourceEnum = pgEnum('discovery_source', [
  'pricing_page',
  'feed',
  'api',
  'diff',
]);

// Discovered model status enum — model lifecycle states
export const discoveredModelStatusEnum = pgEnum('discovered_model_status', [
  'announced',
  'pricing_pending',
  'verified',
  'deprecated',
  'replaced',
  'quarantined',
]);

// Status event type enum — what triggered a status change
export const statusEventTypeEnum = pgEnum('status_event_type', [
  'announced',
  'pricing_detected',
  'deprecated',
  'replaced',
  'quarantined',
]);

/**
 * Discovered models table — tracks models detected before pricing is available.
 * Per D-02: Multi-source discovery stores models from pricing pages, feeds, APIs, and diffs.
 * Per D-04: Model lifecycle tracking (announced → pricing_pending → verified → deprecated).
 */
export const discoveredModels = pgTable('discovered_models', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id')
    .references(() => sources.id)
    .notNull(),
  providerModelId: varchar('provider_model_id', { length: 255 }).notNull(),
  canonicalId: uuid('canonical_id'), // FK to canonicalModels if linked
  extractedName: varchar('extracted_name', { length: 255 }).notNull(),
  status: discoveredModelStatusEnum('status').notNull().default('announced'),
  sourceType: discoverySourceEnum('source_type').notNull(),
  evidenceUrl: text('evidence_url'),
  evidenceText: text('evidence_text'),
  firstDiscoveredAt: timestamp('first_discovered_at').notNull(),
  pricingFoundAt: timestamp('pricing_found_at'),
  deprecatedAt: timestamp('deprecated_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    providerModelIdx: index('discovered_provider_model_idx').on(table.providerId, table.providerModelId),
    statusIdx: index('discovered_status_idx').on(table.status),
    firstDiscoveredIdx: index('discovered_first_found_idx').on(table.firstDiscoveredAt),
  };
});

/**
 * Model status events table — immutable audit trail of discovered model lifecycle changes.
 * Per D-04: Tracks announced, pricing_detected, deprecated, replaced, quarantined events.
 */
export const modelStatusEvents = pgTable('model_status_events', {
  id: serial('id').primaryKey(),
  discoveredModelId: integer('discovered_model_id')
    .references(() => discoveredModels.id)
    .notNull(),
  eventType: statusEventTypeEnum('event_type').notNull(),
  details: jsonb('details'),
  triggeredBy: varchar('triggered_by', { length: 50 }), // 'feed_monitor', 'api_discovery', 'price_crawler', 'diff_detection'
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    discoveredModelIdx: index('status_event_discovered_model_idx').on(table.discoveredModelId),
    eventTypeIdx: index('status_event_type_idx').on(table.eventType),
    createdAtIdx: index('status_event_created_at_idx').on(table.createdAt),
  };
});
