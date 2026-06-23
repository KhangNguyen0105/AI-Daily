/**
 * Static fallback pricing data for Poe subscriptions.
 *
 * Used when live crawling fails (redirects to login).
 * Update this data when Poe changes their pricing.
 *
 * Last verified: 2026-06-19
 * Source: https://poe.com/subscribe
 */
import type { ConsumerSubscriptionPlan } from '../../base';

export const poeStaticPlans: Omit<ConsumerSubscriptionPlan, 'currency' | 'sourceUrl' | 'confidence' | 'extractionNotes'>[] = [
  {
    planName: 'Poe Free',
    monthlyPrice: 0,
    annualPrice: null,
    annualMonthlyPrice: null,
    rawPriceText: 'Free',
    billingPeriod: 'unknown',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'Access to all models with daily limits',
      'GPT-5.5-Pro, Gemini-3.1-Pro, Claude, and more',
      'Create custom bots',
      'Basic image generation',
    ],
  },
  {
    planName: 'Poe Subscription',
    monthlyPrice: 19.99,
    annualPrice: 199.99,
    annualMonthlyPrice: 16.67,
    rawPriceText: '$19.99/mo or $199.99/yr',
    billingPeriod: 'monthly',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'Unlimited access to all models',
      'Priority access during high traffic',
      'Advanced image generation',
      'Higher message limits',
      'API access for bots',
    ],
  },
];
