import { db } from '@/src/db/index';
import { articles } from '@/src/db/schema';
import { desc } from 'drizzle-orm';
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
  let hasMore = false;
  let dbError = false;

  try {
    // Fetch one extra row to determine if there are more (avoids separate COUNT query)
    const rows = await db
      .select({
        date: articles.date,
        title: articles.title,
        summary: articles.summary,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .orderBy(desc(articles.date))
      .limit(limit + 1)
      .offset(offset);

    hasMore = rows.length > limit;
    articleList = hasMore ? rows.slice(0, limit) : rows;
  } catch (err) {
    console.error('Database query failed:', err);
    dbError = true;
  }

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-8">
          Daily Digest Archive
        </h1>

        {dbError ? (
          <div className="text-center py-16">
            <p className="text-badge-red-text">
              Unable to load articles. Please try again later.
            </p>
          </div>
        ) : articleList.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-secondary">
              No articles yet. Check back after the first pipeline run.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-0">
              {articleList.map((article) => (
                <article
                  key={article.date}
                  className="border-b border-border-primary py-6"
                >
                  <time className="text-sm text-text-secondary">
                    {(() => {
                      try {
                        return format(new Date(article.date + 'T00:00:00'), 'MMMM d, yyyy');
                      } catch {
                        return article.date;
                      }
                    })()}
                  </time>
                  <Link
                    href={`/digest/${article.date}`}
                    className="text-lg font-bold text-text-primary hover:text-blue-600 mt-1 block"
                  >
                    {article.title}
                  </Link>
                  {article.summary && (
                    <p className="text-sm text-text-secondary mt-1">
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
