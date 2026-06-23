/**
 * Static fallback pricing data for Gemini (Google One AI Premium) subscriptions.
 *
 * Used when live crawling fails (Google blocks headless browsers).
 * Update this data when Google changes their pricing.
 *
 * Last verified: 2026-06-19
 * Source: https://one.google.com/about/plans
 */
import type { ConsumerSubscriptionPlan } from '../../base';

export const geminiStaticPlans: Omit<ConsumerSubscriptionPlan, 'currency' | 'sourceUrl' | 'confidence' | 'extractionNotes'>[] = [
  {
    planName: 'Google One AI Premium',
    monthlyPrice: 19.99,
    annualPrice: 199.99,
    annualMonthlyPrice: 16.67,
    rawPriceText: '$19.99/mo or $199.99/yr',
    billingPeriod: 'monthly',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'Gemini Advanced with 2.5 Pro',
      '2TB Google One storage',
      'Gemini in Gmail, Docs, and more',
      'NotebookLM Plus',
      'Priority access to new features',
    ],
  },
  {
    planName: 'Google One AI Premium (Family)',
    monthlyPrice: 19.99,
    annualPrice: 199.99,
    annualMonthlyPrice: 16.67,
    rawPriceText: '$19.99/mo (shared with up to 5 family members)',
    billingPeriod: 'monthly',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'Everything in AI Premium',
      'Share with up to 5 family members',
      '2TB storage shared across family',
      'Gemini Advanced for all members',
    ],
  },
];
