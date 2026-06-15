/**
 * Shared promotion utility functions for AI Daily.
 * Extracted from PromotionCard.tsx, PromotionsPageClient.tsx, and ComparisonCard.tsx
 * to eliminate duplicated logic (WR-02, IN-04).
 */

/**
 * Badge style classes for promotion type badges.
 * Used by PromotionCard, PromotionsList, and ComparisonCard.
 */
export const PROMO_BADGE_STYLES: Record<string, string> = {
  free_tier: 'bg-green-100 text-green-800',
  promotion: 'bg-blue-100 text-blue-800',
  beta: 'bg-purple-100 text-purple-800',
};

/**
 * Human-readable labels for promotion types.
 */
export const PROMO_BADGE_LABELS: Record<string, string> = {
  free_tier: 'Free tier',
  promotion: 'Promotion',
  beta: 'Beta',
};

/**
 * Check if a promotion is currently active (not expired).
 * Uses Date.now() for timezone-consistent comparison.
 *
 * @param endDate - The promotion end date, or null if no end date (always active)
 */
export function isPromoActive(endDate: Date | null): boolean {
  if (endDate === null) return true;
  return new Date(endDate).getTime() > Date.now();
}
