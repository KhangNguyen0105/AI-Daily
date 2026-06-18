/**
 * Shared promotion display constants.
 * Used by PromotionCard, PromotionsList, and other components
 * that render promotion type badges.
 */

export const PROMOTION_BADGE_STYLES: Record<string, string> = {
  free_tier: 'bg-green-100 text-green-800',
  promotion: 'bg-blue-100 text-blue-800',
  beta: 'bg-purple-100 text-purple-800',
};

export const PROMOTION_TYPE_LABELS: Record<string, string> = {
  free_tier: 'Free Tier',
  promotion: 'Promotion',
  beta: 'Beta',
};
