'use client';

import { useState } from 'react';
import { TrendChart } from '@/app/components/TrendChart';
import type { TrendPoint } from '@/app/components/TrendChart';
import { sanitizeDisplayName } from '@/app/lib/pricing-utils';

export interface TrendModelData {
  modelName: string;
  sourceId: number;
  sourceName: string | null;
  history: TrendPoint[];
}

/**
 * Client wrapper for the /trends page.
 * Shows a grid of models with pricing trend data.
 * Click a model to see its trend chart.
 *
 * Per D-01: /trends route
 * Per D-02: Per-model charts
 * Per D-03: All available data
 */
export function TrendsPageClient({ models }: { models: TrendModelData[] }) {
  const [selectedModelIndex, setSelectedModelIndex] = useState<number | null>(
    null
  );

  const selectedModel =
    selectedModelIndex !== null ? models[selectedModelIndex] : null;

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-2">Pricing Trends</h1>
        <p className="text-sm text-gray-500 mb-8">
          Track how AI model prices change over time.
        </p>

        {selectedModel ? (
          <div>
            <button
              onClick={() => setSelectedModelIndex(null)}
              className="text-blue-600 hover:text-blue-800 text-sm mb-6 inline-block cursor-pointer"
            >
              &larr; Back to all models
            </button>
            <TrendChart
              data={selectedModel.history}
              modelName={sanitizeDisplayName(selectedModel.modelName)}
            />
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No trend data yet
            </h2>
            <p className="text-sm text-gray-500">
              Pricing trends will appear after the pipeline collects data over
              multiple days.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model, index) => (
              <button
                key={`${model.modelName}-${model.sourceId}`}
                onClick={() => setSelectedModelIndex(index)}
                className="border border-gray-200 rounded-lg p-4 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <div className="text-sm font-medium text-gray-900">
                  {sanitizeDisplayName(model.modelName)}
                </div>
                {model.sourceName && (
                  <div className="text-xs text-gray-500 mt-1">
                    {model.sourceName}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-2">
                  {model.history.length} data point
                  {model.history.length !== 1 ? 's' : ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
