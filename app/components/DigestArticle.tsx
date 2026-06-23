'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import Link from 'next/link';
import { FreeOffersSection } from './FreeOffersSection';
import { PromotionsSection } from './PromotionsSection';

/**
 * Article rendering component with react-markdown.
 * Per D-07: Content stored as Markdown, rendered to HTML.
 * Per D-19: Shows "Published: {formatted date}" timestamp.
 * Per T-06-05: react-markdown sanitizes output by default — no XSS risk.
 *
 * Phase 11: Uses structured card components for free offers and promotions.
 * Queries promotions database table via /api/digest-promotions endpoint.
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
    ? article.publishedAt
    : new Date(article.date + 'T00:00:00');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/digest"
        className="text-accent-blue hover:text-accent-blue-hover text-sm mb-4 inline-flex items-center gap-1"
      >
        &larr; Back to digest
      </Link>

      <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>

      <p className="text-sm text-text-tertiary mt-2">
        Published: {(() => {
          try {
            return format(publishedDate, 'MMMM d, yyyy');
          } catch {
            return article.date;
          }
        })()}
      </p>

      {/* Free & Promotions Sections — Phase 11: Card-based layout */}
      <div className="mt-8">
        <FreeOffersSection date={article.date} />
        <PromotionsSection date={article.date} />
      </div>

      {/* Article content */}
      <div className="mt-8">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold mt-8 mb-4">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold mt-8 mb-4">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-bold mt-6 mb-3">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="text-text-secondary leading-relaxed mb-4">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-6 mb-4 text-text-secondary space-y-1">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-6 mb-4 text-text-secondary space-y-1">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-text-secondary">{children}</li>
            ),
            strong: ({ children }) => (
              <strong className="font-bold text-text-primary">{children}</strong>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-accent-blue hover:text-accent-blue-hover underline"
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-border-primary pl-4 italic text-text-secondary my-4">
                {children}
              </blockquote>
            ),
            code: ({ children }) => (
              <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-sm font-mono">
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="bg-bg-tertiary p-4 rounded-lg overflow-x-auto my-4">
                {children}
              </pre>
            ),
            table: ({ children }) => (
              <table className="min-w-full border-collapse border border-border-primary my-4">
                {children}
              </table>
            ),
            th: ({ children }) => (
              <th className="border border-border-primary px-4 py-2 bg-bg-secondary text-left font-bold">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-border-primary px-4 py-2">{children}</td>
            ),
            hr: () => <hr className="border-border-primary my-8" />,
          }}
        >
          {article.content}
        </ReactMarkdown>
      </div>

      {/* Footer links */}
      <div className="mt-12 pt-6 border-t border-border-primary">
        <div className="flex flex-wrap gap-4">
          <Link
            href="/subscriptions"
            className="text-sm text-accent-blue hover:text-accent-blue-hover"
          >
            View all subscriptions →
          </Link>
          <Link
            href="/"
            className="text-sm text-accent-blue hover:text-accent-blue-hover"
          >
            Compare pricing →
          </Link>
        </div>
      </div>
    </div>
  );
}
