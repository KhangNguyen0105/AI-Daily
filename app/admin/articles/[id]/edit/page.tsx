import { db } from '@/src/db/index';
import { articles, articleVersions, extractions, sources } from '@/src/db/schema';
import { eq, and, gte, lt, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { EditArticleClient } from './EditArticleClient';

export const dynamic = 'force-dynamic';

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const articleId = parseInt(id, 10);
  if (isNaN(articleId)) notFound();

  let article;
  try {
    const result = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);
    article = result[0];
  } catch {
    notFound();
  }

  if (!article) notFound();

  // Fetch versions
  let versions: Array<{
    id: number;
    version: number;
    title: string;
    createdAt: Date;
  }> = [];
  try {
    versions = await db
      .select()
      .from(articleVersions)
      .where(eq(articleVersions.articleId, articleId))
      .orderBy(desc(articleVersions.version));
  } catch {
    // Database may not be available
  }

  // Fetch extractions for this article's date
  let extractionsList: Array<{
    id: number;
    modelName: string;
    inputPricePer1m: number | null;
    outputPricePer1m: number | null;
    confidence: string;
    sourceName: string | null;
    sourceUrl: string | null;
    collectedAt: Date;
  }> = [];
  try {
    const startOfDay = new Date(`${article.date}T00:00:00.000Z`);
    const endOfDay = new Date(`${article.date}T23:59:59.999Z`);

    extractionsList = await db
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
  } catch {
    // Database may not be available
  }

  // Serialize dates for client component
  const serializedArticle = {
    ...article,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };

  const serializedVersions = versions.map((v) => ({
    ...v,
    createdAt: v.createdAt.toISOString(),
  }));

  const serializedExtractions = extractionsList.map((e) => ({
    ...e,
    collectedAt: e.collectedAt.toISOString(),
  }));

  return (
    <EditArticleClient
      article={serializedArticle}
      initialVersions={serializedVersions}
      initialExtractions={serializedExtractions}
    />
  );
}
