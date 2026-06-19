/**
 * Static fallback pricing data for You.com subscriptions.
 *
 * Note: You.com has pivoted to an API platform (Search API, Contents API, Research API).
 * Consumer subscription (YouPro) may no longer be available.
 * Used when live crawling fails.
 *
 * Last verified: 2026-06-19
 * Source: https://you.com/pricing
 */
import type { ConsumerSubscriptionPlan } from '../../base';

export const youStaticPlans: Omit<ConsumerSubscriptionPlan, 'currency' | 'sourceUrl' | 'confidence' | 'extractionNotes'>[] = [
  {
    planName: 'You.com Free',
    monthlyPrice: 0,
    annualPrice: null,
    annualMonthlyPrice: null,
    rawPriceText: 'Free',
    billingPeriod: 'unknown',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'AI-powered search',
      'Basic chat capabilities',
      'Web-grounded answers',
    ],
  },
  {
    planName: 'YouPro',
    monthlyPrice: 15,
    annualPrice: 150,
    annualMonthlyPrice: 12.50,
    rawPriceText: '$15/mo or $150/yr',
    billingPeriod: 'monthly',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'Unlimited AI search',
      'Advanced AI models',
      'Priority access',
      'Custom AI agents',
    ],
  },
];
