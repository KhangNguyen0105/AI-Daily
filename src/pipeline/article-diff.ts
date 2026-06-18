import { db } from '@/src/db/index';
import { extractions, promotions, sources } from '@/src/db/schema';
import { and, gte, lt, eq } from 'drizzle-orm';

/**
 * Diff result comparing today's extractions with yesterday's.
 * Used by the article generator to build context for the AI prompt.
 */
export interface DiffResult {
  newModels: Array<{
    modelName: string;
    inputPricePer1m: number | null;
    outputPricePer1m: number | null;
    contextWindow: number | null;
    sourceName: string;
  }>;
  priceChanges: Array<{
    modelName: string;
    field: 'input' | 'output';
    oldPrice: number;
    newPrice: number;
    changePercent: number;
  }>;
  newPromotions: Array<{
    modelPattern: string;
    description: string;
    type: string;
  }>;
  totalModelsToday: number;
}

/**
 * Compute the UTC date range (start inclusive, end exclusive) for a given date.
 */
function utcDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/**
 * Deduplicate extractions by modelName, keeping the latest extraction (highest collectedAt).
 */
function deduplicateByModel(rows: Array<{
  modelName: string;
  inputPricePer1m: number | null;
  outputPricePer1m: number | null;
  contextWindow: number | null;
  sourceName: string;
  collectedAt: Date;
}>): Map<string, typeof rows[0]> {
  const map = new Map<string, typeof rows[0]>();
  for (const row of rows) {
    const existing = map.get(row.modelName);
    if (!existing || row.collectedAt > existing.collectedAt) {
      map.set(row.modelName, row);
    }
  }
  return map;
}

/**
 * Compare today's extractions with yesterday's to identify changes.
 *
 * - newModels: models present today but not yesterday
 * - priceChanges: models where input or output price differs
 * - newPromotions: promotions created today
 * - totalModelsToday: count of unique models in today's extractions
 *
 * Per D-05 / Pitfall 3: When yesterday has no data, treat ALL today's
 * extractions as newModels (first-run case).
 */
export async function computeDiff(today: Date, yesterday: Date): Promise<DiffResult> {
  const todayRange = utcDayRange(today);
  const yesterdayRange = utcDayRange(yesterday);

  // 1. Run all three independent queries in parallel
  const [todayRows, yesterdayRows, promotionRows] = await Promise.all([
    db
      .select({
        modelName: extractions.modelName,
        inputPricePer1m: extractions.inputPricePer1m,
        outputPricePer1m: extractions.outputPricePer1m,
        contextWindow: extractions.contextWindow,
        sourceName: sources.name,
        collectedAt: extractions.collectedAt,
      })
      .from(extractions)
      .leftJoin(sources, eq(extractions.sourceId, sources.id))
      .where(
        and(
          gte(extractions.collectedAt, todayRange.start),
          lt(extractions.collectedAt, todayRange.end),
        ),
      ),
    db
      .select({
        modelName: extractions.modelName,
        inputPricePer1m: extractions.inputPricePer1m,
        outputPricePer1m: extractions.outputPricePer1m,
        contextWindow: extractions.contextWindow,
        sourceName: sources.name,
        collectedAt: extractions.collectedAt,
      })
      .from(extractions)
      .leftJoin(sources, eq(extractions.sourceId, sources.id))
      .where(
        and(
          gte(extractions.collectedAt, yesterdayRange.start),
          lt(extractions.collectedAt, yesterdayRange.end),
        ),
      ),
    db
      .select({
        modelPattern: promotions.modelPattern,
        description: promotions.description,
        type: promotions.type,
      })
      .from(promotions)
      .where(
        and(
          gte(promotions.createdAt, todayRange.start),
          lt(promotions.createdAt, todayRange.end),
        ),
      ),
  ]);

  // 3. Deduplicate by modelName (keep latest extraction per model per day)
  const todayMap = deduplicateByModel(todayRows);
  const yesterdayMap = deduplicateByModel(yesterdayRows);

  // 4. Compute newModels and priceChanges
  const newModels: DiffResult['newModels'] = [];
  const priceChanges: DiffResult['priceChanges'] = [];

  if (yesterdayMap.size === 0) {
    // First-run case (Pitfall 3): treat ALL today's extractions as newModels
    for (const [modelName, row] of todayMap) {
      newModels.push({
        modelName,
        inputPricePer1m: row.inputPricePer1m,
        outputPricePer1m: row.outputPricePer1m,
        contextWindow: row.contextWindow,
        sourceName: row.sourceName ?? 'unknown',
      });
    }
  } else {
    for (const [modelName, todayRow] of todayMap) {
      const yesterdayRow = yesterdayMap.get(modelName);

      if (!yesterdayRow) {
        // New model not present yesterday
        newModels.push({
          modelName,
          inputPricePer1m: todayRow.inputPricePer1m,
          outputPricePer1m: todayRow.outputPricePer1m,
          contextWindow: todayRow.contextWindow,
          sourceName: todayRow.sourceName ?? 'unknown',
        });
      } else {
        // Check for price changes
        if (
          todayRow.inputPricePer1m != null &&
          yesterdayRow.inputPricePer1m != null &&
          todayRow.inputPricePer1m !== yesterdayRow.inputPricePer1m
        ) {
          priceChanges.push({
            modelName,
            field: 'input',
            oldPrice: yesterdayRow.inputPricePer1m,
            newPrice: todayRow.inputPricePer1m,
            changePercent:
              yesterdayRow.inputPricePer1m === 0
                ? 0
                : ((todayRow.inputPricePer1m - yesterdayRow.inputPricePer1m) /
                    yesterdayRow.inputPricePer1m) *
                  100,
          });
        }

        if (
          todayRow.outputPricePer1m != null &&
          yesterdayRow.outputPricePer1m != null &&
          todayRow.outputPricePer1m !== yesterdayRow.outputPricePer1m
        ) {
          priceChanges.push({
            modelName,
            field: 'output',
            oldPrice: yesterdayRow.outputPricePer1m,
            newPrice: todayRow.outputPricePer1m,
            changePercent:
              yesterdayRow.outputPricePer1m === 0
                ? 0
                : ((todayRow.outputPricePer1m - yesterdayRow.outputPricePer1m) /
                    yesterdayRow.outputPricePer1m) *
                  100,
          });
        }
      }
    }
  }

  // 5. Return results (promotions already fetched in parallel above)
  return {
    newModels,
    priceChanges,
    newPromotions: promotionRows,
    totalModelsToday: todayMap.size,
  };
}
