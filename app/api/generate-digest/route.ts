import { NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { articles } from '@/src/db/schema';
import { computeDiff } from '@/src/pipeline/article-diff';
import { generateArticle } from '@/src/pipeline/article-generator';

/**
 * Normalize a Date to UTC midnight (start of day).
 */
function toUTCMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Format a Date as 'YYYY-MM-DD' string in UTC.
 */
function formatDateUTC(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * POST /api/generate-digest
 *
 * Manually trigger daily digest generation for testing.
 * This endpoint:
 * 1. Computes diff between today and yesterday extractions
 * 2. Generates article via AI with provider fallback
 * 3. Upserts into articles table
 *
 * Query params:
 * - date: YYYY-MM-DD (optional, defaults to today)
 *
 * Example:
 *   curl -X POST http://localhost:3000/api/generate-digest
 *   curl -X POST http://localhost:3000/api/generate-digest?date=2026-06-14
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // Determine target date
    let targetDate: Date;
    if (dateParam) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }
      targetDate = new Date(dateParam + 'T00:00:00Z');
    } else {
      targetDate = toUTCMidnight(new Date());
    }

    const yesterday = new Date(targetDate);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const targetDateStr = formatDateUTC(targetDate);

    console.log(`[generate-digest] Generating for ${targetDateStr}...`);

    // Step 1: Compute diff
    const diff = await computeDiff(targetDate, yesterday);
    console.log(`[generate-digest] Diff computed:`, {
      newModels: diff.newModels.length,
      priceChanges: diff.priceChanges.length,
      newPromotions: diff.newPromotions.length,
      totalModels: diff.totalModelsToday,
    });

    // Step 2: Generate article via AI
    const generated = await generateArticle(diff);
    console.log(`[generate-digest] Article generated:`, {
      title: generated.title,
      summaryLength: generated.summary.length,
      contentLength: generated.content.length,
    });

    // Step 3: Upsert into articles table
    const inserted = await db
      .insert(articles)
      .values({
        date: targetDateStr,
        title: generated.title,
        summary: generated.summary,
        content: generated.content,
        publishedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: articles.date,
        set: {
          title: generated.title,
          summary: generated.summary,
          content: generated.content,
          publishedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning({ id: articles.id });

    const articleId = inserted[0].id;

    console.log(`[generate-digest] Article ${articleId} upserted for ${targetDateStr}`);

    return NextResponse.json({
      success: true,
      article: {
        id: articleId,
        date: targetDateStr,
        title: generated.title,
        summary: generated.summary,
        url: `/digest/${targetDateStr}`,
      },
      diff: {
        newModels: diff.newModels.length,
        priceChanges: diff.priceChanges.length,
        newPromotions: diff.newPromotions.length,
        totalModels: diff.totalModelsToday,
      },
    });
  } catch (error) {
    console.error('[generate-digest] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate digest',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
