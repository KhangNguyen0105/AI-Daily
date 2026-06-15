'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ModelSelector, type ModelOption } from './ModelSelector';
import { ComparisonCard } from './ComparisonCard';
import type { PricingRow } from '@/app/components/PricingTable';
import type { PracticalCost } from '@/app/lib/pricing-utils';
import type { PromotionData } from '@/app/components/PromotionsList';

const MAX_MODELS = 5;
const MIN_MODELS = 2;

/**
 * Client wrapper for the /compare page.
 * Per D-10: URL sync with ?models= query param.
 * Per D-11: 2-5 model selectors with search.
 * Per D-13: Side-by-side comparison cards.
 */
export function ComparePageClient({
  allModels,
  initialSelected,
  modelsData,
  practicalCosts,
  promotionsMap,
}: {
  allModels: ModelOption[];
  initialSelected: ModelOption[];
  modelsData: PricingRow[];
  practicalCosts: PracticalCost[];
  promotionsMap: Record<string, PromotionData[]>;
}) {
  const router = useRouter();
  const [selectedModels, setSelectedModels] =
    useState<ModelOption[]>(initialSelected);

  // Sync URL when selection changes
  const syncUrl = useCallback(
    (models: ModelOption[]) => {
      if (models.length === 0) {
        router.replace('/compare', { scroll: false });
      } else {
        const param = models
          .map((m) => encodeURIComponent(m.modelName))
          .join(',');
        router.replace(`/compare?models=${param}`, { scroll: false });
      }
    },
    [router],
  );

  const handleSelect = useCallback(
    (index: number, model: ModelOption) => {
      const next = [...selectedModels];
      next[index] = model;
      setSelectedModels(next);
      syncUrl(next);
    },
    [selectedModels, syncUrl],
  );

  const handleAdd = useCallback(() => {
    if (selectedModels.length >= MAX_MODELS) return;
    const next = [...selectedModels, null as unknown as ModelOption];
    setSelectedModels(next);
  }, [selectedModels]);

  const handleRemove = useCallback(
    (index: number) => {
      if (selectedModels.length <= MIN_MODELS) return;
      const next = selectedModels.filter((_, i) => i !== index);
      setSelectedModels(next);
      syncUrl(next);
    },
    [selectedModels, syncUrl],
  );

  // Get the actual PricingRow for each selected model
  const selectedRows = selectedModels
    .filter((m): m is ModelOption => m !== null)
    .map((m) => {
      return modelsData.find(
        (d) =>
          d.modelName === m.modelName && d.sourceId === m.sourceId,
      );
    })
    .filter((r): r is PricingRow => r !== undefined);

  const validSelectedCount = selectedModels.filter(
    (m): m is ModelOption => m !== null,
  ).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page heading per UI-SPEC */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">
        Compare Models
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Select 2-5 models to compare pricing, context window, and practical
        costs side by side.
      </p>

      {/* Model selectors */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        {selectedModels.map((selected, index) => (
          <div key={index} className="flex-1 flex items-start gap-2">
            <div className="flex-1">
              <ModelSelector
                models={allModels}
                selected={selected}
                onSelect={(model) => handleSelect(index, model)}
                placeholder={`Model ${index + 1}...`}
              />
            </div>
            {selectedModels.length > MIN_MODELS && (
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="mt-2 px-2 py-1 text-xs text-gray-500 hover:text-red-600 border border-gray-300 rounded hover:border-red-300 transition-colors"
                aria-label={`Remove model ${index + 1}`}
              >
                Remove
              </button>
            )}
          </div>
        ))}

        {/* Add model button */}
        {selectedModels.length < MAX_MODELS && (
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            + Add model
          </button>
        )}
      </div>

      {/* Comparison cards or empty states */}
      {validSelectedCount === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Select models to compare
          </h2>
          <p className="text-sm text-gray-500">
            Use the dropdowns above to select 2-5 models for side-by-side
            comparison.
          </p>
        </div>
      ) : validSelectedCount === 1 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Add another model
          </h2>
          <p className="text-sm text-gray-500">
            Select at least 2 models to see a side-by-side comparison.
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-4 ${
            selectedRows.length > 3
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-x-auto'
              : selectedRows.length === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {selectedRows.map((model) => {
            const key = `${model.modelName}:${model.sourceId}`;
            return (
              <ComparisonCard
                key={key}
                model={model}
                practicalCosts={practicalCosts}
                promotions={promotionsMap[key] ?? []}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
