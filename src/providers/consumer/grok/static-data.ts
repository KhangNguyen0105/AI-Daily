/**
 * Static fallback pricing data for Grok (X Premium) subscriptions.
 *
 * Used when live crawling fails (requires login).
 * Update this data when X changes their pricing.
 *
 * Last verified: 2026-06-19
 * Source: https://x.com/i/premium
 */
import type { ConsumerSubscriptionPlan } from '../../base';

export const grokStaticPlans: Omit<ConsumerSubscriptionPlan, 'currency' | 'sourceUrl' | 'confidence' | 'extractionNotes'>[] = [
  {
    planName: 'X Basic',
    monthlyPrice: 3,
    annualPrice: 32,
    annualMonthlyPrice: 2.67,
    rawPriceText: '$3/mo or $32/yr',
    billingPeriod: 'monthly',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'Edit posts',
      'Longer posts (up to 25,000 characters)',
      'Bookmark folders',
      'Custom app icons',
    ],
  },
  {
    planName: 'X Premium',
    monthlyPrice: 8,
    annualPrice: 84,
    annualMonthlyPrice: 7,
    rawPriceText: '$8/mo or $84/yr',
    billingPeriod: 'monthly',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'Blue checkmark verification',
      'Edit posts',
      'Longer videos',
      'Encrypted DMs',
      'Background video playback',
      'Priority ranking in replies',
    ],
  },
  {
    planName: 'X Premium+',
    monthlyPrice: 16,
    annualPrice: 168,
    annualMonthlyPrice: 14,
    rawPriceText: '$16/mo or $168/yr',
    billingPeriod: 'monthly',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'Everything in Premium',
      'No ads in For You and Following',
      'Largest boost for replies',
      'Grok with higher usage limits',
      'Write articles',
    ],
  },
];
