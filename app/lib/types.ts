/**
 * Shared type definitions for AI Daily.
 * Extracted from app/components/PricingTable.tsx per IN-01 to decouple
 * the data contract from the UI component that renders it.
 */

/**
 * Row type matching the shape passed from the server component.
 * Derived from Drizzle JOIN query (extractions + sources).
 */
export interface PricingRow {
  id: number;
  sourceId: number;
  modelName: string;
  inputPricePer1m: number | null;
  outputPricePer1m: number | null;
  contextWindow: number | null;
  confidence: 'verified' | 'likely' | 'low_confidence';
  collectedAt: Date;
  sourceName: string | null;
  sourceUrl: string | null;
}

/**
 * Subscription plan data shape passed to the client component.
 * Includes all fields needed for display, filtering, and sorting.
 * Extracted from app/subscriptions/page.tsx to decouple client imports
 * from server component file. (WR-04)
 */
export interface SubscriptionPlanData {
  id: number;
  providerName: string;
  planName: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  annualMonthlyPrice: number | null;
  rawPriceText: string | null;
  billingPeriod: string;
  freeTrialDays: number | null;
  freeTrialConditions: string | null;
  keyFeatures: string[];
  currency: string;
  sourceUrl: string | null;
  confidence: string;
  extractionNotes: string | null;
  crawledAt: Date | null;
}
