'use client';

import { isSafeUrl } from '@/app/lib/url-utils';

export interface PromotionCardData {
  id: number;
  modelPattern: string;
  type: 'free_tier' | 'promotion' | 'beta';
  description: string;
  credits: string | null;
  startDate: Date | null;
  endDate: Date | null;
  sourceUrl: string | null;
  sourceName: string | null;
}

const typeBadgeStyles: Record<string, string> = {
  free_tier: 'bg-green-100 text-green-800',
  promotion: 'bg-blue-100 text-blue-800',
  beta: 'bg-purple-100 text-purple-800',
};

function isActive(promo: PromotionCardData): boolean {
  if (promo.endDate === null) return true;
  // Use Date.now() for timezone-consistent comparison (Pitfall 4)
  return new Date(promo.endDate).getTime() > Date.now();
}

function getDaysRemaining(endDate: Date | null): string | null {
  if (!endDate) return null;
  // Use Date.now() for timezone-consistent comparison (Pitfall 4)
  const days = Math.ceil(
    (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (days < 0) return 'Expired';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `${days} days remaining`;
}

export function PromotionCard({ promo }: { promo: PromotionCardData }) {
  const active = isActive(promo);
  const daysLeft = getDaysRemaining(promo.endDate);

  return (
    <div
      className={`border rounded-lg p-4 ${
        active
          ? 'bg-white border-gray-200'
          : 'bg-gray-50 border-gray-200 opacity-60'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            typeBadgeStyles[promo.type] ?? 'bg-gray-100 text-gray-800'
          }`}
        >
          {promo.type}
        </span>
        {daysLeft && (
          <span
            className={`text-xs ${
              daysLeft === 'Expired' ? 'text-red-500 font-medium' : 'text-gray-500'
            }`}
          >
            {daysLeft}
          </span>
        )}
      </div>
      {promo.sourceName && (
        <p className="text-xs text-gray-500 mb-1">{promo.sourceName}</p>
      )}
      <p className="text-sm text-gray-900">{promo.description}</p>
      {promo.credits && (
        <p className="text-xs text-gray-600 mt-1">Credits: {promo.credits}</p>
      )}
      {promo.sourceUrl && isSafeUrl(promo.sourceUrl) && (
        <a
          href={promo.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
        >
          View details
        </a>
      )}
    </div>
  );
}
