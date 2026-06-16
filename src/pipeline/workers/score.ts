import { Worker, Job } from 'bullmq';
import { generateQueue } from '../queues';
import { redisConnection } from '../connection';
import { db } from '../../db/index';
import { rawData, extractions, sources } from '../../db/schema';
import { getProviderTier } from '../../providers/registry';
import { eq, inArray } from 'drizzle-orm';
import { verifyExtraction, verifyWithEvidenceQuotes, detectLargeChange, compareNumericValues } from '../verification';
import { calculateMultiDimensionalConfidence, applyHumanOverride, calculateConfidence } from '../confidence';
import { computeFreshnessConfidence, computeFreshnessMetadata, checkSLABreach, triggerPriorityRecrawl } from '../../lib/freshness-tracker';
import { updatePipelineStats } from '../orchestrator';
import { env } from '../../lib/env';
import { isComparableTokenPricing } from '../edge-case-classifier';
import type { ExtractionResult } from '../../providers/base';
import type { EdgeCaseFlags } from '../edge-case-classifier';
import type { EvidenceQuotes } from '../../lib/evidence-anchor';
import type { SourceTier } from '../../providers/types';

/**
 * Job data for the score queue.
 * rawDataId and sourceId are passed from the extract worker so the score
 * worker can fetch the original HTML for verification and look up the
 * source tier.
 */
export interface ScoreJobData {
  extractionIds: number[];
  rawDataId: number;
  sourceId: number;
  pipelineRunId?: number;
  evidenceQuotes?: Record<number, EvidenceQuotes>;
  edgeCaseFlags?: EdgeCaseFlags;
}

/**
 * Return data from the score worker.
 */
export interface ScoreJobResult {
  scored: number;
  verified: number;
  likely: number;
  lowConfidence: number;
}

/**
 * Create the score worker for the third pipeline stage.
 * Per D-10: Worker chains to generate stage on completion.
 * Per Pitfall 1: Error handler prevents silent crashes.
 *
 * Phase 2.1-03: Multi-dimensional confidence scoring with freshness tracking.
 * 1. Fetch raw HTML and extraction records from the database
 * 2. Run verifyExtraction (LLM second-pass) on each extraction
 * 3. Calculate 6-dimension confidence (source/extraction/normalization/freshness/verification/overall)
 * 4. Compute freshness metadata and check SLA breaches
 * 5. Quarantine extractions where verification disagrees
 * 6. Apply human overrides if present
 * 7. Chain to generate stage
 *
 * @returns BullMQ Worker instance for the 'score' queue
 */
