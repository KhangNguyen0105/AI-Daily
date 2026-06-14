import { db } from '@/src/db/index';
import { extractions, sources, promotions } from '@/src/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateSlug, resolveSlug } from '@/app/lib/slug';
import { ModelDetailClient } from '@/app/components/ModelDetailClient';
import { notFound } from 'next/navigation';
import { getLatestExchangeRate, FALLBACK_RATE } from '@/src/pipeline/exchange-rate-worker';

/**
 * ISR: Revalidate every 60 seconds.
 * Per D-01: generateStaticParams for known models with ISR revalidation.
 */
export const revalidate = 60;

/**
 * Generate static params for all known models.
 * Next.js pre-renders these at build time.
 * Wrapped in try/catch — DB may not be available during build.
 */
export async function generateStaticParams() {
  try {
    const rows = await db
      .select({
        modelName: extractions.modelName,
        sourceId: extractions.sourceId,
      })
      .from(extractions)
      .groupBy(extractions.modelName, extractions.sourceId);

    return rows.map((row) => ({
      slug: generateSlug(row.modelName, row.sourceId),
    }));
  } catch {
    // DB not available during build — return empty; ISR will catch up at runtime
    return [];
  }
}

/**
 * Model detail page — server component.
 * Per D-01: Dynamic route at /model/[slug] with generateStaticParams + ISR.
 * Per D-05/D-06: Fetches price history from extractions table.
 * Per D-09: Fetches promotions matching this model's source.
 *
 * Fetches latest pricing, price history, promotions, and exchange rate,
 * then passes everything to the ModelDetailClient component.
 */
export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Resolve slug to model name + source ID
  const resolved = await resolveSlug(slug);
  if (!resolved) {
    notFound();
  }

  const { modelName, sourceId } = resolved;

  // Fetch latest extraction (JOIN with sources for provider name/URL)
  const [latest] = await db
    .select({
      id: extractions.id,
      modelName: extractions.modelName,
      inputPricePer1m: extractions.inputPricePer1m,
      outputPricePer1m: extractions.outputPricePer1m,
      contextWindow: extractions.contextWindow,
      confidence: extractions.confidence,
      collectedAt: extractions.collectedAt,
      sourceId: extractions.sourceId,
      sourceName: sources.name,
      sourceUrl: sources.url,
    })
    .from(extractions)
    .leftJoin(sources, eq(extractions.sourceId, sources.id))
    .where(
      and(
        eq(extractions.modelName, modelName),
        eq(extractions.sourceId, sourceId),
      ),
    )
    .orderBy(desc(extractions.collectedAt))
    .limit(1);

  if (!latest) {
    notFound();
  }

  // Fetch price history (all extractions for this model + source, D-05, D-06, D-08)
  const history = await db
    .select({
      collectedAt: extractions.collectedAt,
      inputPricePer1m: extractions.inputPricePer1m,
      outputPricePer1m: extractions.outputPricePer1m,
    })
    .from(extractions)
    .where(
      and(
        eq(extractions.modelName, modelName),
        eq(extractions.sourceId, sourceId),
      ),
    )
    .orderBy(extractions.collectedAt);

  // Fetch promotions (table may not exist yet — graceful fallback, D-09)
  let activePromotions: Array<{
    id: number;
    modelPattern: string;
    type: 'free_tier' | 'promotion' | 'beta';
    description: string;
    credits: string | null;
    startDate: Date | null;
    endDate: Date | null;
    sourceUrl: string | null;
  }> = [];
  try {
    const promoRows = await db
      .select()
      .from(promotions)
      .where(eq(promotions.sourceId, sourceId));

    activePromotions = promoRows.map((row) => ({
      id: row.id,
      modelPattern: row.modelPattern,
      type: row.type,
      description: row.description,
      credits: row.credits,
      startDate: row.startDate ? new Date(row.startDate) : null,
      endDate: row.endDate ? new Date(row.endDate) : null,
      sourceUrl: row.sourceUrl,
    }));
  } catch {
    // promotions table may not exist yet — show empty state
  }

  // Fetch exchange rate (same pattern as app/page.tsx)
  let exchangeRate = FALLBACK_RATE;
  try {
    exchangeRate = await getLatestExchangeRate();
  } catch {
    // Exchange rate table may not exist yet — use fallback
  }

  // Convert dates for client component
  const modelData = {
    ...latest,
    collectedAt: new Date(latest.collectedAt),
  };

  const historyData = history.map((point) => ({
    ...point,
    collectedAt: new Date(point.collectedAt),
  }));

  return (
    <ModelDetailClient
      model={modelData}
      history={historyData}
      promotions={activePromotions}
      exchangeRate={exchangeRate}
    />
  );
}
