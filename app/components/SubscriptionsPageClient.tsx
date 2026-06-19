'use client';

import { useState } from 'react';
import type { SubscriptionPlanData } from '@/app/lib/types';
import { SubscriptionCard } from '@/app/components/SubscriptionCard';

type FilterType = 'all' | 'free_trial' | 'monthly' | 'annual';
type SortType = 'price_asc' | 'price_desc' | 'trial_desc';

/**
 * Client component for the /subscriptions page.
 * Shows card grid with filter pills and sort controls.
 * Follows PromotionsPageClient pattern exactly.
 */
export function SubscriptionsPageClient({
  plans,
}: {
  plans: SubscriptionPlanData[];
}) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('price_asc');

  // Filter logic (review #7 -- explicit semantics)
  const filtered = plans.filter((plan) => {
    switch (activeFilter) {
      case 'all':
        return true;
      case 'free_trial':
        // Show plans with trial days > 0 OR trial conditions text
        return (
          (plan.freeTrialDays !== null && plan.freeTrialDays > 0) ||
          plan.freeTrialConditions !== null
        );
      case 'monthly':
        return plan.monthlyPrice !== null;
      case 'annual':
        return plan.annualPrice !== null;
      default:
        return true;
    }
  });

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc': {
        // Nulls last
        if (a.monthlyPrice === null && b.monthlyPrice === null) return 0;
        if (a.monthlyPrice === null) return 1;
        if (b.monthlyPrice === null) return -1;
        return a.monthlyPrice - b.monthlyPrice;
      }
      case 'price_desc': {
        if (a.monthlyPrice === null && b.monthlyPrice === null) return 0;
        if (a.monthlyPrice === null) return 1;
        if (b.monthlyPrice === null) return -1;
        return b.monthlyPrice - a.monthlyPrice;
      }
      case 'trial_desc': {
        // Nulls last
        if (a.freeTrialDays === null && b.freeTrialDays === null) return 0;
        if (a.freeTrialDays === null) return 1;
        if (b.freeTrialDays === null) return -1;
        return b.freeTrialDays - a.freeTrialDays;
      }
      default:
        return 0;
    }
  });

  const filters: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Free Trial', value: 'free_trial' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Annual', value: 'annual' },
  ];

  const sortOptions: { label: string; value: SortType }[] = [
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Free Trial: Longest', value: 'trial_desc' },
  ];

  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto max-w-6xl mx-auto px-4 py-8">
      {/* Page heading */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">
        Consumer AI Subscriptions
      </h1>
      <p className="text-sm text-gray-600 mb-8">
        Monthly and annual subscription plans for consumer AI products, including
        free trials and promotional offers.
      </p>

      {/* Filter pills + sort controls */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === filter.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter.label}
          </button>
        ))}

        {/* Sort dropdown — right-aligned */}
        <div className="ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card grid or empty state */}
      {sorted.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg font-medium text-gray-900 mb-2">
            No subscription plans found
          </p>
          <p className="text-sm text-gray-600">
            Subscription plans will appear here as consumer AI providers publish
            their pricing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((plan) => (
            <SubscriptionCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
