import { type InferSelectModel } from 'drizzle-orm';
import { db } from '@/src/db/index';
import { extractions } from '@/src/db/schema';
import { desc } from 'drizzle-orm';

type ExtractionRow = InferSelectModel<typeof extractions>;

/**
 * ISR: Revalidate every 60 seconds.
 * Per FRNT-02: SSG with periodic refresh.
 * Per D-15: Display extracted data on minimal page.
 */
export const revalidate = 60;

/**
 * Sanitize display name to prevent Unicode manipulation attacks (WR-01).
 * Strips bidirectional override characters and enforces length limit.
 */
function sanitizeDisplayName(name: string, maxLength = 100): string {
  // Strip bidirectional override characters (U+202A-U+202E, U+2066-U+2069)
  const cleaned = name.replace(/[‪-‮⁦-⁩]/g, '');
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) + '...' : cleaned;
}

/**
 * Confidence badge color mapping.
 */
function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case 'verified':
      return 'bg-green-100 text-green-800';
    case 'likely':
      return 'bg-yellow-100 text-yellow-800';
    case 'low_confidence':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Format price for display.
 */
function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return 'N/A';
  return `$${price.toFixed(2)}`;
}

/**
 * Format context window for display.
 */
function formatContextWindow(tokens: number | null): string {
  if (tokens === null || tokens === undefined) return 'N/A';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(0)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return tokens.toString();
}

/**
 * Public landing page displaying AI model pricing data.
 * Per D-15: End-to-end means display on minimal page.
 * Per FRNT-01: Read-only public site, no auth prompts.
 */
export default async function HomePage() {
  // Query latest extractions from PostgreSQL
  // This runs at revalidation time (ISR), not on every request
  // Wrapped in try-catch to handle build-time when DB is unavailable
  let pricingData: ExtractionRow[] = [];
  try {
    pricingData = await db
      .select()
      .from(extractions)
      .orderBy(desc(extractions.createdAt))
      .limit(50);
  } catch {
    // DB not available during build — show empty state
    pricingData = [];
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* AI Daily Branding */}
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <h1 className="text-5xl font-bold tracking-tight">AI Daily</h1>
        <p className="mt-4 text-xl text-gray-600">
          AI Model Pricing Intelligence
        </p>
        <p className="mt-2 text-gray-500 max-w-md text-center">
          Understand what AI models actually cost in real-world usage — not
          per-token abstractions, but practical examples like prompts, coding
          tasks, document processing, and agent sessions.
        </p>
      </div>

      {/* Pricing Data Section */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Latest Pricing Data
        </h2>

        {pricingData.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-lg">
              No pricing data collected yet. Pipeline will run shortly.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Model
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    Input ($/1M tokens)
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    Output ($/1M tokens)
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    Context Window
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {pricingData.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {sanitizeDisplayName(String(row.modelName ?? 'Unknown'))}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {formatPrice(row.inputPricePer1m)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {formatPrice(row.outputPricePer1m)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {formatContextWindow(row.contextWindow)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(
                          row.confidence
                        )}`}
                      >
                        {row.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
