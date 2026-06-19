'use client';

import { useState } from 'react';
import { PromotionData } from '@/app/components/PromotionsList';
import { PromotionCard } from '@/app/components/PromotionCard';

type FilterType = 'all' | 'free_tier' | 'promotion' | 'beta';

/**
 * Client component for the /promotions page.
 * Shows card grid with type filter and active/expired grouping.
 * Per D-06: dedicated /promotions route.
 * Per D-07: card grid layout with type filter.
 * Per D-08: show all promos, gray out expired ones.
 */
export function PromotionsPageClient({
  promotions,
}: {
  promotions: PromotionData[];
}) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Filter by type
  const filtered =
    activeFilter === 'all'
      ? promotions
      : promotions.filter((p) => p.type === activeFilter);

  // Sort: active promotions first, then expired (per D-08)
  const sorted = [...filtered].sort((a, b) => {
    const aActive = a.endDate === null || new Date(a.endDate).getTime() > Date.now();
    const bActive = b.endDate === null || new Date(b.endDate).getTime() > Date.now();
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return 0;
  });

  const filters: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Free Tier', value: 'free_tier' },
    { label: 'Promotion', value: 'promotion' },
    { label: 'Beta', value: 'beta' },
  ];

  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto max-w-6xl mx-auto px-4 py-8">
      {/* Page heading */}
      <h1 className="text-2xl font-semibold text-text-primary mb-2">
        Promotions & Free Tiers
      </h1>
      <p className="text-sm text-text-secondary mb-8">
        Active promotions, beta trials, and free credits across all providers.
      </p>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === filter.value
                ? 'bg-accent-blue text-white'
                : 'bg-bg-tertiary text-text-primary hover:bg-bg-secondary'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Card grid or empty state */}
      {sorted.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg font-medium text-text-primary mb-2">
            No active promotions
          </p>
          <p className="text-sm text-text-secondary">
            Promotions and free tier offers will appear here as providers announce
            them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((promo) => (
            <PromotionCard key={promo.id} promo={promo} />
          ))}
        </div>
      )}
    </div>
  );
}
