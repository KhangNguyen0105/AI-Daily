'use client';

import { useState, useEffect } from 'react';
import { FreeOfferCard } from './FreeOfferCard';

/**
 * FreeOffersSection — fetches and displays free model offers.
 * Phase 11: Digest & Free Offers Enhancement
 *
 * Queries the /api/digest-promotions endpoint for free_tier type promotions.
 * Renders a grid of FreeOfferCard components.
 */

interface FreeOffer {
  id: number;
  modelPattern: string;
  type: string;
  description: string;
  credits: string | null;
  sourceName: string;
  sourceUrl: string;
}

interface FreeOffersSectionProps {
  date: string;
}

export function FreeOffersSection({ date }: FreeOffersSectionProps) {
  const [offers, setOffers] = useState<FreeOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOffers() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/digest-promotions?date=${date}`);
        if (!response.ok) {
          throw new Error('Failed to fetch promotions');
        }

        const data = await response.json();
        setOffers(data.freeOffers || []);
      } catch (err) {
        console.error('Error fetching free offers:', err);
        setError('Unable to load free offers');
      } finally {
        setLoading(false);
      }
    }

    fetchOffers();
  }, [date]);

  if (loading) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-bold text-green-600 dark:text-green-400 flex items-center gap-2 mb-4">
          🎉 Free Models
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 animate-pulse"
            >
              <div className="h-4 bg-green-500/20 rounded w-16 mb-3" />
              <div className="h-6 bg-green-500/20 rounded w-3/4 mb-2" />
              <div className="h-4 bg-green-500/20 rounded w-full mb-4" />
              <div className="h-4 bg-green-500/20 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-bold text-green-600 dark:text-green-400 flex items-center gap-2 mb-4">
          🎉 Free Models
        </h2>
        <p className="text-text-tertiary text-sm">{error}</p>
      </div>
    );
  }

  if (offers.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-green-600 dark:text-green-400 flex items-center gap-2 mb-4">
        🎉 Free Models
        <span className="text-sm font-normal text-green-500/70">
          ({offers.length})
        </span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {offers.map((offer) => (
          <FreeOfferCard
            key={offer.id}
            modelPattern={offer.modelPattern}
            description={offer.description}
            providerName={offer.sourceName}
            providerUrl={offer.sourceUrl}
            credits={offer.credits}
          />
        ))}
      </div>
    </div>
  );
}
