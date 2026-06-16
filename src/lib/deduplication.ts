import { db } from '../db';
import { canonicalModels, extractions } from '../db/schema';
import { CanonicalRegistry, ExtractionResult } from './canonical-registry';
import { eq, and } from 'drizzle-orm';

/**
 * Score breakdown for duplicate detection
 */
export interface MatchSignals {
  providerIdMatch?: number; // 0 or 100
  aliasMatch?: number; // 0 or 90
  normalizedNameMatch?: number; // 0 or 75
  familyAndContextMatch?: number; // 0 or 60
  pricingSimilarity?: number; // 0 to 40
}

/**
 * Candidate model for duplicate matching
 */
export interface DuplicateCandidate {
  canonical_id: string;
  canonical_name: string;
  matchScore: number; // 0-100
  signals: MatchSignals;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Result of duplicate detection
 */
export interface DuplicateDetectionScore {
  modelName: string;
  candidates: DuplicateCandidate[];
  recommendation: 'auto_link' | 'review_queue' | 'new_model';
}

/**
 * Review queue item for admin dashboard
 */
export interface ReviewQueueItem {
  extraction_id: number;
  extracted_model_name: string;
  candidates: Array<{
    canonical_id: string;
    canonical_name: string;
    match_score: number;
    match_reason: string;
    recommendation_strength: 'strong' | 'moderate' | 'weak';
  }>;
  status: 'pending';
  created_at: Date;
}

/**
 * Detect potential duplicates for a new extraction using weighted matching algorithm
 */
export async function detectDuplicates(
  extraction: ExtractionResult,
  providerName: string,
  canonicalRegistry: CanonicalRegistry,
): Promise<DuplicateDetectionScore> {
  // Get all canonical models for this provider
  const models = await db.query.canonicalModels.findMany({
    where: eq(canonicalModels.provider, providerName),
  });

  if (models.length === 0) {
    return {
      modelName: extraction.modelName,
      candidates: [],
      recommendation: 'new_model',
    };
  }

  // Calculate match scores for each candidate
  const candidates: DuplicateCandidate[] = [];

  for (const model of models) {
    const result = await calculateMatchScore(extraction, model);
    
    if (result.score > 0) {
      const confidence = getConfidenceLevel(result.score);
      candidates.push({
        canonical_id: model.id,
        canonical_name: model.canonicalName,
        matchScore: result.score,
        signals: result.signals,
        confidence,
      });
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.matchScore - a.matchScore);

  // Determine recommendation based on highest score
  let recommendation: 'auto_link' | 'review_queue' | 'new_model' = 'new_model';
  
  if (candidates.length > 0) {
    const highestScore = candidates[0].matchScore;
    
    if (highestScore > 85) {
      recommendation = 'auto_link';
    } else if (highestScore >= 55) {
      recommendation = 'review_queue';
    }
  }

  return {
    modelName: extraction.modelName,
    candidates,
    recommendation,
  };
}

/**
 * Calculate match score between extraction and candidate model
 * Weighted matching algorithm per D-04
 */
export async function calculateMatchScore(
  extraction: ExtractionResult,
  candidate: any, // canonical model from DB
): Promise<{ score: number; signals: MatchSignals }> {
  const signals: MatchSignals = {};
  const weights: { [key: string]: number } = {
    providerIdMatch: 100,
    aliasMatch: 90,
    normalizedNameMatch: 75,
    familyAndContextMatch: 60,
    pricingSimilarity: 40,
  };

  // 1. Provider ID exact match (highest confidence - binary)
  // Note: This is typically checked before reaching this function,
  // but included for completeness in scoring
  signals.providerIdMatch = 0;

  // 2. Canonical alias exact match (case-insensitive)
  signals.aliasMatch = 0;
  if (candidate.aliases) {
    const aliasMatch = candidate.aliases.some(
      (alias: string) => alias.toLowerCase() === extraction.modelName.toLowerCase(),
    );
    if (aliasMatch) {
      signals.aliasMatch = 90;
    }
  }

  // 3. Normalized name exact match
  signals.normalizedNameMatch = 0;
  const normalizedExtraction = normalizeName(extraction.modelName);
  const normalizedCandidate = normalizeName(candidate.canonicalName);
  if (normalizedExtraction === normalizedCandidate) {
    signals.normalizedNameMatch = 75;
  }

  // CR-05: Removed family+context and pricing similarity signals.
  // canonicalModels table does not have contextWindow, inputPricePer1m,
  // or outputPricePer1m columns, so these signals always evaluated to 0.
  // TODO: If needed, join with extractions table to get latest pricing data.
  signals.familyAndContextMatch = 0;
  signals.pricingSimilarity = 0;

  // Calculate final score: sum of all signals
  // This gives a score between 0-100+ (we normalize later)
  const signalValues = Object.values(signals);
  const rawScore = signalValues.reduce((a, b) => a + (b || 0), 0);
  
  // Normalize to 0-100 range
  // Maximum possible is 90 + 75 + 60 + 40 = 265 if all signals fired
  // But realistically we won't have all of them
  // For better scoring, use max of signals as a percentage
  const maxPossibleScore = Math.max(
    100, // provider ID
    90, // alias
    75, // normalized name
    60, // family+context
    40, // pricing
  );
  
  // Use weighted average approach instead
  // Take the highest signal that fired
  let score = 0;
  if (signals.providerIdMatch === 100) {
    score = 100;
  } else if (signals.aliasMatch === 90) {
    score = 90;
  } else if (signals.normalizedNameMatch === 75) {
    score = 75;
  } else if (signals.familyAndContextMatch === 60) {
    score = 60;
  } else if (signals.pricingSimilarity === 40) {
    score = 40;
  } else if (Object.values(signals).some(v => v && v > 0)) {
    // If multiple signals fired but highest didn't, average them
    const activeSingals = Object.values(signals).filter(v => v && v > 0);
    score = activeSingals.reduce((a, b) => a + b, 0) / activeSingals.length;
  }

  return { score, signals };
}

/**
 * Generate a review queue item for admin dashboard
 */
export async function generateReviewQueue(
  extraction: ExtractionResult,
  extractionId: number,
  detectionScore: DuplicateDetectionScore,
): Promise<ReviewQueueItem> {
  const reviewCandidates = detectionScore.candidates.map((candidate) => ({
    canonical_id: candidate.canonical_id,
    canonical_name: candidate.canonical_name,
    match_score: candidate.matchScore,
    match_reason: getMatchReason(candidate.signals),
    recommendation_strength: getRecommendationStrength(candidate.matchScore),
  }));

  return {
    extraction_id: extractionId,
    extracted_model_name: extraction.modelName,
    candidates: reviewCandidates,
    status: 'pending',
    created_at: new Date(),
  };
}

/**
 * Get confidence level based on match score
 */
function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score > 85) return 'high';
  if (score >= 55) return 'medium';
  return 'low';
}

/**
 * Get human-readable reason for the match
 */
function getMatchReason(signals: MatchSignals): string {
  if (signals.providerIdMatch === 100) return 'Provider ID match';
  if (signals.aliasMatch === 90) return 'Alias match';
  if (signals.normalizedNameMatch === 75) return 'Normalized name match';
  if (signals.familyAndContextMatch === 60) return 'Family and context window match';
  if (signals.pricingSimilarity === 40) return 'Pricing similarity match';
  return 'Partial match';
}

/**
 * Get recommendation strength based on match score
 */
function getRecommendationStrength(score: number): 'strong' | 'moderate' | 'weak' {
  if (score > 85) return 'strong';
  if (score >= 70) return 'moderate';
  return 'weak';
}

/**
 * Normalize model name for comparison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove punctuation except dash
    .replace(/\s+/g, '-') // Replace spaces with dash
    .replace(/-+/g, '-'); // Collapse multiple dashes
}
