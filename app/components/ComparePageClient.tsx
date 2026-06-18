'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ModelSelector, type ModelOption } from '@/app/components/ModelSelector';
import { ComparisonCard } from '@/app/components/ComparisonCard';
import type { PracticalCost } from '@/app/lib/pricing-utils';
import type { PromotionData } from '@/app/components/PromotionsList';

/**
 * Client component for the /compare page.
 * Per D-10: /compare route with URL param sync.
 * Per D-11: dropdown selectors.
 * Per D-13: side-by-side cards.
 */
export function ComparePageClient({
  allModels,
  initialSelected,
  practicalCostsMap,
  promotionsMap,
  pricingDataMap,
}: {
  allModels: ModelOption[];
  initialSelected: ModelOption[];
  practicalCostsMap: Record<string, PracticalCost[]>;
  promotionsMap: Record<string, PromotionData[]>;
  pricingDataMap: Record<string, {
    inputPricePer1m: number | null;
    outputPricePer1m: number | null;
    contextWindow: number | null;
    confidence: 'verified' | 'likely' | 'low_confidence';
    sourceName: string | null;
  }>;
}) {
  const router = useRouter();
  const [selectedModels, setSelectedModels] = useState<ModelOption[]>(initialSelected);

  // WR-05: Memoize filtered models to avoid filtering 3 times per render
  const validModels = useMemo(
    () => selectedModels.filter((m) => m.modelName),
    [selectedModels]
  );

  const handleSelect = (index: number, model: ModelOption) => {
    const newSelected = [...selectedModels];
    newSelected[index] = model;
    setSelectedModels(newSelected);
    updateURL(newSelected);
  };

  const handleAdd = () => {
    if (selectedModels.length < 5) {
      setSelectedModels([...selectedModels, { modelName: '', sourceId: -1, sourceName: '' }]);
    }
  };

  const handleRemove = (index: number) => {
    if (selectedModels.length > 2) {
      const newSelected = selectedModels.filter((_, i) => i !== index);
      setSelectedModels(newSelected);
      updateURL(newSelected);
    }
  };

  const updateURL = (models: ModelOption[]) => {
    const validModels = models.filter((m) => m.modelName);
    if (validModels.length > 0) {
      const names = validModels.map((m) => encodeURIComponent(m.modelName)).join(',');
      router.push(`/compare?models=${names}`, { scroll: false });
    } else {
      router.push('/compare', { scroll: false });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page heading */}
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Compare Models</h1>
      <p className="text-sm text-text-secondary mb-8">
        Select 2-5 models to compare pricing, context window, and practical costs side by side.
      </p>

      {/* Model selectors */}
      <div className="flex flex-wrap gap-4 mb-8">
        {selectedModels.map((selected, index) => (
          <div key={index} className="flex-1 min-w-[200px] flex gap-2">
            <ModelSelector
              models={allModels}
              selected={selected.modelName ? selected : null}
              onSelect={(model) => handleSelect(index, model)}
              placeholder={`Model ${index + 1}`}
            />
            {selectedModels.length > 2 && (
              <button
                onClick={() => handleRemove(index)}
                className="px-2 py-1 text-sm text-badge-red-text hover:opacity-80"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {selectedModels.length < 5 && (
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-sm text-accent-blue hover:text-accent-blue/80 border border-accent-blue/50 rounded-lg"
          >
            + Add model
          </button>
        )}
      </div>

      {/* Comparison cards or empty state */}
      {validModels.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg font-medium text-text-primary mb-2">Select models to compare</p>
          <p className="text-sm text-text-secondary">
            Use the dropdowns above to select 2-5 models for side-by-side comparison.
          </p>
        </div>
      ) : validModels.length === 1 ? (
        <div className="text-center py-12">
          <p className="text-lg font-medium text-text-primary mb-2">Add another model</p>
          <p className="text-sm text-text-secondary">
            Select at least 2 models to see a side-by-side comparison.
          </p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {validModels.map((model) => {
              const key = model.modelName;
              const pricing = pricingDataMap[key] || {
                inputPricePer1m: null,
                outputPricePer1m: null,
                contextWindow: null,
                confidence: 'low_confidence',
                sourceName: null,
              };

              return (
                <ComparisonCard
                  key={key}
                  modelName={model.modelName}
                  sourceName={pricing.sourceName || model.sourceName}
                  inputPricePer1m={pricing.inputPricePer1m}
                  outputPricePer1m={pricing.outputPricePer1m}
                  contextWindow={pricing.contextWindow}
                  confidence={pricing.confidence}
                  practicalCosts={practicalCostsMap[key] || []}
                  promotions={promotionsMap[key] || []}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}
