/**
 * Shared promotion display constants.
 * Used by PromotionCard, PromotionsList, and other components
 * that render promotion type badges.
 */

export const PROMOTION_BADGE_STYLES: Record<string, string> = {
  free_tier: 'bg-badge-green-bg text-badge-green-text',
  promotion: 'bg-badge-blue-bg text-badge-blue-text',
  beta: 'bg-badge-purple-bg text-badge-purple-text',
  free_trial: 'bg-badge-green-bg text-badge-green-text',
};

export const PROMOTION_TYPE_LABELS: Record<string, string> = {
  free_tier: 'Free Tier',
  promotion: 'Promotion',
  beta: 'Beta',
  free_trial: 'Free Trial',
};
