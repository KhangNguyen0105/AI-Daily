'use client';

import { useState } from 'react';
import { PromotionCard, type PromotionCardData } from './PromotionCard';
import { isPromoActive } from '@/app/lib/promotion-utils';

type FilterType = 'all' | 'free_tier' | 'promotion' | 'beta';

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'free_tier', label: 'Free Tier' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'beta', label: 'Beta' },
];

export function PromotionsPageClient({
  promotions,
}: {
  promotions: PromotionCardData[];
}) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Filter by type
  const filtered =
    activeFilter === 'all'
      ? promotions
      : promotions.filter((p) => p.type === activeFilter);

  // Sort: active promotions first, then expired
  const sorted = [...filtered].sort((a, b) => {
    const aActive = isPromoActive(a.endDate) ? 0 : 1;
    const bActive = isPromoActive(b.endDate) ? 0 : 1;
    return aActive - bActive;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Promotions & Free Tiers
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        Active promotions, beta trials, and free credits across all providers.
      </p>

      {/* Filter pills */}
      <div className="flex gap-2 mt-6">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setActiveFilter(option.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Card grid or empty state */}
      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-lg font-semibold text-gray-900">
            No active promotions
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Promotions and free tier offers will appear here as providers
            announce them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {sorted.map((promo) => (
            <PromotionCard key={promo.id} promo={promo} />
          ))}
        </div>
      )}
    </div>
  );
}
