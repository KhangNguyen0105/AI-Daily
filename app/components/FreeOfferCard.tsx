/**
 * FreeOfferCard component — displays a free model offer.
 * Phase 11: Digest & Free Offers Enhancement
 *
 * Green card with "FREE" badge, model name, and provider link.
 * Links directly to provider pricing page.
 */

interface FreeOfferCardProps {
  modelPattern: string;
  description: string;
  providerName: string;
  providerUrl: string;
  credits?: string | null;
}

export function FreeOfferCard({
  modelPattern,
  description,
  providerName,
  providerUrl,
  credits,
}: FreeOfferCardProps) {
  return (
    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 hover:bg-green-500/15 transition-colors">
      {/* FREE badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500 text-white">
          FREE
        </span>
        {credits && (
          <span className="text-xs text-green-600 dark:text-green-400">
            {credits}
          </span>
        )}
      </div>

      {/* Model name */}
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
