import { db } from '@/src/db/index';
import { articles } from '@/src/db/schema';
import { desc, sql } from 'drizzle-orm';
import { format } from 'date-fns';
import Link from 'next/link';

/**
 * ISR: Revalidate every 60 seconds.
 * Per D-17: SSG with ISR for the archive page.
 */
export const revalidate = 60;

/**
 * Daily Digest Archive page — server component.
 * Per D-13: /digest route for the archive list.
 * Per D-14: Reverse-chronological with date, headline, and 1-line summary.
 * Per D-15: Load more pagination — 30 articles per page.
 */
export default async function DigestArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>;
}) {
  const params = await searchParams;
  const offset = Math.max(0, parseInt(params.offset ?? '0', 10) || 0);
  const limit = 30;

  let articleList: Array<{
    date: string;
    title: string;
    summary: string | null;
    publishedAt: Date | null;
  }> = [];
  let totalCount = 0;

  try {
    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles);
    totalCount = Number(countResult?.count ?? 0);

    // Fetch articles reverse-chronologically with offset/limit
    articleList = await db
      .select({
        date: articles.date,
        title: articles.title,
        summary: articles.summary,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .orderBy(desc(articles.date))
      .limit(limit)
      .offset(offset);
  } catch {
    // DB not available during build — show empty state
    articleList = [];
  }

  const hasMore = offset + limit < totalCount;

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-8">
          Daily Digest Archive
        </h1>

        {articleList.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">
              No articles yet. Check back after the first pipeline run.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-0">
              {articleList.map((article) => (
                <article
                  key={article.date}
                  className="border-b border-gray-200 py-6"
                >
                  <time className="text-sm text-gray-500">
                    {(() => {
                      try {
                        return format(
                          new Date(article.publishedAt || article.date + 'T00:00:00'),
                          'MMMM d, yyyy'
                        );
                      } catch {
                        return article.date;
                      }
                    })()}
                  </time>
                  <Link
                    href={`/digest/${article.date}`}
                    className="text-lg font-bold text-gray-900 hover:text-blue-600 mt-1 block"
                  >
                    {article.title}
                  </Link>
                  {article.summary && (
                    <p className="text-sm text-gray-600 mt-1">
                      {article.summary}
                    </p>
                  )}
                </article>
              ))}
            </div>

            {hasMore && (
              <Link
                href={`/digest?offset=${offset + limit}`}
                className="text-blue-600 hover:text-blue-800 text-sm mt-8 inline-block"
              >
                Load more
              </Link>
            )}
          </>
        )}
      </div>
    </main>
  );
}
