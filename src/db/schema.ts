import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  real,
} from 'drizzle-orm/pg-core';

// Confidence scoring enum (D-06)
export const confidenceEnum = pgEnum('confidence', [
  'verified',
  'likely',
  'low_confidence',
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
  inputPricePer1m: real('input_price_per_1m'),
  outputPricePer1m: real('output_price_per_1m'),
  contextWindow: integer('context_window'),
  confidence: confidenceEnum('confidence').notNull(),
  rawEvidence: jsonb('raw_evidence'),
  collectedAt: timestamp('collected_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Articles table - generated daily articles
export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
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
  rate: real('rate').notNull(),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
  estimatedCost: real('estimated_cost').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
