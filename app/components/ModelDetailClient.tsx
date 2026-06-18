'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  sanitizeDisplayName,
  formatContextWindow,
  getModelFamily,
  getConfidenceColor,
} from '@/app/lib/pricing-utils';
import { getProviderLogo } from '@/app/lib/provider-metadata';
import { PricingGrid } from './PricingGrid';
import { PriceHistoryChart, type HistoryPoint } from './PriceHistoryChart';
import { PromotionsList, type PromotionData } from './PromotionsList';
import { ProviderLinks } from './ProviderLinks';
import { BellIcon } from './BellIcon';
import { CurrencyToggle } from './CurrencyToggle';

export interface ModelDetailData {
  id: number;
  modelName: string;
  inputPricePer1m: number | null;
  outputPricePer1m: number | null;
  contextWindow: number | null;
  confidence: 'verified' | 'likely' | 'low_confidence';
  collectedAt: Date;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceId: number;
}

export function ModelDetailClient({
  model,
  history,
  promotions,
  exchangeRate,
}: {
  model: ModelDetailData;
  history: HistoryPoint[];
  promotions: PromotionData[];
  exchangeRate: number;
}) {
  const [currency, setCurrency] = useState<'usd' | 'vnd'>('usd');

  const displayName = sanitizeDisplayName(model.modelName);
  const providerLogo = model.sourceName
    ? getProviderLogo(model.sourceName)
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-8">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-flex items-center gap-1"
        >
          &larr; Back to pricing
        </Link>

        <div className="flex items-center gap-2 mt-2">
          <h1 className="text-3xl font-bold">{displayName}</h1>
          <BellIcon
            modelName={model.modelName}
            sourceId={model.sourceId}
            currentPrice={model.inputPricePer1m}
          />
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {model.sourceName && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-sm">
              {providerLogo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={providerLogo}
                  alt=""
                  className="w-4 h-4"
                />
              )}
              {model.sourceName}
            </span>
          )}

          <span
            className={`inline-block px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(model.confidence)}`}
          >
            {model.confidence.replace('_', ' ')}
          </span>

          <span className="text-sm text-gray-500">
            Collected {format(model.collectedAt, 'MMM d, yyyy h:mm a')}
          </span>
        </div>
      </div>

      {/* Pricing Grid with Currency Toggle */}
      <section className="border-b py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Current Pricing</h2>
          <CurrencyToggle currency={currency} onCurrencyChange={setCurrency} />
        </div>

        <PricingGrid
          inputPrice={model.inputPricePer1m}
          outputPrice={model.outputPricePer1m}
          contextWindow={model.contextWindow}
          currency={currency}
          exchangeRate={exchangeRate}
        />
      </section>

      {/* Price History Chart */}
      <section className="border-b py-8">
        <h2 className="text-xl font-semibold mb-4">Price History</h2>
        <PriceHistoryChart data={history} />
      </section>

      {/* Specifications */}
      <section className="border-b py-8">
        <h2 className="text-xl font-semibold mb-4">Specifications</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <dt className="text-sm text-gray-500">Context Window</dt>
            <dd className="text-lg font-medium">
              {formatContextWindow(model.contextWindow)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Model Family</dt>
            <dd className="text-lg font-medium">
              {getModelFamily(model.modelName)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">First Collected</dt>
            <dd className="text-lg font-medium">
              {format(model.collectedAt, 'MMM d, yyyy')}
            </dd>
          </div>
        </dl>
      </section>

      {/* Promotions */}
      <section className="border-b py-8">
        <h2 className="text-xl font-semibold mb-4">Promotions & Free Tier</h2>
        <PromotionsList promotions={promotions} />
      </section>

      {/* Provider Links */}
      {(model.sourceName || model.sourceUrl) && (
        <section className="border-b py-8">
          <h2 className="text-xl font-semibold mb-4">Provider Resources</h2>
          <ProviderLinks
            providerName={model.sourceName ?? ''}
            sourceUrl={model.sourceUrl}
          />
        </section>
      )}

      {/* Digest Mentions (placeholder until Phase 6) */}
      <section className="py-8">
        <h2 className="text-xl font-semibold mb-4">Daily Digest Mentions</h2>
        <p className="text-gray-500 text-sm">
          Daily digest mentions will appear here once the content engine is
          active.
        </p>
      </section>
    </div>
  );
}
