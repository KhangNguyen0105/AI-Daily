import { Worker, Job } from 'bullmq';
import { getAdapter } from '../../providers/registry';
import { scoreQueue } from '../queues';
import { redisConnection } from '../connection';
import { db } from '../../db/index';
import { rawData, extractions, promotions, subscriptionPlans } from '../../db/schema';
import { eq, and, or, isNull } from 'drizzle-orm';
import { classifyEdgeCases } from '../edge-case-classifier';
import { buildEvidenceQuotes, captureEvidence } from '../../lib/evidence-anchor';
import { updatePipelineStats } from '../orchestrator';
import { verifyPromotions, isPromotionExpired } from '../../lib/promotion-verifier';
import type { EdgeCaseFlags } from '../edge-case-classifier';
import type { EvidenceQuotes } from '../../lib/evidence-anchor';

/**
 * Normalize plan name for consistent upsert matching.
 * Lowercases, trims, and collapses whitespace to prevent duplicate rows
 * from LLM returning different casing/whitespace across crawls.
 * (CR-01: subscription plan upsert missing planName normalization)
 */
function normalizePlanName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Job data for the extract queue.
 */
export interface ExtractJobData {
  rawDataId: number;
  providerName: string;
  sourceId: number;
  pipelineRunId?: number;
}

/**
 * Return data from the extract worker.
 */
export interface ExtractJobResult {
  extractionIds: number[];
}

/**
 * Create the extract worker for the second pipeline stage.
 * Per D-10: Worker chains to score stage on completion.
 * Per Pitfall 1: Error handler prevents silent crashes.
 *
 * The extract worker:
 * 1. Fetches raw HTML from rawData table by rawDataId
 * 2. Gets the provider adapter by name
 * 3. Calls adapter.extract(html) to get structured pricing data
 * 4. Calls adapter.normalize(results) to standardize format
 * 5. Inserts each extraction into the extractions table
 * 6. Chains to scoreQueue with extractionIds
 *
 * @returns BullMQ Worker instance for the 'extract' queue
 */
