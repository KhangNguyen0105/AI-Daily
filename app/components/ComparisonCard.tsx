'use client';

import { formatPrice, formatContextWindow, getConfidenceColor } from '@/app/lib/pricing-utils';
import type { PracticalCost } from '@/app/lib/pricing-utils';
import type { PromotionData } from '@/app/components/PromotionsList';

/**
 * Single model comparison card showing all dimensions.
 * Per D-12: pricing, context window, practical costs, free tier status, confidence.
 * Per D-13: side-by-side cards.
 */
export function ComparisonCard({
  modelName,
  sourceName,
  inputPricePer1m,
  outputPricePer1m,
  contextWindow,
  confidence,
  practicalCosts,
  promotions,
}: {
  modelName: string;
  sourceName: string | null;
  inputPricePer1m: number | null;
  outputPricePer1m: number | null;
  contextWindow: number | null;
  confidence: 'verified' | 'likely' | 'low_confidence';
  practicalCosts: PracticalCost[];
  promotions: PromotionData[];
}) {
  return (
    <div className="border rounded-lg p-4 flex-shrink-0 w-full lg:w-80">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-text-primary">{modelName}</h3>
        {sourceName && (
          <p className="text-sm text-text-tertiary">{sourceName}</p>
        )}
        <span
          className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(confidence)}`}
        >
          {confidence.replace('_', ' ')}
        </span>
      </div>

      {/* Pricing */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">
          Pricing
        </h4>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Input</span>
            <span className="font-medium">{formatPrice(inputPricePer1m)}/1M</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Output</span>
            <span className="font-medium">{formatPrice(outputPricePer1m)}/1M</span>
          </div>
        </div>
      </div>

      {/* Context Window */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">
          Context Window
        </h4>
        <p className="text-sm font-medium">{formatContextWindow(contextWindow)}</p>
      </div>

      {/* Practical Costs */}
      {practicalCosts.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">
            Practical Costs
          </h4>
          <div className="space-y-2">
            {practicalCosts.map((cost) => (
              <div key={cost.modelId} className="flex justify-between text-sm">
                <span className="text-text-secondary">{cost.modelName}</span>
                <span className="font-medium">{formatPrice(cost.totalCost)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Free Tier Status */}
      <div>
        <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">
          Free Tier
        </h4>
        {promotions.length > 0 ? (
          <div className="space-y-1">
            {promotions.map((promo) => (
              <span
                key={promo.id}
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-1 ${
                  promo.type === 'free_tier'
                    ? 'bg-badge-green-bg text-badge-green-text'
                    : promo.type === 'promotion'
                      ? 'bg-badge-blue-bg text-badge-blue-text'
                      : 'bg-badge-purple-bg text-badge-purple-text'
                }`}
              >
                {promo.type === 'free_tier' ? 'Free tier' : promo.type}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary">No free tier</p>
        )}
      </div>
    </div>
  );
}
