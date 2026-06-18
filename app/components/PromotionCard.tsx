'use client';

import { format } from 'date-fns';
import { isSafeUrl } from '@/app/lib/url-utils';
import { PromotionData } from '@/app/components/PromotionsList';
import { PROMOTION_BADGE_STYLES, PROMOTION_TYPE_LABELS } from '@/app/lib/promotion-constants';

/**
 * Individual promotion card component.
 * Per D-07: card grid layout with type badge, expiration, description.
 * Per D-08: show all promos, gray out expired ones.
 */
export function PromotionCard({ promo }: { promo: PromotionData }) {
  // Compute isActive: if endDate is null, active = true; otherwise endDate > now
  // Use Date.now() for timezone consistency per Pitfall 4
  const isActive = promo.endDate === null || new Date(promo.endDate).getTime() > Date.now();

  // Compute days remaining
  const getDaysRemaining = (): string => {
    if (!promo.endDate) return '';

    const now = Date.now();
    const endTime = new Date(promo.endDate).getTime();
    const diffMs = endTime - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `${diffDays} days remaining`;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div
      className={`border rounded-lg p-4 ${
        isActive
          ? 'bg-bg-primary border-border-primary'
          : 'bg-bg-secondary border-border-primary opacity-60'
      }`}
    >
      {/* Top row: type badge + days remaining */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            PROMOTION_BADGE_STYLES[promo.type] ?? 'bg-bg-tertiary text-text-primary'
          }`}
        >
          {PROMOTION_TYPE_LABELS[promo.type] ?? promo.type}
        </span>
        {daysRemaining && (
          <span className="text-xs text-text-secondary">{daysRemaining}</span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-text-primary mb-2">{promo.description}</p>

      {/* Credits */}
      {promo.credits && (
        <p className="text-xs text-text-secondary mb-2">Credits: {promo.credits}</p>
      )}

      {/* Date range */}
      {(promo.startDate || promo.endDate) && (
        <p className="text-xs text-text-secondary mb-3">
          {promo.startDate && format(new Date(promo.startDate), 'MMM d, yyyy')}
          {promo.startDate && promo.endDate && ' - '}
          {promo.endDate
            ? format(new Date(promo.endDate), 'MMM d, yyyy')
            : promo.startDate
              ? ' - Ongoing'
              : ''}
        </p>
      )}

      {/* Source link */}
      {promo.sourceUrl && isSafeUrl(promo.sourceUrl) && (
        <a
          href={promo.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          View details
        </a>
      )}
    </div>
  );
}
