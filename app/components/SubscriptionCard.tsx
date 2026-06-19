'use client';

import { format } from 'date-fns';
import { isSafeUrl } from '@/app/lib/url-utils';
import type { SubscriptionPlanData } from '@/app/lib/types';

/**
 * Individual subscription plan card component.
 * Follows PromotionCard pattern: border/bg classes, badge styles, source link.
 * Handles null/ambiguous pricing via rawPriceText (review #2).
 * Shows "Last checked" timestamp from crawledAt (review suggestion).
 */
export function SubscriptionCard({ plan }: { plan: SubscriptionPlanData }) {
  // Format monthly price as currency
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  // Capitalize first letter of provider name
  const capitalizeProvider = (name: string): string => {
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <article className="border rounded-lg p-4 bg-white border-gray-200 hover:shadow-md transition-shadow">
      {/* Provider name + plan name row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-gray-500">
          {capitalizeProvider(plan.providerName)}
        </span>
        <span className="text-lg font-semibold text-gray-900">
          {plan.planName}
        </span>
      </div>

      {/* Price display (review #2 -- handles null/ambiguous pricing) */}
      {plan.monthlyPrice !== null ? (
        <p className="text-xl font-semibold text-gray-900">
          {formatPrice(plan.monthlyPrice)}/mo
        </p>
      ) : plan.rawPriceText !== null ? (
        <p className="text-lg font-medium text-gray-500">{plan.rawPriceText}</p>
      ) : (
        <p className="text-sm text-gray-400">Price not available</p>
      )}

      {/* Annual breakdown */}
      {plan.annualPrice !== null && plan.annualMonthlyPrice !== null && (
        <p className="text-sm text-gray-500 mt-1">
          {formatPrice(plan.annualPrice)}/yr ({formatPrice(plan.annualMonthlyPrice)}/mo)
        </p>
      )}

      {/* Free trial badge */}
      {plan.freeTrialDays !== null && plan.freeTrialDays > 0 && (
        <span
          className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mb-3"
          aria-label={`Free trial available for ${plan.freeTrialDays} days`}
        >
          {plan.freeTrialConditions
            ? `Free trial: ${plan.freeTrialDays} days — ${plan.freeTrialConditions}`
            : `Free trial: ${plan.freeTrialDays} days`}
        </span>
      )}
      {plan.freeTrialConditions !== null &&
        (plan.freeTrialDays === null || plan.freeTrialDays === 0) && (
          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mb-3">
            Free trial: {plan.freeTrialConditions}
          </span>
        )}

      {/* Key features list */}
      {plan.keyFeatures.length > 0 && (
        <ul className="text-sm text-gray-600 space-y-1 mb-3">
          {plan.keyFeatures.slice(0, 4).map((feature, index) => (
            <li key={index} className="flex items-start gap-1">
              <span className="text-gray-400 mt-0.5">•</span>
              <span>{feature}</span>
            </li>
          ))}
          {plan.keyFeatures.length > 4 && (
            <li className="text-xs text-gray-400">
              +{plan.keyFeatures.length - 4} more
            </li>
          )}
        </ul>
      )}

      {/* Last checked timestamp (review suggestion -- freshness indicator) */}
      {plan.crawledAt !== null && (
        <p className="text-xs text-gray-400 mt-2">
          Last checked: {format(plan.crawledAt, 'MMM d, yyyy')}
        </p>
      )}

      {/* Source link */}
      {plan.sourceUrl && isSafeUrl(plan.sourceUrl) && (
        <a
          href={plan.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
        >
          View details
        </a>
      )}
    </article>
  );
}
