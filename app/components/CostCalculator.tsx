'use client';

import { useState, useMemo } from 'react';
import { COST_SCENARIOS, CostScenario } from '@/app/lib/cost-scenarios';
import {
  calculateScenarioCosts,
  formatCurrencyPrice,
  sanitizeDisplayName,
  PracticalCost,
} from '@/app/lib/pricing-utils';
import type { PricingRow } from '@/app/lib/types';

/**
 * Interactive cost calculator component.
 * Renders scenario tabs and a ranked list of models with practical cost breakdowns.
 *
 * Per COST-05: Users can compare practical costs side-by-side across models.
 * Per COST-06: Each model row shows input/output token cost breakdown.
 *
 * Props:
 * - data: PricingRow[] from server component
 * - currency: 'usd' | 'vnd' controlled by parent (synced with PricingTable toggle)
 * - exchangeRate: optional custom rate for VND conversion
 */
export function CostCalculator({
  data,
  currency,
  exchangeRate,
}: {
  data: PricingRow[];
  currency: 'usd' | 'vnd';
  exchangeRate?: number;
}) {
  const [selectedScenario, setSelectedScenario] = useState<string>(
    COST_SCENARIOS[0].id
  );

  const scenario = useMemo(
    () => COST_SCENARIOS.find((s) => s.id === selectedScenario) ?? COST_SCENARIOS[0],
    [selectedScenario]
  );

  const costs = useMemo(
    () => calculateScenarioCosts(data, scenario.inputTokens, scenario.outputTokens),
    [data, scenario.inputTokens, scenario.outputTokens]
  );

  return (
    <div>
      {/* Scenario selector */}
      <div className="flex flex-wrap gap-2 mb-3" role="tablist" aria-label="Cost scenarios">
        {COST_SCENARIOS.map((s: CostScenario) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={selectedScenario === s.id}
            onClick={() => setSelectedScenario(s.id)}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
              selectedScenario === s.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Scenario description */}
      <p className="text-sm text-gray-500 mb-1">{scenario.description}</p>

      {/* Token count */}
      <p className="text-xs text-gray-400 mb-4">
        Input: {scenario.inputTokens.toLocaleString()} tokens | Output:{' '}
        {scenario.outputTokens.toLocaleString()} tokens
      </p>

      {/* Ranked model list */}
      {costs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            No models with complete pricing data available for this scenario.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {costs.map((item: PracticalCost, index: number) => (
            <div
              key={item.modelId}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                index === 0
                  ? 'border-l-4 border-green-500 bg-green-50'
                  : 'bg-white border-gray-200'
              }`}
            >
              {/* Left side: rank, model info */}
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`text-lg font-semibold shrink-0 ${
                    index === 0 ? 'text-green-700' : 'text-gray-400'
                  }`}
                >
                  #{index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {sanitizeDisplayName(item.modelName)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {sanitizeDisplayName(item.sourceName ?? 'Unknown')}
                  </p>
                  <span
                    className={`inline-block w-3 h-3 rounded-full mt-1 ${
                      item.confidence === 'verified'
                        ? 'bg-green-500'
                        : item.confidence === 'likely'
                        ? 'bg-yellow-500'
                        : item.confidence === 'low_confidence'
                        ? 'bg-red-500'
                        : 'bg-gray-500'
                    }`}
                    title={item.confidence}
                    aria-label={item.confidence}
                  />
                </div>
              </div>

              {/* Right side: total cost + breakdown */}
              <div className="text-right shrink-0 ml-4">
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrencyPrice(item.totalCost, currency, exchangeRate)}
                </p>
                <p className="text-sm text-gray-500">
                  In: {formatCurrencyPrice(item.inputCost, currency, exchangeRate)} | Out:{' '}
                  {formatCurrencyPrice(item.outputCost, currency, exchangeRate)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
