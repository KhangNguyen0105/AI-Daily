import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';
import { db } from '@/src/db/index';
import { articles, articleVersions } from '@/src/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

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

    const versions = await db
      .select()
      .from(articleVersions)
      .where(eq(articleVersions.articleId, articleId))
      .orderBy(desc(articleVersions.version));

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const rollbackSchema = z.object({
  versionId: z.number(),
});

export async function POST(
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
    const parsed = rollbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { versionId } = parsed.data;

    // Fetch the target version
    const targetVersion = await db
      .select()
      .from(articleVersions)
      .where(eq(articleVersions.id, versionId))
      .limit(1);

    if (targetVersion.length === 0) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const version = targetVersion[0];

    // Fetch current article to save as new version
    const currentArticle = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (currentArticle.length === 0) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Get next version number
    const maxVersionResult = await db
      .select({ maxVersion: sql<number>`coalesce(max(${articleVersions.version}), 0)` })
      .from(articleVersions)
      .where(eq(articleVersions.articleId, articleId));

    const nextVersion = (maxVersionResult[0]?.maxVersion ?? 0) + 1;

    // Save current content as a new version (audit trail)
    await db.insert(articleVersions).values({
      articleId,
      title: currentArticle[0].title,
      summary: currentArticle[0].summary,
      content: currentArticle[0].content,
      version: nextVersion,
    });

    // Restore article to the target version
    await db
      .update(articles)
      .set({
        title: version.title,
        summary: version.summary,
        content: version.content,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, articleId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rolling back article:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
