import { db } from '@/src/db/index';
import { extractions, sources, promotions, practicalCosts } from '@/src/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';
import type { PricingRow } from '@/app/components/PricingTable';
import type { PracticalCost } from '@/app/lib/pricing-utils';
import type { PromotionData } from '@/app/components/PromotionsList';
import type { ModelOption } from '@/app/components/ModelSelector';
import { ComparePageClient } from '@/app/components/ComparePageClient';
import { COST_SCENARIOS } from '@/app/lib/cost-scenarios';

/**
 * ISR: Revalidate every 60 seconds.
 * Per D-10: New /compare route with URL: /compare?models=gpt-4o,claude-sonnet-4-5
 */
export const revalidate = 60;

/**
 * Server component for /compare page.
 * Per D-10: Reads ?models= query param, fetches data for selected models.
 * Per D-12: All dimensions — pricing, context window, practical costs, free tier status, confidence.
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

  // Query 1: Fetch all distinct models for the selector dropdown
  let allModels: ModelOption[] = [];
  try {
    const rows = await db
      .select({
        modelName: extractions.modelName,
        sourceId: extractions.sourceId,
        sourceName: sources.name,
      })
      .from(extractions)
      .leftJoin(sources, eq(extractions.sourceId, sources.id))
      .groupBy(
        extractions.modelName,
        extractions.sourceId,
        sources.name,
      );

    allModels = rows.map((r) => ({
      modelName: r.modelName,
      sourceId: r.sourceId,
      sourceName: r.sourceName ?? 'Unknown',
    }));
  } catch {
    allModels = [];
  }

  // Query 2: Fetch full pricing data for selected models
  let modelsData: PricingRow[] = [];
  let selectedModelOptions: ModelOption[] = [];

  if (modelNames.length > 0) {
    try {
      // Get the latest extraction per model+source for selected models
      const rows = await db
        .select({
          id: extractions.id,
          sourceId: extractions.sourceId,
          modelName: extractions.modelName,
          inputPricePer1m: extractions.inputPricePer1m,
          outputPricePer1m: extractions.outputPricePer1m,
          contextWindow: extractions.contextWindow,
          confidence: extractions.confidence,
          collectedAt: extractions.collectedAt,
          sourceName: sources.name,
          sourceUrl: sources.url,
        })
        .from(extractions)
        .leftJoin(sources, eq(extractions.sourceId, sources.id))
        .where(inArray(extractions.modelName, modelNames))
        .orderBy(desc(extractions.collectedAt));

      // Deduplicate: keep only the latest extraction per modelName+sourceId
      const seen = new Set<string>();
      for (const row of rows) {
        const key = `${row.modelName}:${row.sourceId}`;
        if (!seen.has(key)) {
          seen.add(key);
          modelsData.push({
            ...row,
            collectedAt: new Date(row.collectedAt),
          });
        }
      }

      selectedModelOptions = modelsData.map((m) => ({
        modelName: m.modelName,
        sourceId: m.sourceId,
        sourceName: m.sourceName ?? 'Unknown',
      }));
    } catch {
      modelsData = [];
      selectedModelOptions = [];
    }
  }

  // Query 3: Fetch practical costs for selected models
  let practicalCostsData: PracticalCost[] = [];
  if (modelsData.length > 0) {
    try {
      const extractionIds = modelsData.map((m) => m.id);
      const rows = await db
        .select({
          extractionId: practicalCosts.extractionId,
          scenarioName: practicalCosts.scenarioName,
          estimatedCost: practicalCosts.estimatedCost,
          inputTokens: practicalCosts.inputTokens,
          outputTokens: practicalCosts.outputTokens,
        })
        .from(practicalCosts)
        .where(inArray(practicalCosts.extractionId, extractionIds));

      // Map DB rows to PracticalCost format
      for (const row of rows) {
        const model = modelsData.find((m) => m.id === row.extractionId);
        if (!model) continue;
        if (model.inputPricePer1m === null || model.outputPricePer1m === null)
          continue;

        // Calculate input/output costs from the scenario token counts
        const inputCost =
          (row.inputTokens / 1_000_000) * model.inputPricePer1m;
        const outputCost =
          (row.outputTokens / 1_000_000) * model.outputPricePer1m;

        practicalCostsData.push({
          modelId: model.id,
          modelName: row.scenarioName, // Store scenario name for lookup
          sourceName: model.sourceName,
          confidence: model.confidence,
          inputPricePer1m: model.inputPricePer1m,
          outputPricePer1m: model.outputPricePer1m,
          inputCost,
          outputCost,
          totalCost: row.estimatedCost,
        });
      }
    } catch {
      practicalCostsData = [];
    }
  }

  // Fallback: If no practical_costs in DB, calculate from pricing data
  if (practicalCostsData.length === 0 && modelsData.length > 0) {
    for (const model of modelsData) {
      if (model.inputPricePer1m === null || model.outputPricePer1m === null)
        continue;
      for (const scenario of COST_SCENARIOS) {
        const inputCost =
          (scenario.inputTokens / 1_000_000) * model.inputPricePer1m;
        const outputCost =
          (scenario.outputTokens / 1_000_000) * model.outputPricePer1m;
        practicalCostsData.push({
          modelId: model.id,
          modelName: scenario.name,
          sourceName: model.sourceName,
          confidence: model.confidence,
          inputPricePer1m: model.inputPricePer1m,
          outputPricePer1m: model.outputPricePer1m,
          inputCost,
          outputCost,
          totalCost: inputCost + outputCost,
        });
      }
    }
  }

  // Query 4: Fetch promotions for selected models
  // Fetch ALL promotions then match in application code, because modelPattern
  // can contain wildcards (e.g. "gpt-*", "*") that inArray cannot evaluate.
  let promotionsMap: Record<string, PromotionData[]> = {};
  if (modelNames.length > 0) {
    try {
      const promoRows = await db.select().from(promotions);

      // Build a map keyed by modelName (modelPattern matches modelName)
      for (const row of promoRows) {
        // Match promotions to models by pattern (supports wildcards)
        for (const modelName of modelNames) {
          if (
            row.modelPattern === modelName ||
            row.modelPattern === '*' ||
            (row.modelPattern.endsWith('*') &&
              modelName.startsWith(row.modelPattern.slice(0, -1)))
          ) {
            // Find all sourceIds for this modelName
            const matchingModels = modelsData.filter(
              (m) => m.modelName === modelName,
            );
            for (const m of matchingModels) {
              const key = `${m.modelName}:${m.sourceId}`;
              if (!promotionsMap[key]) promotionsMap[key] = [];
              promotionsMap[key].push({
                id: row.id,
                modelPattern: row.modelPattern,
                type: row.type,
                description: row.description,
                credits: row.credits,
                startDate: row.startDate ? new Date(row.startDate) : null,
                endDate: row.endDate ? new Date(row.endDate) : null,
                sourceUrl: row.sourceUrl,
              });
            }
          }
        }
      }
    } catch {
      promotionsMap = {};
    }
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <ComparePageClient
        allModels={allModels}
        initialSelected={selectedModelOptions}
        modelsData={modelsData}
        practicalCosts={practicalCostsData}
        promotionsMap={promotionsMap}
      />
    </main>
  );
}
