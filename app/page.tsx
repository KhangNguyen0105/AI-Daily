import { db } from '@/src/db/index';
import { extractions, sources } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { PricingTable, type PricingRow } from '@/app/components/PricingTable';

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

  try {
    const rows = await db
      .select({
        id: extractions.id,
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
    })) as PricingRow[];

    // Compute lastUpdated as the most recent collectedAt
    if (pricingData.length > 0) {
      lastUpdated = pricingData[0].collectedAt;
    }
  } catch {
    // DB not available during build — show empty state
    pricingData = [];
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* AI Daily Branding */}
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <h1 className="text-5xl font-bold tracking-tight">AI Daily</h1>
        <p className="mt-4 text-xl text-gray-600">
          AI Model Pricing Intelligence
        </p>
        <p className="mt-2 text-gray-500 max-w-md text-center">
          Understand what AI models actually cost in real-world usage — not
          per-token abstractions, but practical examples like prompts, coding
          tasks, document processing, and agent sessions.
        </p>
      </div>

      {/* Pricing Data Section */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Latest Pricing Data
        </h2>

        <PricingTable data={pricingData} lastUpdated={lastUpdated} />
      </div>
    </main>
  );
}
