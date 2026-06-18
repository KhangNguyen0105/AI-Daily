'use client';

import {
  formatCurrencyPrice,
  formatContextWindow,
} from '@/app/lib/pricing-utils';

interface PricingGridProps {
  inputPrice: number | null;
  outputPrice: number | null;
  contextWindow: number | null;
  currency: 'usd' | 'vnd';
  exchangeRate: number;
}

function getCards(currency: 'usd' | 'vnd') {
  const symbol = currency === 'vnd' ? '₫' : '$';
  return [
    { label: `Input ${symbol}/1M`, key: 'input' as const },
    { label: `Output ${symbol}/1M`, key: 'output' as const },
    { label: 'Context Window', key: 'context' as const },
  ];
}

export function PricingGrid({
  inputPrice,
  outputPrice,
  contextWindow,
  currency,
  exchangeRate,
}: PricingGridProps) {
  function getValue(key: 'input' | 'output' | 'context'): string {
    switch (key) {
      case 'input':
        return formatCurrencyPrice(inputPrice, currency, exchangeRate);
      case 'output':
        return formatCurrencyPrice(outputPrice, currency, exchangeRate);
      case 'context':
        return formatContextWindow(contextWindow);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {getCards(currency).map((card) => (
        <div
          key={card.key}
          className="bg-bg-primary border rounded-lg p-6 text-center"
        >
          <p className="text-sm text-text-secondary mb-2">{card.label}</p>
          <p className="text-2xl font-bold">{getValue(card.key)}</p>
        </div>
      ))}
    </div>
  );
}
