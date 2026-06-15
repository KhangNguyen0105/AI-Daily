import { db } from '@/src/db/index';
import { promotions, sources } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { PromotionsPageClient } from '@/app/components/PromotionsPageClient';
import type { PromotionCardData } from '@/app/components/PromotionCard';

/**
 * ISR: Revalidate every 60 seconds.
 * Per D-06: /promotions route for promotion tracking.
 */
export const revalidate = 60;

/**
 * Promotions page — server component.
 * Per D-07: Card grid layout with filter by type.
 * Per D-08: Show all promos, gray out expired, sort active first.
 * Per D-09: Data from existing promotions table.
 */
export default async function PromotionsPage() {
  let promotionList: PromotionCardData[] = [];

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
        sourceName: sources.name,
      })
      .from(promotions)
      .leftJoin(sources, eq(promotions.sourceId, sources.id));

    promotionList = rows.map((row) => ({
      id: row.id,
      modelPattern: row.modelPattern,
      type: row.type as 'free_tier' | 'promotion' | 'beta',
      description: row.description,
      credits: row.credits,
      startDate: row.startDate ? new Date(row.startDate) : null,
      endDate: row.endDate ? new Date(row.endDate) : null,
      sourceUrl: row.sourceUrl,
      sourceName: row.sourceName,
    }));
  } catch {
    // DB not available during build — show empty state
    promotionList = [];
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <PromotionsPageClient promotions={promotionList} />
    </main>
  );
}
