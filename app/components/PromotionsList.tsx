'use client';

import { format } from 'date-fns';
import { isSafeUrl } from '@/app/lib/url-utils';
import { PROMOTION_BADGE_STYLES } from '@/app/lib/promotion-constants';

export interface PromotionData {
  id: number;
  modelPattern: string;
  type: 'free_tier' | 'promotion' | 'beta' | 'free_trial';
  description: string;
  credits: string | null;
  startDate: Date | null;
  endDate: Date | null;
  sourceUrl: string | null;
}

function isActive(promotion: PromotionData): boolean {
  if (promotion.endDate === null) return true;
  return new Date(promotion.endDate) > new Date();
}

function formatDateRange(start: Date | null, end: Date | null): string | null {
  if (!start && !end) return null;
  const startStr = start ? format(new Date(start), 'MMM d, yyyy') : null;
  const endStr = end ? format(new Date(end), 'MMM d, yyyy') : 'Ongoing';
  if (startStr && endStr) return `${startStr} - ${endStr}`;
  if (startStr) return `From ${startStr}`;
  return `Until ${endStr}`;
}

export function PromotionsList({
  promotions,
}: {
  promotions: PromotionData[];
}) {
  if (promotions.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        No active promotions or free tier offers.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {promotions.map((promo) => {
        const active = isActive(promo);
        const dateRange = formatDateRange(promo.startDate, promo.endDate);

        return (
          <div
            key={promo.id}
            className={`border-l-4 p-4 rounded-r-lg ${
              active
                ? 'border-green-500 bg-badge-green-bg'
                : 'border-border-secondary bg-bg-secondary opacity-75'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  PROMOTION_BADGE_STYLES[promo.type] ?? 'bg-bg-tertiary text-gray-800'
                }`}
              >
                {promo.type}
              </span>
              {!active && (
                <span className="text-xs text-text-secondary font-medium">
                  Expired
                </span>
              )}
            </div>
            <p className="text-sm text-text-primary mb-1">{promo.description}</p>
            {promo.credits && (
              <p className="text-sm text-text-secondary mb-1">
                Credits: {promo.credits}
              </p>
            )}
            {dateRange && (
              <p className="text-xs text-text-secondary mb-2">{dateRange}</p>
            )}
            {promo.sourceUrl && isSafeUrl(promo.sourceUrl) && (
              <a
                href={promo.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent-blue hover:text-accent-blue underline"
              >
                View details
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
