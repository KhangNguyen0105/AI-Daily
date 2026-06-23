/**
 * Static fallback pricing data for Microsoft Copilot subscriptions.
 *
 * Used when live crawling fails (page redirects to enterprise landing).
 * Update this data when Microsoft changes their pricing.
 *
 * Last verified: 2026-06-19
 * Source: https://www.microsoft.com/en-us/microsoft-365/copilot
 */
import type { ConsumerSubscriptionPlan } from '../../base';

export const copilotStaticPlans: Omit<ConsumerSubscriptionPlan, 'currency' | 'sourceUrl' | 'confidence' | 'extractionNotes'>[] = [
  {
    planName: 'Copilot Free',
    monthlyPrice: 0,
    annualPrice: null,
    annualMonthlyPrice: null,
    rawPriceText: 'Free',
    billingPeriod: 'unknown',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'Copilot Chat with web grounding',
      'File uploads and analysis',
      'Image generation with Designer',
      'Plugin support',
    ],
  },
  {
    planName: 'Copilot Pro',
    monthlyPrice: 20,
    annualPrice: 200,
    annualMonthlyPrice: 16.67,
    rawPriceText: '$20/mo or $200/yr',
    billingPeriod: 'monthly',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'Priority access to GPT-4o and GPT-5',
      'Copilot in Word, Excel, PowerPoint, Outlook',
      'Faster image generation with Designer',
      '100GB cloud storage',
      'Copilot Notebook for deeper reasoning',
    ],
  },
  {
    planName: 'Copilot for Microsoft 365',
    monthlyPrice: 30,
    annualPrice: 360,
    annualMonthlyPrice: 30,
    rawPriceText: '$30/user/mo',
    billingPeriod: 'monthly',
    freeTrialDays: 0,
    freeTrialConditions: null,
    keyFeatures: [
      'Everything in Copilot Pro',
      'Copilot in all Microsoft 365 apps',
      'Microsoft Graph grounding',
      'Enterprise data protection',
      'Admin controls and deployment tools',
    ],
  },
];
