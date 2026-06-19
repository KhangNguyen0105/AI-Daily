import { db } from '@/src/db/index';
import { extractions, sources } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';

import type { PricingRow } from '@/app/lib/types';
import { HomePageClient } from '@/app/components/HomePageClient';
// IN-01: Import from standalone utility instead of pipeline module
import { getLatestExchangeRate, FALLBACK_RATE } from '@/src/lib/exchange-rate';

/**
 * ISR: Revalidate every 60 seconds.
 * Per FRNT-02: SSG with periodic refresh.
 * Per D-15: Display extracted data on minimal page.
 */
export const revalidate = 60;

/**
 * Public landing page displaying AI model pricing data.
 * Per D-15: End-to-end means display on minimal page.
 * Per FRNT-01: Read-only public site, no auth prompts.
 * Per PRIC-01: Interactive comparison table with sortable columns.
 */
export default async function HomePage() {
  // JOIN extractions with sources to get provider names
  // Per D-01: Server component fetches data, passes to client component
  let pricingData: PricingRow[] = [];
  let lastUpdated: Date | null = null;
  let exchangeRate: number = FALLBACK_RATE;

  try {
    const rows = await db
      .select({
        id: extractions.id,
        sourceId: extractions.sourceId,
        modelName: extractions.modelName,
        inputPricePer1m: extractions.inputPricePer1m,
        outputPricePer1m: extractions.outputPricePer1m,
        contextWindow: extractions.contextWindow,
        confidence: extractions.confidence,
        collectedAt: extractions.collectedAt,
        sourceName: sources.name,
        sourceUrl: sources.url,
      })
      .from(extractions)
      .leftJoin(sources, eq(extractions.sourceId, sources.id))
      .orderBy(desc(extractions.collectedAt));

    pricingData = rows.map((row) => ({
      ...row,
      collectedAt: new Date(row.collectedAt),
    }));

    // Compute lastUpdated as the most recent collectedAt
    if (pricingData.length > 0) {
      lastUpdated = pricingData[0].collectedAt;
    }
  } catch (err) {
    // DB not available during build or runtime error — show empty state
    console.warn('[HomePage] Failed to fetch pricing data:', err);
    pricingData = [];
  }

  // Fetch exchange rate separately — failure shouldn't hide pricing data
  try {
    exchangeRate = await getLatestExchangeRate();
  } catch (err) {
    // Exchange rate table may not exist yet — use fallback
    console.warn('[HomePage] Failed to fetch exchange rate:', err);
    exchangeRate = FALLBACK_RATE;
  }

  return (
    <main className="h-[calc(100vh-56px)] flex flex-col bg-white text-gray-900">
      {/* AI Daily Branding */}
      <div className="shrink-0 flex flex-col items-center justify-center py-4 px-4">
        <h1 className="text-2xl font-semibold tracking-tight">AI Daily</h1>
        <p className="mt-1 text-sm text-gray-500">
          Last updated: {lastUpdated ? lastUpdated.toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : 'Unknown'}
        </p>
      </div>

      {/* Side-by-side: Pricing Table + Cost Calculator */}
      <div className="flex-1 min-h-0">
        <HomePageClient data={pricingData} exchangeRate={exchangeRate} />
      </div>
    </main>
  );
}