export function createScoreWorker(): Worker<ScoreJobData, ScoreJobResult> {
  const worker = new Worker<ScoreJobData, ScoreJobResult>(
    'score',
    async (job: Job<ScoreJobData>) => {
      const { extractionIds, rawDataId, sourceId, pipelineRunId, evidenceQuotes, edgeCaseFlags } = job.data;

      // Guard: skip generate step when there are no extractions (WR-07)
      if (extractionIds.length === 0) {
        console.log('Score worker: No extractions to score, skipping generate step');
        return { scored: 0, verified: 0, likely: 0, lowConfidence: 0 };
      }

      // Fetch raw HTML from rawData table
      const rawRows = await db
        .select()
        .from(rawData)
        .where(eq(rawData.id, rawDataId))
        .limit(1);

      if (rawRows.length === 0) {
        throw new Error(`Raw data not found: ${rawDataId}`);
      }

      const rawRecord = rawRows[0];
      const evidence = rawRecord.evidence as Record<string, unknown>;
      if (typeof evidence?.html !== 'string' || evidence.html.length === 0) {
        throw new Error(`Invalid evidence format for rawData ${rawDataId}: missing or empty html field`);
      }
      const html = evidence.html;

      // Fetch extraction records from database
      const extractionRows = await db
        .select()
        .from(extractions)
        .where(inArray(extractions.id, extractionIds));

      if (extractionRows.length === 0) {
        console.log('Score worker: No extraction records found, skipping');
        return { scored: 0, verified: 0, likely: 0, lowConfidence: 0 };
      }

      // CR-02: Look up actual provider tier from registry instead of hardcoding 'tier1'.
      // This ensures Tier 2/3 providers get correct confidence scores.
      const sourceRows = await db
        .select({ name: sources.name })
        .from(sources)
        .where(eq(sources.id, sourceId))
        .limit(1);

      const providerName = sourceRows[0]?.name;
      const sourceTier = (getProviderTier(providerName) ?? 'tier3') as SourceTier;

      // Track confidence distribution
      let verifiedCount = 0;
      let likelyCount = 0;
      let lowConfidenceCount = 0;

      // Process each extraction
      for (const extractionRow of extractionRows) {
        // Build ExtractionResult from DB row for verification
        const extractionResult: ExtractionResult = {
          modelName: extractionRow.modelName,
          inputPricePer1m: extractionRow.inputPricePer1m,
          outputPricePer1m: extractionRow.outputPricePer1m,
          contextWindow: extractionRow.contextWindow,
          confidence: extractionRow.confidence as ExtractionResult['confidence'],
          rawEvidence: extractionRow.rawEvidence,
        };

        // Get evidence quotes for this extraction (D-08)
        const extractionEvidenceQuotes = evidenceQuotes?.[extractionRow.id];

        // Get normalization confidence from DB
        const normalizationConf = extractionRow.normalizationConfidence as 'high' | 'medium' | 'low' | 'unknown' | undefined;

        let legacyConfidence: 'verified' | 'likely' | 'low_confidence' = 'low_confidence';
        let verificationStatus: string = 'needs_review';
        let verificationNotes: string = '';

        try {
          // Run two-pass verification via LLM
          // CR-02: Fail fast if no AI provider is configured
          if (!env.MIMO_API_KEY && !env.OPENAI_API_KEY) {
            throw new Error(
              'No AI provider configured. Set MIMO_API_KEY or OPENAI_API_KEY in .env'
            );
          }
          const verificationResult = await verifyExtraction(
            html,
            [extractionResult],
          );

          // D-08: Verify against evidence quotes if available
          let evidenceVerified = true;
          if (extractionEvidenceQuotes) {
            const evidenceResult = await verifyWithEvidenceQuotes(
              extractionResult,
              extractionEvidenceQuotes,
              html,
            );
            evidenceVerified = evidenceResult.verified;
            if (!evidenceVerified) {
              verificationNotes += `Evidence mismatches: ${evidenceResult.quoteMismatches.join(', ')}. `;
              verificationNotes += `Missing evidence: ${evidenceResult.missingEvidence.join(', ')}. `;
            }
          }

          // Phase 2.1-03: Multi-dimensional confidence scoring
          // Freshness confidence: just extracted, so 0 minutes old = 90
          const freshnessConf = computeFreshnessConfidence(0);

          const confidenceScore = await calculateMultiDimensionalConfidence(
            sourceTier,
            extractionResult,
            verificationResult.verified && evidenceVerified ? verificationResult : { ...verificationResult, verified: false },
            freshnessConf,
            edgeCaseFlags,
            normalizationConf,
          );

          // Compute freshness metadata
          const freshnessMetadata = await computeFreshnessMetadata(new Date(), sourceTier);

          // Check SLA breach
          const slaBreach = await checkSLABreach(freshnessMetadata.data_age_minutes, sourceTier);
          if (slaBreach.breached) {
            await triggerPriorityRecrawl(sourceId, `SLA breach: ${slaBreach.daysOverdue} days overdue`);
            verificationNotes += `SLA breach detected: ${slaBreach.daysOverdue} days overdue. `;
          }

          // Determine verification status
          if (verificationResult.verified && evidenceVerified) {
            if (edgeCaseFlags && Object.keys(edgeCaseFlags).length > 0) {
              verificationStatus = 'verified_with_warning';
              verificationNotes += 'Edge cases detected in pricing. ';
            } else {
              verificationStatus = 'verified';
            }
          } else if (verificationResult.disagreements.length > 0) {
            if (edgeCaseFlags && Object.keys(edgeCaseFlags).length > 0) {
              verificationStatus = 'verified_with_warning';
              verificationNotes += 'Verification disagreement with edge cases present. ';
            } else {
              verificationStatus = 'conflicted';
              verificationNotes += `${verificationResult.disagreements.length} disagreement(s) found. `;
            }
          }

          // Legacy confidence for backward compatibility
          legacyConfidence = calculateConfidence(
            sourceTier,
            extractionResult,
            verificationResult.verified && evidenceVerified,
          );

          // Quarantine: if verification found disagreements, force low_confidence
          if (
            !verificationResult.verified &&
            verificationResult.disagreements.length > 0
          ) {
            console.warn(
              `Score worker: quarantining extraction ${extractionRow.id} (${extractionRow.modelName}) — ${verificationResult.disagreements.length} disagreement(s) found`,
            );
            legacyConfidence = 'low_confidence';
          }

          // Check if edge cases make pricing non-comparable
          const comparable = edgeCaseFlags ? isComparableTokenPricing(edgeCaseFlags) : true;
          if (!comparable && verificationStatus === 'verified') {
            verificationStatus = 'verified_with_warning';
            verificationNotes += 'Non-comparable pricing model. ';
          }

          // Apply human override if present
          let finalConfidenceScore = confidenceScore;
          if (extractionRow.humanConfidenceOverride !== null && extractionRow.reviewedBy) {
            finalConfidenceScore = applyHumanOverride(confidenceScore, {
              confidence_override: extractionRow.humanConfidenceOverride,
              reviewed_by: extractionRow.reviewedBy,
              reviewed_at: extractionRow.reviewedAt || new Date(),
              review_notes: extractionRow.reviewNotes || '',
              human_review_status: (extractionRow.humanReviewStatus as any) || 'approved',
            });
          }

          // Update extraction with all confidence dimensions + freshness
          await db
            .update(extractions)
            .set({
              // Legacy confidence field
              confidence: legacyConfidence as any,
              // Multi-dimensional confidence (D-07)
              sourceConfidence: finalConfidenceScore.source_confidence,
              extractionConfidence: finalConfidenceScore.extraction_confidence,
              freshnessConfidence: finalConfidenceScore.freshness_confidence,
              verificationConfidence: finalConfidenceScore.verification_confidence,
              overallConfidence: finalConfidenceScore.overall_confidence,
              confidenceLabel: finalConfidenceScore.label,
              confidenceBreakdown: finalConfidenceScore.breakdown_summary,
              perFieldConfidence: finalConfidenceScore.per_field_confidence as any,
              // Freshness metadata (D-03)
              lastVerifiedAt: freshnessMetadata.last_verified_at,
              freshnessStatus: freshnessMetadata.freshness_status as any,
              dataAgeMinutes: freshnessMetadata.data_age_minutes,
              // Verification status (D-08)
              verificationStatus: verificationStatus as any,
              verificationNotes: verificationNotes || null,
              edgeCaseFlags: (edgeCaseFlags ?? null) as any,
              updatedAt: new Date(),
            })
            .where(eq(extractions.id, extractionRow.id));

          // Track stats
          if (legacyConfidence === 'verified') verifiedCount++;
          else if (legacyConfidence === 'likely') likelyCount++;
          else lowConfidenceCount++;
        } catch (err) {
          // If verification fails (LLM API error), fall back to existing confidence
          console.error(
            `Score worker: verification failed for extraction ${extractionRow.id}, keeping existing confidence:`,
            err instanceof Error ? err.message : err,
          );
          legacyConfidence = extractionRow.confidence as 'verified' | 'likely' | 'low_confidence';
          verificationStatus = 'needs_review';
          verificationNotes = `Verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`;

          // Still compute basic freshness for the extraction
          const freshnessConf = computeFreshnessConfidence(0);
          const freshnessMetadata = await computeFreshnessMetadata(new Date(), sourceTier);

          await db
            .update(extractions)
            .set({
              confidence: legacyConfidence as any,
              freshnessConfidence: freshnessConf,
              freshnessStatus: freshnessMetadata.freshness_status as any,
              dataAgeMinutes: freshnessMetadata.data_age_minutes,
              lastVerifiedAt: freshnessMetadata.last_verified_at,
              verificationStatus: verificationStatus as any,
              verificationNotes: verificationNotes,
              updatedAt: new Date(),
            })
            .where(eq(extractions.id, extractionRow.id));

          if (legacyConfidence === 'verified') verifiedCount++;
          else if (legacyConfidence === 'likely') likelyCount++;
          else lowConfidenceCount++;
        }
      }

      console.log(
        `Score worker: ${extractionRows.length} extractions scored — ${verifiedCount} verified, ${likelyCount} likely, ${lowConfidenceCount} low_confidence`,
      );

      // WR-01: Update pipeline stats with extraction/confidence counts
      if (pipelineRunId) {
        await updatePipelineStats(pipelineRunId, {
          extractions: extractionRows.length,
          verifiedCount,
          likelyCount,
          lowConfidenceCount,
        });
      }

      // WR-05: Only chain to generate when at least one extraction has high confidence
      const highConfidenceCount = verifiedCount + likelyCount;
      if (highConfidenceCount > 0) {
        // Chain to generate stage (D-10: worker-triggered chaining)
        await generateQueue.add('generate', {
          extractionIds,
          pipelineRunId,
        });
      } else {
        console.warn(
          `Score worker: All ${extractionRows.length} extractions are low_confidence. ` +
          'Skipping article generation to avoid publishing unreliable data.'
        );
      }

      return {
        scored: extractionRows.length,
        verified: verifiedCount,
        likely: likelyCount,
        lowConfidence: lowConfidenceCount,
      };
    },
    { connection: redisConnection, concurrency: 1 }
  );

  // Per Pitfall 1: Error handler prevents silent crashes
  worker.on('error', (err) => {
    console.error('Score worker error:', err);
  });

  worker.on('completed', (job) => {
    console.log(`Score job ${job.id} completed: ${job.returnvalue.scored} extractions scored`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Score job ${job?.id} failed:`, err.message);
  });

  return worker;
}
