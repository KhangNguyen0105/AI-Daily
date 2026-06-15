'use client';

import {
  formatPrice,
  formatContextWindow,
  sanitizeDisplayName,
  getConfidenceColor,
} from '@/app/lib/pricing-utils';
import type { PracticalCost } from '@/app/lib/pricing-utils';
import type { PricingRow } from '@/app/components/PricingTable';
import type { PromotionData } from '@/app/components/PromotionsList';
import { COST_SCENARIOS } from '@/app/lib/cost-scenarios';

/**
 * Single model comparison card for the /compare page.
 * Per D-12: Shows pricing, context window, practical costs, free tier status, confidence.
 * Per D-13: Side-by-side card layout.
 *
 * Uses server-calculated practical costs for all 4 scenarios.
 */

// Badge styles per UI-SPEC
const PROMO_BADGE_STYLES: Record<string, string> = {
  free_tier: 'bg-green-100 text-green-800',
  promotion: 'bg-blue-100 text-blue-800',
  beta: 'bg-purple-100 text-purple-800',
};

const PROMO_BADGE_LABELS: Record<string, string> = {
  free_tier: 'Free tier',
  promotion: 'Promotion',
  beta: 'Beta',
};

export function ComparisonCard({
  model,
  practicalCosts,
  promotions,
}: {
  model: PricingRow;
  practicalCosts: PracticalCost[];
  promotions: PromotionData[];
}) {
  const displayName = sanitizeDisplayName(model.modelName);

  // Build a map of scenario ID -> cost for this model
  const costMap = new Map<string, PracticalCost>();
  for (const cost of practicalCosts) {
    if (cost.modelId === model.id) {
      // Match by scenario name stored in scenarioName field, or by totalCost
      costMap.set(cost.modelName, cost);
    }
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{displayName}</h3>
        <p className="text-sm text-gray-500">
          {model.sourceName ?? 'Unknown provider'}
        </p>
        <span
          className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${getConfidenceColor(model.confidence)}`}
        >
          {model.confidence.replace('_', ' ')}
        </span>
      </div>

      {/* Pricing */}
      <div className="border-t pt-3 mb-3">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Pricing
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-gray-500">Input</p>
            <p className="text-sm font-medium text-gray-900">
              {formatPrice(model.inputPricePer1m)}/1M tokens
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Output</p>
            <p className="text-sm font-medium text-gray-900">
              {formatPrice(model.outputPricePer1m)}/1M tokens
            </p>
          </div>
        </div>
      </div>

      {/* Context Window */}
      <div className="border-t pt-3 mb-3">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Context Window
        </h4>
        <p className="text-sm font-medium text-gray-900">
          {formatContextWindow(model.contextWindow)}
        </p>
      </div>

      {/* Practical Costs */}
      <div className="border-t pt-3 mb-3">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Practical Costs
        </h4>
        <div className="space-y-2">
          {COST_SCENARIOS.map((scenario) => {
            // Find matching cost by scenario name
            const cost = practicalCosts.find(
              (c) =>
                c.modelId === model.id &&
                c.modelName === scenario.name,
            );
            return (
              <div
                key={scenario.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-600">{scenario.name}</span>
                <span className="font-medium text-gray-900">
                  {cost ? formatPrice(cost.totalCost) : 'N/A'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Free Tier / Promotions */}
      <div className="border-t pt-3">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Free Tier & Promotions
        </h4>
        {promotions.length > 0 ? (
          <div className="space-y-1">
            {promotions.map((promo) => (
              <span
                key={promo.id}
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-1 ${PROMO_BADGE_STYLES[promo.type] ?? 'bg-gray-100 text-gray-800'}`}
              >
                {PROMO_BADGE_LABELS[promo.type] ?? promo.type}
                {promo.credits ? ` (${promo.credits})` : ''}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No free tier</p>
        )}
      </div>
    </div>
  );
}