export function createExtractWorker(): Worker<ExtractJobData, ExtractJobResult> {
  const worker = new Worker<ExtractJobData, ExtractJobResult>(
    'extract',
    async (job: Job<ExtractJobData>) => {
      const { rawDataId, providerName, sourceId, pipelineRunId } = job.data;

      // Fetch raw HTML from database
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

      // Get the provider adapter
      const adapter = getAdapter(providerName);
      if (!adapter) {
        throw new Error(`Unknown provider: ${providerName}`);
      }

      // Extract structured data from HTML
      const extractionResults = await adapter.extract(html);

      // Normalize the results
      const normalized = adapter.normalize(extractionResults);

      if (normalized.models.length === 0) {
        console.warn(
          `[extract] Provider "${providerName}" produced 0 models from rawData ${rawDataId}. HTML length: ${html.length}`,
        );
      }

      // Insert each extraction into the database
      const extractionIds: number[] = [];
      const allEvidenceQuotes: Record<number, EvidenceQuotes> = {};
      const allEdgeCaseFlags: EdgeCaseFlags[] = [];

      for (const result of normalized.models) {
        // CR-02: Classify edge cases per-model using model-specific prices
        const edgeCaseFlags = await classifyEdgeCases(html, {
          modelName: result.modelName,
          inputPricePer1m: result.inputPricePer1m,
          outputPricePer1m: result.outputPricePer1m,
          contextWindow: result.contextWindow,
        }, providerName);
        allEdgeCaseFlags.push(edgeCaseFlags);
        // Build evidence quotes for this extraction (D-08)
        const sourceUrl = rawRecord.url ?? '';
        const evidenceQuotes = buildEvidenceQuotes(html, {
          modelName: result.modelName,
          inputPricePer1m: result.inputPricePer1m,
          outputPricePer1m: result.outputPricePer1m,
          contextWindow: result.contextWindow,
        }, sourceUrl);

        // Capture model name evidence
        const modelNameEvidence = captureEvidence(html, 'model_name', result.modelName, sourceUrl);

        // Determine verification status based on evidence availability
        // WR-03: Validate against known enum values before inserting
        const VALID_VERIFICATION_STATUSES = [
          'verified', 'verified_with_warning', 'needs_review',
          'conflicted', 'quarantined', 'unsupported_pricing_model',
        ] as const;
        let verificationStatus: string | null = null;
        if (result.inputPricePer1m !== null && !evidenceQuotes.input_price) {
          verificationStatus = 'needs_review';
        }
        if (result.outputPricePer1m !== null && !evidenceQuotes.output_price) {
          verificationStatus = 'needs_review';
        }
        const safeVerificationStatus = verificationStatus
          && (VALID_VERIFICATION_STATUSES as readonly string[]).includes(verificationStatus)
          ? verificationStatus
          : verificationStatus === null ? null : 'needs_review';

        const inserted = await db
          .insert(extractions)
          .values({
            rawDataId,
            sourceId,
            modelName: result.modelName,
            inputPricePer1m: result.inputPricePer1m,
            outputPricePer1m: result.outputPricePer1m,
            contextWindow: result.contextWindow,
            confidence: result.confidence,
            rawEvidence: result.rawEvidence ?? null,
            collectedAt: new Date(),
            // Evidence anchoring columns
            sourceUrl: sourceUrl || null,
            rawHtmlSnapshotId: rawDataId.toString(),
            extractedTextSnippet: evidenceQuotes.model_name?.extracted_text_snippet ?? null,
            evidenceQuote: evidenceQuotes.model_name?.evidence_quote ?? null,
            evidenceSelector: evidenceQuotes.model_name?.evidence_selector ?? null,
            evidenceHash: evidenceQuotes.model_name?.evidence_hash ?? null,
            extractedAt: new Date(),
            evidenceQuotes: evidenceQuotes as any,
            edgeCaseFlags: edgeCaseFlags as any,
            verificationStatus: safeVerificationStatus as any,
          })
          .onConflictDoUpdate({
            target: [extractions.sourceId, extractions.modelName],
            set: {
              rawDataId,
              inputPricePer1m: result.inputPricePer1m,
              outputPricePer1m: result.outputPricePer1m,
              contextWindow: result.contextWindow,
              confidence: result.confidence,
              rawEvidence: result.rawEvidence ?? null,
              collectedAt: new Date(),
              updatedAt: new Date(),
              // Update evidence anchoring
              sourceUrl: sourceUrl || null,
              rawHtmlSnapshotId: rawDataId.toString(),
              extractedTextSnippet: evidenceQuotes.model_name?.extracted_text_snippet ?? null,
              evidenceQuote: evidenceQuotes.model_name?.evidence_quote ?? null,
              evidenceSelector: evidenceQuotes.model_name?.evidence_selector ?? null,
              evidenceHash: evidenceQuotes.model_name?.evidence_hash ?? null,
              extractedAt: new Date(),
              evidenceQuotes: evidenceQuotes as any,
              edgeCaseFlags: edgeCaseFlags as any,
              verificationStatus: safeVerificationStatus as any,
            },
          })
          .returning({ id: extractions.id });

        const extractionId = inserted[0].id;
        extractionIds.push(extractionId);
        allEvidenceQuotes[extractionId] = evidenceQuotes;
      }

      // WR-04: Update promotions with verification
      // Phase 11: Verify promotions before storing to prevent hallucinated data
      if (normalized.promotions && normalized.promotions.length > 0) {
        // Verify promotions before storing
        const { valid: validPromotions, rejected: rejectedPromotions } =
          await verifyPromotions(normalized.promotions, sourceId);

        if (rejectedPromotions.length > 0) {
          console.warn(
            `[extract] Rejected ${rejectedPromotions.length} promotions for provider "${providerName}":`,
            rejectedPromotions.map(r => `${r.promotion.modelPattern}: ${r.reason}`),
          );
        }

        if (validPromotions.length > 0) {
          // Upsert valid promotions (don't delete existing ones)
          for (const promo of validPromotions) {
            try {
              await db
                .insert(promotions)
                .values({
                  sourceId,
                  modelPattern: promo.modelPattern,
                  type: promo.type as any,
                  description: promo.description,
                  credits: promo.credits || null,
                  startDate: null,
                  endDate: null,
                  sourceUrl: promo.sourceUrl || null,
                })
                .onConflictDoUpdate({
                  target: [promotions.sourceId, promotions.modelPattern, promotions.type],
                  set: {
                    description: promo.description,
                    credits: promo.credits || null,
                    sourceUrl: promo.sourceUrl || null,
                    updatedAt: new Date(),
                  },
                });
            } catch (promoError) {
              console.error(
                `[extract] Failed to upsert promotion "${promo.modelPattern}" for provider "${providerName}":`,
                promoError,
              );
            }
          }
        }
      }

      // Clean up expired promotions
      // Phase 11: Remove promotions that have passed their expiration date
      try {
        const allPromotions = await db
          .select()
          .from(promotions)
          .where(eq(promotions.sourceId, sourceId));

        for (const promo of allPromotions) {
          if (promo.type === 'free_tier' && promo.description) {
            // Check for time-limited indicators in description
            const timeLimitedPatterns = [
              /first (\d+) months?/i,
              /for (\d+) days?/i,
              /until (\w+ \d+,? \d{4})/i,
              /expires? (\w+ \d+,? \d{4})/i,
              /limited time/i,
            ];

            for (const pattern of timeLimitedPatterns) {
              const match = promo.description.match(pattern);
              if (match) {
                // For "first X months" patterns, check if it's been more than X months
                if (pattern.source.includes('months')) {
                  const months = parseInt(match[1]);
                  const createdAt = promo.createdAt;
                  const expirationDate = new Date(createdAt);
                  expirationDate.setMonth(expirationDate.getMonth() + months);

                  if (new Date() > expirationDate) {
                    await db.delete(promotions).where(eq(promotions.id, promo.id));
                    console.log(`[extract] Removed expired promotion: ${promo.modelPattern} (${promo.description})`);
                  }
                }
                break;
              }
            }
          }
        }
      } catch (cleanupError) {
        console.error(`[extract] Error cleaning up expired promotions for provider "${providerName}":`, cleanupError);
      }

      // Phase 10: Upsert subscription plans from consumer adapters
      // Follows the same upsert pattern as extractions (onConflictDoUpdate)
      // Per-plan try/catch ensures one malformed plan does not block others
      if (normalized.subscriptionPlans && normalized.subscriptionPlans.length > 0) {
        for (const plan of normalized.subscriptionPlans) {
          try {
            await db
              .insert(subscriptionPlans)
              .values({
                sourceId,
                providerName,
                planName: normalizePlanName(plan.planName),
                planSlug: normalizePlanName(plan.planName).replace(/\s+/g, '-'),
                monthlyPrice: plan.monthlyPrice,
                annualPrice: plan.annualPrice,
                annualMonthlyPrice: plan.annualMonthlyPrice,
                rawPriceText: plan.rawPriceText,
                billingPeriod: plan.billingPeriod,
                freeTrialDays: plan.freeTrialDays,
                freeTrialConditions: plan.freeTrialConditions,
                keyFeatures: plan.keyFeatures,
                currency: plan.currency || 'USD',
                confidence: plan.confidence || 'likely',
                extractionNotes: plan.extractionNotes,
                sourceUrl: plan.sourceUrl,
                crawledAt: new Date(),
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: [subscriptionPlans.sourceId, subscriptionPlans.planName],
                set: {
                  providerName,
                  planSlug: normalizePlanName(plan.planName).replace(/\s+/g, '-'),
                  monthlyPrice: plan.monthlyPrice,
                  annualPrice: plan.annualPrice,
                  annualMonthlyPrice: plan.annualMonthlyPrice,
                  rawPriceText: plan.rawPriceText,
                  billingPeriod: plan.billingPeriod,
                  freeTrialDays: plan.freeTrialDays,
                  freeTrialConditions: plan.freeTrialConditions,
                  keyFeatures: plan.keyFeatures,
                  currency: plan.currency || 'USD',
                  confidence: plan.confidence || 'likely',
                  extractionNotes: plan.extractionNotes,
                  sourceUrl: plan.sourceUrl,
                  crawledAt: new Date(),
                  updatedAt: new Date(),
                },
              });
          } catch (planError) {
            // Per-plan error handling: log and continue to next plan
            console.error(
              `[extract] Failed to upsert subscription plan "${plan.planName}" for provider "${providerName}":`,
              planError,
            );
          }
        }
      }

      // Chain to score stage (D-10: worker-triggered chaining)
      // Pass evidenceQuotes and edgeCaseFlags for evidence-based verification (D-08)
      // WR-01: Propagate pipelineRunId for downstream stats tracking
      // CR-02: Merge per-model edge case flags for the batch
      const mergedEdgeCaseFlags: EdgeCaseFlags = {};
      for (const flags of allEdgeCaseFlags) {
        for (const [key, value] of Object.entries(flags)) {
          if (value !== undefined) {
            (mergedEdgeCaseFlags as Record<string, unknown>)[key] = value;
          }
        }
      }
      await scoreQueue.add('score', {
        extractionIds,
        rawDataId,
        sourceId,
        pipelineRunId,
        evidenceQuotes: allEvidenceQuotes,
        edgeCaseFlags: mergedEdgeCaseFlags,
      });

      return { extractionIds };
    },
    { connection: redisConnection, concurrency: 1 }
  );

  // Per Pitfall 1: Error handler prevents silent crashes
  worker.on('error', (err) => {
    console.error('Extract worker error:', err);
  });

  worker.on('completed', (job) => {
    console.log(`Extract job ${job.id} completed: ${job.returnvalue.extractionIds.length} extractions`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Extract job ${job?.id} failed:`, err.message);
    // WR-02: Update pipeline stats when extract job fails
    // Use .catch() to prevent error handler from throwing
    if (job?.data?.pipelineRunId) {
      updatePipelineStats(job.data.pipelineRunId, {
        attempted: 1,
        failed: 1,
      }).catch(() => {});
    }
  });

  return worker;
}
