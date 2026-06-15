'use client';

import { format } from 'date-fns';
import { isSafeUrl } from '@/app/lib/url-utils';
import { PROMO_BADGE_STYLES, isPromoActive } from '@/app/lib/promotion-utils';
import { sanitizeDisplayName } from '@/app/lib/pricing-utils';

export interface PromotionData {
  id: number;
  modelPattern: string;
  type: 'free_tier' | 'promotion' | 'beta';
  description: string;
  credits: string | null;
  startDate: Date | null;
  endDate: Date | null;
  sourceUrl: string | null;
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
      <div className="text-center py-8 text-gray-500">
        No active promotions or free tier offers.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {promotions.map((promo) => {
        const active = isPromoActive(promo.endDate);
        const dateRange = formatDateRange(promo.startDate, promo.endDate);

        return (
          <div
            key={promo.id}
            className={`border-l-4 p-4 rounded-r-lg ${
              active
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 bg-gray-50 opacity-75'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  PROMO_BADGE_STYLES[promo.type] ?? 'bg-gray-100 text-gray-800'
                }`}
              >
                {promo.type}
              </span>
              {!active && (
                <span className="text-xs text-gray-500 font-medium">
                  Expired
                </span>
              )}
            </div>
            <p className="text-sm text-gray-900 mb-1">{sanitizeDisplayName(promo.description)}</p>
            {promo.credits && (
              <p className="text-sm text-gray-600 mb-1">
                Credits: {promo.credits}
              </p>
            )}
            {dateRange && (
              <p className="text-xs text-gray-500 mb-2">{dateRange}</p>
            )}
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
      })}
    </div>
  );
}
