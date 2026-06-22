import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { promotions, sources } from '@/src/db/schema';
import { eq, and, gte, lte, or, isNull } from 'drizzle-orm';

/**
 * API endpoint for digest page promotions data.
 * Returns structured free offers and promotions for a given date.
 *
 * Phase 11: Digest & Free Offers Enhancement
 */

interface DigestPromotion {
  id: number;
  modelPattern: string;
  type: 'free_tier' | 'promotion' | 'beta';
  description: string;
  credits: string | null;
  sourceName: string;
  sourceUrl: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    // Default to today if no date provided
    const targetDateStr = date || new Date().toISOString().split('T')[0];

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Convert to Date object for database comparisons
    const targetDate = new Date(targetDateStr + 'T00:00:00');

    // Query promotions with source information
    // Include promotions that are active on the target date:
    // - No start/end date (always active)
    // - Start date <= target date AND (no end date OR end date >= target date)
    const rows = await db
      .select({
        id: promotions.id,
        modelPattern: promotions.modelPattern,
        type: promotions.type,
        description: promotions.description,
        credits: promotions.credits,
        sourceName: sources.name,
        sourceUrl: sources.url,
      })
      .from(promotions)
      .innerJoin(sources, eq(promotions.sourceId, sources.id))
      .where(
        or(
          // No date constraints (always active)
          and(isNull(promotions.startDate), isNull(promotions.endDate)),
          // Start date only (no end date)
          and(
            lte(promotions.startDate, targetDate),
            isNull(promotions.endDate)
          ),
          // Both dates (within range)
          and(
            lte(promotions.startDate, targetDate),
            gte(promotions.endDate, targetDate)
          ),
          // End date only (no start date, still active)
          and(
            isNull(promotions.startDate),
            gte(promotions.endDate, targetDate)
          )
        )
      );

    // Separate into free and promotions
    const freeOffers: DigestPromotion[] = [];
    const promotionOffers: DigestPromotion[] = [];

    for (const row of rows) {
      const item: DigestPromotion = {
        id: row.id,
        modelPattern: row.modelPattern,
        type: row.type as 'free_tier' | 'promotion' | 'beta',
        description: row.description,
        credits: row.credits,
        sourceName: row.sourceName,
        sourceUrl: row.sourceUrl,
      };

      if (row.type === 'free_tier') {
        freeOffers.push(item);
      } else {
        promotionOffers.push(item);
      }
    }

    return NextResponse.json({
      date: targetDateStr,
      freeOffers,
      promotions: promotionOffers,
      total: rows.length,
    });
  } catch (error) {
    console.error('Error fetching digest promotions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promotions data' },
      { status: 500 }
    );
  }
}
