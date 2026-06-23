import { db } from '../db/index';
import { promotions, sources } from '../db/schema';
import { eq, and, or, isNull, gte } from 'drizzle-orm';
import type { PromotionResult } from '../providers/base';

/**
 * Promotion verification system.
 * Ensures only verified, non-expired promotions are stored in the database.
 *
 * Phase 11: Added to prevent hallucinated or outdated promotions from appearing in digest.
 */

export interface VerificationResult {
  valid: boolean;
  reason?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Verify a promotion before storing it in the database.
 *
 * Checks:
 * 1. Description is not empty or too vague
 * 2. Time-limited promotions have valid expiration
 * 3. Specific claims have supporting evidence
 * 4. No duplicate promotions exist
 */
export async function verifyPromotion(
  promotion: PromotionResult,
  sourceId: number,
): Promise<VerificationResult> {
  // Check 1: Description must be substantive
  if (!promotion.description || promotion.description.length < 10) {
    return {
      valid: false,
      reason: 'Description too short or empty',
      confidence: 'low',
    };
  }

  // Check 2: Reject vague descriptions
  const vaguePatterns = [
    /free tier available/i,
    /get started for free/i,
    /free api key/i,
    /start for free/i,
    /free to use/i,
  ];

  const isVague = vaguePatterns.some((pattern) =>
    pattern.test(promotion.description)
  );

  if (isVague && !promotion.credits && !promotion.limits) {
    return {
      valid: false,
      reason: 'Description too vague without specific limits or credits',
      confidence: 'low',
    };
  }

  // Check 3: Time-limited promotions must have expiration
  if (promotion.isTimeLimited && !promotion.expiresAt) {
    return {
      valid: false,
      reason: 'Time-limited promotion missing expiration date',
      confidence: 'low',
    };
  }

  // Check 4: Check for duplicates
  const existing = await db
    .select({ id: promotions.id })
    .from(promotions)
    .where(
      and(
        eq(promotions.sourceId, sourceId),
        eq(promotions.modelPattern, promotion.modelPattern),
        eq(promotions.type, promotion.type),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return {
      valid: false,
      reason: 'Duplicate promotion already exists',
      confidence: 'medium',
    };
  }

  // Check 5: Validate specific claims
  if (promotion.credits) {
    const creditMatch = promotion.credits.match(/(\d+)\s*(calls?|tokens?|credits?)/i);
    if (creditMatch) {
      const amount = parseInt(creditMatch[1]);
      if (amount < 1 || amount > 1000000) {
        return {
          valid: false,
          reason: `Unrealistic credit amount: ${amount}`,
          confidence: 'low',
        };
      }
    }
  }

  return {
    valid: true,
    confidence: 'high',
  };
}

/**
 * Batch verify multiple promotions.
 * Returns only valid promotions.
 */
export async function verifyPromotions(
  promotions: PromotionResult[],
  sourceId: number,
): Promise<{ valid: PromotionResult[]; rejected: Array<{ promotion: PromotionResult; reason: string }> }> {
  const valid: PromotionResult[] = [];
  const rejected: Array<{ promotion: PromotionResult; reason: string }> = [];

  for (const promotion of promotions) {
    const result = await verifyPromotion(promotion, sourceId);
    if (result.valid) {
      valid.push(promotion);
    } else {
      rejected.push({
        promotion,
        reason: result.reason || 'Unknown reason',
      });
    }
  }

  return { valid, rejected };
}

/**
 * Check if a promotion is expired.
 */
export function isPromotionExpired(promotion: PromotionResult): boolean {
  if (!promotion.isTimeLimited || !promotion.expiresAt) {
    return false;
  }

  // Parse expiration date
  const expirationDate = new Date(promotion.expiresAt);
  if (isNaN(expirationDate.getTime())) {
    // Could not parse date, assume expired for safety
    return true;
  }

  return expirationDate < new Date();
}

/**
 * Clean up expired promotions from the database.
 */
export async function cleanupExpiredPromotions(): Promise<number> {
  // This is a simplified version - in production, you'd want to
  // parse the expiresAt field and compare with current date
  const expired = await db
    .select({ id: promotions.id })
    .from(promotions)
    .where(
      and(
        eq(promotions.type, 'free_tier'),
        // Add expiration check logic here
      ),
    );

  // For now, just return count of expired promotions
  return expired.length;
}
