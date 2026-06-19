'use client';

/**
 * Shared currency toggle button group (USD / VND).
 * Extracted from ModelDetailClient and PricingTable per IN-03 (DRY).
 *
 * Controlled component: parent owns the state via `currency` + `onCurrencyChange`.
 */
export function CurrencyToggle({
  currency,
  onCurrencyChange,
}: {
  currency: 'usd' | 'vnd';
  onCurrencyChange: (c: 'usd' | 'vnd') => void;
}) {
  return (
    <div className="flex gap-1" role="group" aria-label="Toggle currency">
      <button
        type="button"
        onClick={() => onCurrencyChange('usd')}
        className={`px-3 py-1 text-sm rounded-l border transition-colors ${
          currency === 'usd'
            ? 'bg-accent-blue text-bg-primary border-accent-blue'
            : 'bg-bg-primary text-text-secondary border-border-secondary hover:bg-bg-secondary'
        }`}
      >
        USD
      </button>
      <button
        type="button"
        onClick={() => onCurrencyChange('vnd')}
        className={`px-3 py-1 text-sm rounded-r border-t border-b border-r transition-colors ${
          currency === 'vnd'
            ? 'bg-accent-blue text-bg-primary border-accent-blue'
            : 'bg-bg-primary text-text-secondary border-border-secondary hover:bg-bg-secondary'
        }`}
      >
        VND
      </button>
    </div>
  );
}
