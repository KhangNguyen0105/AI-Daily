import { db } from '@/src/db/index';
import { extractions, sources } from '@/src/db/schema';
import { eq, asc } from 'drizzle-orm';
import {
  TrendsPageClient,
  type TrendModelData,
} from '@/app/components/TrendsPageClient';

/**
 * ISR: Revalidate every 60 seconds.
 * Matches existing pattern from app/page.tsx.
 */
export const revalidate = 60;

/**
 * /trends page — server component.
 * Fetches all extractions with source names, groups by modelName+sourceId,
 * and passes per-model price history to TrendsPageClient.
 *
 * Per D-01: Dedicated /trends route.
 * Per D-02: Per-model charts.
 * Per D-03: All available data (no time range selector).
 */
export default async function TrendsPage() {
  let models: TrendModelData[] = [];

  try {
    // Fetch all extractions with source names, ordered chronologically
    const rows = await db
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
    const modelMap = new Map<
      string,
      {
        modelName: string;
        sourceId: number;
        sourceName: string | null;
        history: Array<{
          collectedAt: Date;
          inputPricePer1m: number | null;
          outputPricePer1m: number | null;
        }>;
      }
    >();

    for (const row of rows) {
      const key = `${row.modelName}::${row.sourceId}`;
      if (!modelMap.has(key)) {
        modelMap.set(key, {
          modelName: row.modelName,
          sourceId: row.sourceId,
          sourceName: row.sourceName,
          history: [],
        });
      }
      modelMap.get(key)!.history.push({
        collectedAt: new Date(row.collectedAt),
        inputPricePer1m: row.inputPricePer1m,
        outputPricePer1m: row.outputPricePer1m,
      });
    }

    models = Array.from(modelMap.values());
  } catch {
    // DB not available during build — show empty state
    models = [];
  }

  return <TrendsPageClient models={models} />;
}
