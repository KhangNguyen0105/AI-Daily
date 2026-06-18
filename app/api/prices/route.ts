import { db } from '@/src/db';
import { extractions } from '@/src/db/schema';
import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';

/**
 * API route providing current prices for the AlertBanner.
 * Returns a map of "modelName:sourceId" -> inputPricePer1m for the
 * latest extraction of each model+source combination.
 */
export async function GET() {
  try {
    const rows = await db
      .select({
        modelName: extractions.modelName,
        sourceId: extractions.sourceId,
        inputPricePer1m: extractions.inputPricePer1m,
        collectedAt: extractions.collectedAt,
      })
      .from(extractions)
      .orderBy(desc(extractions.collectedAt));

    // Keep only the latest extraction per model+source
    const latestMap: Record<string, { price: number; collectedAt: Date }> = {};

    for (const row of rows) {
      if (row.inputPricePer1m === null) continue;
      const key = `${row.modelName}:${row.sourceId}`;
      const existing = latestMap[key];
      if (!existing || new Date(row.collectedAt) > new Date(existing.collectedAt)) {
        latestMap[key] = { price: row.inputPricePer1m, collectedAt: row.collectedAt };
      }
    }

    // Convert to simple price map
    const prices: Record<string, number> = {};
    for (const [key, val] of Object.entries(latestMap)) {
      prices[key] = val.price;
    }

    return NextResponse.json(prices);
  } catch (error) {
    console.error('Failed to fetch prices for alerts:', error);
    return NextResponse.json({}, { status: 500 });
  }
}
