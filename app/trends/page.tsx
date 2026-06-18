import { db } from '@/src/db';
import { extractions, sources } from '@/src/db/schema';
import { eq, asc } from 'drizzle-orm';
import { TrendsPageClient, TrendModelData } from '@/app/components/TrendsPageClient';

export const revalidate = 60;

/**
 * Pricing trends page — per-model pricing trend charts with visual markers.
 * Server component fetching trend data via Drizzle.
 * Per D-01: dedicated /trends route.
 * Per D-02: per-model charts.
 * Per D-03: all available data, no time range selector.
 */
export default async function TrendsPage() {
  let models: TrendModelData[] = [];

  try {
    // Get all extractions with source names
    const allExtractions = await db
      .select({
        modelName: extractions.modelName,
        sourceId: extractions.sourceId,
        sourceName: sources.name,
        collectedAt: extractions.collectedAt,
        inputPricePer1m: extractions.inputPricePer1m,
        outputPricePer1m: extractions.outputPricePer1m,
      })
      .from(extractions)
      .leftJoin(sources, eq(extractions.sourceId, sources.id))
      .orderBy(asc(extractions.collectedAt));

    // Group by modelName + sourceId
    const modelMap = new Map<string, TrendModelData>();

    for (const row of allExtractions) {
      const key = `${row.modelName}-${row.sourceId}`;
      if (!modelMap.has(key)) {
        modelMap.set(key, {
          modelName: row.modelName,
          sourceId: row.sourceId,
          sourceName: row.sourceName,
          history: [],
        });
      }
      modelMap.get(key)!.history.push({
        collectedAt: row.collectedAt,
        inputPricePer1m: row.inputPricePer1m,
        outputPricePer1m: row.outputPricePer1m,
      });
    }

    models = Array.from(modelMap.values());
  } catch (error) {
    console.error('Failed to fetch trend data:', error);
  }

  return <TrendsPageClient models={models} />;
}
