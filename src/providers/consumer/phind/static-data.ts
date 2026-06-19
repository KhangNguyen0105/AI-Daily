/**
 * Static fallback pricing data for Phind subscriptions.
 *
 * Used when live crawling fails (SPA with minimal HTML).
 * Update this data when Phind changes their pricing.
 *
 * Last verified: 2026-06-19
 * Source: https://www.phind.com
 */
import type { ConsumerSubscriptionPlan } from '../../base';

export const phindStaticPlans: Omit<ConsumerSubscriptionPlan, 'currency' | 'sourceUrl' | 'confidence' | 'extractionNotes'>[] = [
  {
    planName: 'Phind Free',
    monthlyPrice: 0,
    annualPrice: null,
    annualMonthlyPrice: null,
    rawPriceText: 'Free',
    billingPeriod: 'unknown',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'AI-powered search',
      'Code generation',
      'Limited daily searches',
      'Basic model access',
    ],
  },
  {
    planName: 'Phind Pro',
    monthlyPrice: 20,
    annualPrice: 200,
    annualMonthlyPrice: 16.67,
    rawPriceText: '$20/mo or $200/yr',
    billingPeriod: 'monthly',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'Unlimited searches',
      'Advanced models (GPT-4, Claude)',
      'VS Code integration',
      'Custom context and projects',
      'Priority access',
    ],
  },
];
