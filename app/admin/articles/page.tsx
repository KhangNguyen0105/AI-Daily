import { db } from '@/src/db/index';
import { articles } from '@/src/db/schema';
import { desc } from 'drizzle-orm';
import { format } from 'date-fns';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminArticlesPage() {
  let articlesList: Array<{
    id: number;
    date: string;
    title: string;
    publishedAt: Date | null;
  }> = [];

  try {
    articlesList = await db
      .select({
        id: articles.id,
        date: articles.date,
        title: articles.title,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .orderBy(desc(articles.date));
  } catch (error) {
    console.error('Failed to load articles:', error);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          Articles{' '}
          <span className="text-base font-normal text-text-secondary">({articlesList.length})</span>
        </h1>
      </div>

      {articlesList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-text-secondary">No articles yet</p>
          <p className="text-xs text-text-tertiary mt-1">
            Articles will appear here once the daily content engine publishes its first digest.
          </p>
        </div>
      ) : (
        <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary bg-bg-secondary">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Action</th>
              </tr>
            </thead>
            <tbody>
              {articlesList.map((article) => (
                <tr key={article.id} className="border-b border-border-primary hover:bg-bg-secondary">
                  <td className="px-4 py-3 text-text-secondary">
                    {format(new Date(article.date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-text-primary max-w-xs truncate">
                    {article.title.length > 60 ? `${article.title.slice(0, 60)}...` : article.title}
                  </td>
                  <td className="px-4 py-3">
                    {article.publishedAt ? (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                        Published
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-bg-tertiary text-text-secondary rounded">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/articles/${article.id}/edit`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Edit Article
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
