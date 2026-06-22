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
 * Extract free/promotion counts from article content for badge display.
 */
function extractBadges(content: string): { freeCount: number; promoCount: number } {
  const lines = content.split('\n');
  let freeCount = 0;
  let promoCount = 0;

  for (const line of lines) {
    const lower = line.toLowerCase();
    const isFree = (
      lower.match(/\$\s*0[\s/]/) ||
      lower.match(/\bis free\b/) ||
      lower.match(/\bfree tier\b/) ||
      lower.match(/\bfree only\b/) ||
      lower.match(/\bfree\s+(on|now|available|event)\b/) ||
      (lower.includes('free') && lower.includes('model'))
    );
    const isPromo = (
      lower.match(/\d+%\s*off/) ||
      lower.match(/\boff\b.*\blimited\b/) ||
      lower.match(/\bpromotion/) ||
      lower.match(/\bdiscount/) ||
      lower.match(/\blimited\s+time\b/)
    );

    if (isFree) freeCount++;
    if (isPromo) promoCount++;
  }

  return { freeCount, promoCount };
}

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
    content: string;
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
        content: articles.content,
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
            <p className="text-accent-red">
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
              {articleList.map((article) => {
                const { freeCount, promoCount } = extractBadges(article.content);
                return (
                  <article
                    key={article.date}
                    className="border-b border-border-primary py-6"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <time className="text-sm text-text-secondary">
                        {(() => {
                          try {
                            return format(new Date(article.date + 'T00:00:00'), 'MMMM d, yyyy');
                          } catch {
                            return article.date;
                          }
                        })()}
                      </time>
                      {freeCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30">
                          🎉 {freeCount} Free
                        </span>
                      )}
                      {promoCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          💰 {promoCount} Promos
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/digest/${article.date}`}
                      className="text-lg font-bold text-text-primary hover:text-accent-blue mt-1 block"
                    >
                      {article.title}
                    </Link>
                    {article.summary && (
                      <p className="text-sm text-text-secondary mt-1">
                        {article.summary}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>

            {hasMore && (
              <Link
                href={`/digest?offset=${offset + limit}`}
                className="text-accent-blue hover:text-accent-blue text-sm mt-8 inline-block"
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
