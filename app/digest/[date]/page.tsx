import { db } from '@/src/db/index';
import { articles } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { DigestArticle } from '@/app/components/DigestArticle';

/**
 * ISR: Revalidate every 60 seconds.
 * Per D-17: SSG with ISR revalidation for article pages.
 */
export const revalidate = 60;

/**
 * Generate static params for all known article dates.
 * Next.js pre-renders these at build time.
 * Wrapped in try/catch — DB may not be available during build.
 * Per Research Pitfall 5: empty generateStaticParams is expected.
 */
export async function generateStaticParams() {
  try {
    const rows = await db
      .select({ date: articles.date })
      .from(articles)
      .orderBy(desc(articles.date))
      .limit(90);

    return rows.map((row) => ({
      date: row.date,
    }));
  } catch {
    // DB not available during build — return empty; ISR will catch up at runtime
    return [];
  }
}

/**
 * Article detail page — server component.
 * Per D-08: Date-based slug: /digest/2026-06-14. One article per day.
 * Per D-17: SSG with ISR via generateStaticParams.
 * Per T-06-04: Date validated with regex before DB query.
 */
export default async function DigestArticlePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  // Validate date format — T-06-04: prevent injection via URL params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

  try {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.date, date))
      .limit(1);

    if (!article) {
      notFound();
    }

    return <DigestArticle article={article} />;
  } catch {
    notFound();
  }
}
