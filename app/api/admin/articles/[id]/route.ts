import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';
import { db } from '@/src/db/index';
import { articles, articleVersions } from '@/src/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1),
  summary: z.string(),
  content: z.string().min(1),
});

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

    const result = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ article: result[0] });
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
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

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { title, summary, content } = parsed.data;

    // Fetch current article
    const current = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (current.length === 0) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const currentArticle = current[0];

    // Get next version number
    const maxVersionResult = await db
      .select({ maxVersion: sql<number>`coalesce(max(${articleVersions.version}), 0)` })
      .from(articleVersions)
      .where(eq(articleVersions.articleId, articleId));

    const nextVersion = (maxVersionResult[0]?.maxVersion ?? 0) + 1;

    // Save current version before updating
    await db.insert(articleVersions).values({
      articleId,
      title: currentArticle.title,
      summary: currentArticle.summary,
      content: currentArticle.content,
      version: nextVersion,
    });

    // Update article
    const updated = await db
      .update(articles)
      .set({ title, summary, content, updatedAt: new Date() })
      .where(eq(articles.id, articleId))
      .returning();

    return NextResponse.json({ article: updated[0] });
  } catch (error) {
    console.error('Error updating article:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
