import { db } from '@/src/db';
import { extractions, sources, promotions, practicalCosts } from '@/src/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { ComparePageClient } from '@/app/components/ComparePageClient';
import type { ModelOption } from '@/app/components/ModelSelector';
import type { PracticalCost } from '@/app/lib/pricing-utils';
import type { PromotionData } from '@/app/components/PromotionsList';

export const revalidate = 60;

/**
 * Multi-model comparison page.
 * Per D-10: /compare route with URL param sync.
 * Per D-12: all dimensions (pricing, context window, practical costs, free tier).
 */
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ models?: string }>;
}) {
  const params = await searchParams;
  const modelNames = params.models
    ? params.models.split(',').map((n) => decodeURIComponent(n)).filter(Boolean)
    : [];

  let allModels: ModelOption[] = [];
  let pricingDataMap: Record<string, any> = {};
  let practicalCostsMap: Record<string, PracticalCost[]> = {};
  let promotionsMap: Record<string, PromotionData[]> = {};

  try {
    // Query 1: Fetch all distinct models
    const distinctModels = await db
      .select({
        modelName: extractions.modelName,
        sourceId: extractions.sourceId,
        sourceName: sources.name,
      })
      .from(extractions)
      .leftJoin(sources, eq(extractions.sourceId, sources.id))
      .groupBy(extractions.modelName, extractions.sourceId, sources.name);

    allModels = distinctModels.map((m) => ({
      modelName: m.modelName,
      sourceId: m.sourceId,
      sourceName: m.sourceName,
    }));

    // Query 2: If models selected, fetch full pricing data
    if (modelNames.length > 0) {
      const selectedData = await db
        .select({
          modelName: extractions.modelName,
          sourceId: extractions.sourceId,
          sourceName: sources.name,
          inputPricePer1m: extractions.inputPricePer1m,
          outputPricePer1m: extractions.outputPricePer1m,
          contextWindow: extractions.contextWindow,
          confidence: extractions.confidence,
          collectedAt: extractions.collectedAt,
        })
        .from(extractions)
        .leftJoin(sources, eq(extractions.sourceId, sources.id))
        .where(inArray(extractions.modelName, modelNames));

      // Build pricing data map (use latest extraction per model)
      for (const row of selectedData) {
        const existing = pricingDataMap[row.modelName];
        if (!existing || new Date(row.collectedAt) > new Date(existing.collectedAt)) {
          pricingDataMap[row.modelName] = row;
        }
      }

      // Query 3: Fetch practical costs for selected models
      const costs = await db
        .select({
          extractionId: practicalCosts.extractionId,
          scenarioName: practicalCosts.scenarioName,
          estimatedCost: practicalCosts.estimatedCost,
          modelName: extractions.modelName,
        })
        .from(practicalCosts)
        .leftJoin(extractions, eq(practicalCosts.extractionId, extractions.id))
        .where(inArray(extractions.modelName, modelNames));

      for (const cost of costs) {
        if (!practicalCostsMap[cost.modelName]) {
          practicalCostsMap[cost.modelName] = [];
        }
        practicalCostsMap[cost.modelName].push({
          modelId: cost.extractionId,
          modelName: cost.modelName,
          sourceName: null,
          confidence: 'verified',
          inputPricePer1m: 0,
          outputPricePer1m: 0,
          inputCost: 0,
          outputCost: 0,
          totalCost: cost.estimatedCost,
        });
      }

      // Query 4: Fetch promotions for selected models
      const promos = await db
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
        .from(promotions)
        .where(inArray(promotions.modelPattern, modelNames));

      for (const promo of promos) {
        if (!promotionsMap[promo.modelPattern]) {
          promotionsMap[promo.modelPattern] = [];
        }
        promotionsMap[promo.modelPattern].push({
          id: promo.id,
          modelPattern: promo.modelPattern,
          type: promo.type,
          description: promo.description,
          credits: promo.credits,
          startDate: promo.startDate ? new Date(promo.startDate) : null,
          endDate: promo.endDate ? new Date(promo.endDate) : null,
          sourceUrl: promo.sourceUrl,
        });
      }
    }
  } catch (error) {
    console.error('Failed to fetch comparison data:', error);
  }

  const initialSelected = modelNames
    .map((name) => allModels.find((m) => m.modelName === name))
    .filter(Boolean) as ModelOption[];

  return (
    <ComparePageClient
      allModels={allModels}
      initialSelected={initialSelected}
      practicalCostsMap={practicalCostsMap}
      promotionsMap={promotionsMap}
      pricingDataMap={pricingDataMap}
    />
  );
}
