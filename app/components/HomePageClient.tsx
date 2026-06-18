'use client';

import { useState } from 'react';
import { PricingTable } from '@/app/components/PricingTable';
import type { PricingRow } from '@/app/lib/types';
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
    <div className="max-w-[1600px] mx-auto px-4 pb-8">
      {/* Side-by-side layout: Pricing Table (left) + Cost Calculator (right) */}
      <div className="flex flex-col xl:flex-row gap-6">

        {/* Left: Pricing Data Table */}
        <div className="xl:w-[60%] xl:min-w-0">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Latest Pricing Data
          </h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <PricingTable
              data={data}
              exchangeRate={exchangeRate}
              currency={currency}
              onCurrencyChange={setCurrency}
            />
          </div>
        </div>

        {/* Right: Cost Calculator (sticky on scroll) */}
        <div className="xl:w-[40%] xl:min-w-0">
          <div className="xl:sticky xl:top-4">
            <h2 className="text-xl font-semibold mb-1 text-gray-900">
              What Does It Actually Cost?
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Per-token pricing is abstract. These scenarios show what real usage actually costs
              &mdash; like 10 long prompts, a document summary, or a full coding-agent session.
            </p>
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <CostCalculator
                data={data}
                currency={currency}
                exchangeRate={exchangeRate}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
