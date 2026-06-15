import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';
import { db } from '@/src/db/index';
import { articles, extractions, sources } from '@/src/db/schema';
import { eq, and, gte, lt, desc } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const articleId = parseInt(id, 10);
    if (isNaN(articleId)) {
      return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
    }

    // Get the article to find its date
    const article = await db
      .select({ date: articles.date })
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (article.length === 0) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const articleDate = article[0].date;
    const startOfDay = new Date(`${articleDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${articleDate}T23:59:59.999Z`);

    // Query extractions collected on that date with source info
    const extractionsList = await db
      .select({
        id: extractions.id,
        modelName: extractions.modelName,
        inputPricePer1m: extractions.inputPricePer1m,
        outputPricePer1m: extractions.outputPricePer1m,
        confidence: extractions.confidence,
        sourceName: sources.name,
        sourceUrl: sources.url,
        collectedAt: extractions.collectedAt,
      })
      .from(extractions)
      .leftJoin(sources, eq(extractions.sourceId, sources.id))
      .where(and(gte(extractions.collectedAt, startOfDay), lt(extractions.collectedAt, endOfDay)))
      .orderBy(desc(extractions.collectedAt));

    return NextResponse.json({ extractions: extractionsList });
  } catch (error) {
    console.error('Error fetching article sources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
