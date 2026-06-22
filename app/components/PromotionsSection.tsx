'use client';

import { useState, useEffect } from 'react';
import { PromotionCard } from './PromotionCard';

/**
 * PromotionsSection — fetches and displays promotion/discount offers.
 * Phase 11: Digest & Free Offers Enhancement
 *
 * Queries the /api/digest-promotions endpoint for promotion type promotions.
 * Renders a grid of PromotionCard components.
 */

interface Promotion {
  id: number;
  modelPattern: string;
  type: string;
  description: string;
  credits: string | null;
  sourceName: string;
  sourceUrl: string;
}

interface PromotionsSectionProps {
  date: string;
}

export function PromotionsSection({ date }: PromotionsSectionProps) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPromotions() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/digest-promotions?date=${date}`);
        if (!response.ok) {
          throw new Error('Failed to fetch promotions');
        }

        const data = await response.json();
        setPromotions(data.promotions || []);
      } catch (err) {
        console.error('Error fetching promotions:', err);
        setError('Unable to load promotions');
      } finally {
        setLoading(false);
      }
    }

    fetchPromotions();
  }, [date]);

  if (loading) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-4">
          💰 Promotions & Discounts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 animate-pulse"
            >
              <div className="h-4 bg-amber-500/20 rounded w-16 mb-3" />
              <div className="h-6 bg-amber-500/20 rounded w-3/4 mb-2" />
              <div className="h-4 bg-amber-500/20 rounded w-full mb-4" />
              <div className="h-4 bg-amber-500/20 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-4">
          💰 Promotions & Discounts
        </h2>
        <p className="text-text-tertiary text-sm">{error}</p>
      </div>
    );
  }

  if (promotions.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-4">
        💰 Promotions & Discounts
        <span className="text-sm font-normal text-amber-500/70">
          ({promotions.length})
        </span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promotions.map((promo) => (
          <PromotionCard
            key={promo.id}
            modelPattern={promo.modelPattern}
            description={promo.description}
            providerName={promo.sourceName}
            providerUrl={promo.sourceUrl}
          />
        ))}
      </div>
    </div>
  );
}
