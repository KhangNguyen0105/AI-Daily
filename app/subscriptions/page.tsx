import { db } from '@/src/db';
import { subscriptionPlans } from '@/src/db/schema';
import { SubscriptionsPageClient } from '@/app/components/SubscriptionsPageClient';
import type { SubscriptionPlanData } from '@/app/lib/types';

export const revalidate = 60;

/**
 * Subscriptions page — displays consumer AI subscription plans.
 * Server component fetching from subscription_plans table.
 * Follows the exact pattern of app/promotions/page.tsx.
 */
export default async function SubscriptionsPage() {
  let plans: SubscriptionPlanData[] = [];

  try {
    const rows = await db
      .select({
        id: subscriptionPlans.id,
        providerName: subscriptionPlans.providerName,
        planName: subscriptionPlans.planName,
        monthlyPrice: subscriptionPlans.monthlyPrice,
        annualPrice: subscriptionPlans.annualPrice,
        annualMonthlyPrice: subscriptionPlans.annualMonthlyPrice,
        rawPriceText: subscriptionPlans.rawPriceText,
        billingPeriod: subscriptionPlans.billingPeriod,
        freeTrialDays: subscriptionPlans.freeTrialDays,
        freeTrialConditions: subscriptionPlans.freeTrialConditions,
        keyFeatures: subscriptionPlans.keyFeatures,
        currency: subscriptionPlans.currency,
        sourceUrl: subscriptionPlans.sourceUrl,
        confidence: subscriptionPlans.confidence,
        extractionNotes: subscriptionPlans.extractionNotes,
        crawledAt: subscriptionPlans.crawledAt,
      })
      .from(subscriptionPlans);

    plans = rows.map((row) => ({
      id: row.id,
      providerName: row.providerName,
      planName: row.planName,
      monthlyPrice: row.monthlyPrice,
      annualPrice: row.annualPrice,
      annualMonthlyPrice: row.annualMonthlyPrice,
      rawPriceText: row.rawPriceText,
      billingPeriod: row.billingPeriod ?? 'unknown',
      freeTrialDays: row.freeTrialDays,
      freeTrialConditions: row.freeTrialConditions,
      keyFeatures: (row.keyFeatures ?? []) as string[],
      currency: row.currency ?? 'USD',
      sourceUrl: row.sourceUrl,
      confidence: row.confidence ?? 'likely',
      extractionNotes: row.extractionNotes,
      crawledAt: row.crawledAt ? new Date(row.crawledAt) : null,
    }));
  } catch (error) {
    console.error('Failed to fetch subscription plans:', error);
  }

  return <SubscriptionsPageClient plans={plans} />;
}
