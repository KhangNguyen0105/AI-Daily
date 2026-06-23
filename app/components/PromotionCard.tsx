/**
 * PromotionCard component - displays a promotion/discount offer.
 * Phase 11: Digest & Free Offers Enhancement
 *
 * Amber card with discount badge, description, and provider link.
 * Links directly to provider pricing page.
 */

interface PromotionCardProps {
  modelPattern: string;
  description: string;
  providerName: string;
  providerUrl: string;
  discount?: string;
}

/**
 * Extract discount percentage from description.
 * Looks for patterns like "20% OFF", "50% off", etc.
 */
function extractDiscount(description: string): string | null {
  const match = description.match(/(\d+)%\s*off/i);
  return match ? match[1] + "% OFF" : null;
}

export function PromotionCard({
  modelPattern,
  description,
  providerName,
  providerUrl,
  discount,
}: PromotionCardProps) {
  const discountBadge = discount || extractDiscount(description);

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 hover:bg-amber-500/15 transition-colors">
      {/* Discount badge */}
      <div className="flex items-center gap-2 mb-3">
        {discountBadge ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
            {discountBadge}
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/50 text-amber-700 dark:text-amber-300">
            PROMO
          </span>
        )}
      </div>

      {/* Model/Pattern name */}
      <h3 className="font-bold text-text-primary text-lg mb-2">
        {modelPattern}
      </h3>

      {/* Description */}
      <p className="text-text-secondary text-sm mb-4 line-clamp-3">
        {description}
      </p>

      {/* Provider link */}
      <a
        href={providerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-blue hover:text-accent-blue-hover transition-colors"
      >
        {providerName}
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    </div>
  );
}
