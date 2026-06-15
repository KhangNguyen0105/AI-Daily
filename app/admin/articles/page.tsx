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
  } catch {
    // Database may not be available during build
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Articles{' '}
          <span className="text-base font-normal text-gray-500">({articlesList.length})</span>
        </h1>
      </div>

      {articlesList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No articles yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Articles will appear here once the daily content engine publishes its first digest.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {articlesList.map((article) => (
                <tr key={article.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">
                    {format(new Date(article.date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-gray-900 max-w-xs truncate">
                    {article.title.length > 60 ? `${article.title.slice(0, 60)}...` : article.title}
                  </td>
                  <td className="px-4 py-3">
                    {article.publishedAt ? (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                        Published
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
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
