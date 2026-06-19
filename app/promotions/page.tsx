import { db } from '@/src/db';
import { promotions, subscriptionPlans } from '@/src/db/schema';
import { gt } from 'drizzle-orm';
import { PromotionsPageClient } from '@/app/components/PromotionsPageClient';
import { PromotionData } from '@/app/components/PromotionsList';

export const revalidate = 60;

/**
 * Promotions & free tiers page.
 * Server component fetching promotions from database.
 * Per D-06: dedicated /promotions route.
 * Per D-09: data from existing promotions table.
 * Per D-04 (review #4): virtual projection of subscription free trials
 * at query time — NOT materialized rows in promotions table.
 */
export default async function PromotionsPage() {
  let promos: PromotionData[] = [];

  try {
    // Fetch promotions from promotions table
    const rows = await db
      .select({
        id: promotions.id,
        modelPattern: promotions.modelPattern,
        type: promotions.type,
        description: promotions.description,
        credits: promotions.credits,
        startDate: promotions.startDate,
        endDate: promotions.endDate,
        sourceUrl: promotions.sourceUrl,
      })
      .from(promotions);

    promos = rows.map((row) => ({
      id: row.id,
      modelPattern: row.modelPattern,
      type: row.type as PromotionData['type'],
      description: row.description,
      credits: row.credits,
      startDate: row.startDate ? new Date(row.startDate) : null,
      endDate: row.endDate ? new Date(row.endDate) : null,
      sourceUrl: row.sourceUrl,
    }));

    // Virtual projection (review #4): query subscription_plans for free trials
    // at query time. Does NOT write synthetic rows to promotions table.
    const trialRows = await db
      .select({
        id: subscriptionPlans.id,
        providerName: subscriptionPlans.providerName,
        planName: subscriptionPlans.planName,
        freeTrialDays: subscriptionPlans.freeTrialDays,
        freeTrialConditions: subscriptionPlans.freeTrialConditions,
        sourceUrl: subscriptionPlans.sourceUrl,
      })
      .from(subscriptionPlans)
      .where(gt(subscriptionPlans.freeTrialDays, 0));

    // IN-01: Build set of real free_trial modelPatterns for deduplication
    const realFreeTrialPatterns = new Set(
      promos
        .filter((p) => p.type === 'free_trial')
        .map((p) => p.modelPattern),
    );

    // Map trial rows to PromotionData format
    // IN-01: Filter out virtual trials that duplicate real free_trial promotions
    const trialPromos: PromotionData[] = trialRows
      .filter((row) => {
        const pattern = `${row.providerName} ${row.planName}`;
        return !realFreeTrialPatterns.has(pattern);
      })
      .map((row) => ({
        // IN-05: Use negative IDs for collision-free semantics (serial IDs are always positive)
        id: -(row.id + 1),
        modelPattern: `${row.providerName} ${row.planName}`,
        type: 'free_trial' as const,
        description: row.freeTrialConditions
          ? `Free trial: ${row.freeTrialDays} days — ${row.freeTrialConditions}`
          : `Free trial: ${row.freeTrialDays} days`,
        credits: null,
        startDate: null, // Standard plans, not promotional campaigns (review #8)
        endDate: null,   // Standard plans, not promotional campaigns (review #8)
        sourceUrl: row.sourceUrl,
      }));

    promos = [...promos, ...trialPromos];
  } catch (error) {
    console.error('Failed to fetch promotions:', error);
  }

  return <PromotionsPageClient promotions={promos} />;
}
