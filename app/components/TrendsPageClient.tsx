'use client';

import { useState } from 'react';
import { TrendChart, TrendPoint } from '@/app/components/TrendChart';
import { sanitizeDisplayName } from '@/app/lib/pricing-utils';

export interface TrendModelData {
  modelName: string;
  sourceId: number;
  sourceName: string | null;
  history: TrendPoint[];
}

/**
 * Client component for the /trends page.
 * Shows model list grid, click to view trend chart.
 * Per UI-SPEC: /trends page layout, model list grid, empty states.
 */
export function TrendsPageClient({ models }: { models: TrendModelData[] }) {
  const [selectedModelIndex, setSelectedModelIndex] = useState<number | null>(null);

  const selectedModel = selectedModelIndex !== null ? models[selectedModelIndex] : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page heading */}
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Pricing Trends</h1>
      <p className="text-sm text-text-secondary mb-8">
        Track how AI model prices change over time.
      </p>

      {/* Back button when viewing a chart */}
      {selectedModel && (
        <button
          onClick={() => setSelectedModelIndex(null)}
          className="text-sm text-accent-blue hover:text-accent-blue-hover mb-6"
        >
          ← Back to all models
        </button>
      )}

      {/* Model list or chart */}
      {!selectedModel ? (
        models.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg font-medium text-text-primary mb-2">No trend data yet</p>
            <p className="text-sm text-text-secondary">
              Pricing trends will appear after the pipeline collects data over multiple days.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model, index) => (
              <button
                key={`${model.modelName}-${model.sourceId}`}
                onClick={() => setSelectedModelIndex(index)}
                className="bg-bg-primary border border-border-primary rounded-lg p-4 text-left hover:border-accent-blue hover:shadow-sm transition-all"
              >
                <p className="text-sm font-medium text-text-primary">
                  {sanitizeDisplayName(model.modelName)}
                </p>
                {model.sourceName && (
                  <p className="text-xs text-text-tertiary mt-1">{model.sourceName}</p>
                )}
                <p className="text-xs text-text-tertiary mt-2">
                  {model.history.length} data point{model.history.length !== 1 ? 's' : ''}
                </p>
              </button>
            ))}
          </div>
        )
      ) : (
        <TrendChart
          data={selectedModel.history}
          modelName={sanitizeDisplayName(selectedModel.modelName)}
        />
      )}
    </div>
  );
}
