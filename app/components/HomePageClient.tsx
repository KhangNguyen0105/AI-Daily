'use client';

import { useState } from 'react';
import { PricingTable, type PricingRow } from '@/app/components/PricingTable';
import { CostCalculator } from '@/app/components/CostCalculator';

/**
 * Client wrapper for the landing page that synchronizes currency state
 * between PricingTable and CostCalculator.
 *
 * Per COST-01: Currency toggle in PricingTable also updates CostCalculator display.
 * Per COST-05: Side-by-side cost comparison uses the same currency as the pricing table.
 *
 * Server-side data fetching stays in page.tsx (server component).
 * This component owns the currency state and passes it down to both children.
 */
export function HomePageClient({
  data,
  exchangeRate,
}: {
  data: PricingRow[];
  exchangeRate: number;
}) {
  const [currency, setCurrency] = useState<'usd' | 'vnd'>('usd');

  return (
    <>
      {/* Pricing Data Section */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Latest Pricing Data
        </h2>

        <PricingTable
          data={data}
          exchangeRate={exchangeRate}
          currency={currency}
          onCurrencyChange={setCurrency}
        />
      </div>

      {/* Practical Cost Calculator Section */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-2 text-center">
          What Does It Actually Cost?
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Per-token pricing is abstract. These scenarios show what real usage actually costs
          &mdash; like 10 long prompts, a document summary, or a full coding-agent session.
        </p>

        <CostCalculator
          data={data}
          currency={currency}
          exchangeRate={exchangeRate}
        />
      </div>
    </>
  );
}
