import { db } from '@/src/db';
import { promotions } from '@/src/db/schema';
import { PromotionsPageClient } from '@/app/components/PromotionsPageClient';
import { PromotionData } from '@/app/components/PromotionsList';

export const revalidate = 60;

/**
 * Promotions & free tiers page.
 * Server component fetching promotions from database.
 * Per D-06: dedicated /promotions route.
 * Per D-09: data from existing promotions table.
 */
export default async function PromotionsPage() {
  let promos: PromotionData[] = [];

  try {
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
      type: row.type,
      description: row.description,
      credits: row.credits,
      startDate: row.startDate ? new Date(row.startDate) : null,
      endDate: row.endDate ? new Date(row.endDate) : null,
      sourceUrl: row.sourceUrl,
    }));
  } catch (error) {
    console.error('Failed to fetch promotions:', error);
  }

  return <PromotionsPageClient promotions={promos} />;
}
