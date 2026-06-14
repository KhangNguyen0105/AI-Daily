'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import Link from 'next/link';

/**
 * Article rendering component with react-markdown.
 * Per D-07: Content stored as Markdown, rendered to HTML.
 * Per D-19: Shows "Published: {formatted date}" timestamp.
 * Per T-06-05: react-markdown sanitizes output by default — no XSS risk.
 *
 * Uses react-markdown `components` prop for Tailwind styling
 * (no @tailwindcss/typography plugin dependency).
 */
export function DigestArticle({
  article,
}: {
  article: {
    title: string;
    summary: string | null;
    content: string;
    publishedAt: Date | null;
    date: string;
  };
}) {
  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt)
    : new Date(article.date + 'T00:00:00');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/digest"
        className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-flex items-center gap-1"
      >
        &larr; Back to digest
      </Link>

      <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>

      <p className="text-sm text-gray-500 mt-2">
        Published: {(() => {
          try {
            return format(publishedDate, 'MMMM d, yyyy');
          } catch {
            return article.date;
          }
        })()}
      </p>

      <div className="mt-8">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h2 className="text-2xl font-bold mt-8 mb-4">{children}</h2>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold mt-8 mb-4">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-bold mt-6 mb-3">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-1">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-6 mb-4 text-gray-700 space-y-1">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-gray-700">{children}</li>
            ),
            strong: ({ children }) => (
              <strong className="font-bold text-gray-900">{children}</strong>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-gray-200 pl-4 italic text-gray-600 my-4">
                {children}
              </blockquote>
            ),
            code: ({ children }) => (
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                {children}
              </pre>
            ),
            table: ({ children }) => (
              <table className="min-w-full border-collapse border border-gray-200 my-4">
                {children}
              </table>
            ),
            th: ({ children }) => (
              <th className="border border-gray-200 px-4 py-2 bg-gray-50 text-left font-bold">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-gray-200 px-4 py-2">{children}</td>
            ),
            hr: () => <hr className="border-gray-200 my-8" />,
          }}
        >
          {article.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
