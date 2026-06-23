/**
 * Static fallback pricing data for ChatGPT consumer subscriptions.
 *
 * Used when live crawling fails (Cloudflare protection, client-side rendered prices).
 * Update this data when ChatGPT changes their pricing.
 *
 * Last verified: 2026-06-19
 * Source: https://chatgpt.com/pricing
 */
import type { ConsumerSubscriptionPlan } from '../../base';

export const chatgptStaticPlans: Omit<ConsumerSubscriptionPlan, 'currency' | 'sourceUrl' | 'confidence' | 'extractionNotes'>[] = [
  {
    planName: 'Free',
    monthlyPrice: 0,
    annualPrice: null,
    annualMonthlyPrice: null,
    rawPriceText: 'Free',
    billingPeriod: 'unknown',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'Access to GPT-5.5 Instant',
      'Limited messages and uploads',
      'Limited image generation',
      'Limited deep research',
      'Limited memory and context',
    ],
  },
  {
    planName: 'Go',
    monthlyPrice: 10,
    annualPrice: null,
    annualMonthlyPrice: null,
    rawPriceText: '$10/mo',
    billingPeriod: 'monthly',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'More access to GPT-5.5 Instant',
      'More messages',
      'More uploads',
      'More image creation',
      'Longer memory',
    ],
  },
  {
    planName: 'Plus',
    monthlyPrice: 20,
    annualPrice: null,
    annualMonthlyPrice: null,
    rawPriceText: '$20/mo',
    billingPeriod: 'monthly',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'Advanced reasoning with GPT-5.5 Thinking',
      'More complex and accurate image creation',
      'Expanded deep research and agent mode',
      'Expanded memory and context',
      'Projects, tasks, and custom GPTs',
      'Codex agent for coding tasks',
      'Sora video generation',
    ],
  },
  {
    planName: 'Pro',
    monthlyPrice: 200,
    annualPrice: null,
    annualMonthlyPrice: null,
    rawPriceText: '$200/mo',
    billingPeriod: 'monthly',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      '5x or 20x more usage',
      'Pro reasoning with GPT-5.5 Pro',
      'Maximum Codex tasks',
      'Unlimited GPT-5.3 and file uploads',
      'Unlimited and faster image creation',
      'Extended deep research and agent mode',
      'Extended memory and context',
      'Sora pro video generation',
      'Operator research preview',
    ],
  },
];
