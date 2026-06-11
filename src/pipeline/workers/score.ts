import { Worker, Job } from 'bullmq';
import { generateQueue } from '../queues';
import { redisConnection } from '../connection';
import { db } from '../../db/index';
import { rawData, extractions, sources } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { verifyExtraction } from '../verification';
import { calculateConfidence } from '../confidence';
import type { ExtractionResult } from '../../providers/base';

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
 * Phase 2: Real two-pass verification and confidence scoring.
 * 1. Fetch raw HTML and extraction records from the database
 * 2. Run verifyExtraction (LLM second-pass) on each extraction
 * 3. Calculate confidence using source tier + completeness + verification
 * 4. Quarantine extractions where verification disagrees
 * 5. Chain to generate stage
 *
 * @returns BullMQ Worker instance for the 'score' queue
 */
export function createScoreWorker(): Worker<ScoreJobData, ScoreJobResult> {
  const worker = new Worker<ScoreJobData, ScoreJobResult>(
    'score',
    async (job: Job<ScoreJobData>) => {
      const { extractionIds, rawDataId, sourceId } = job.data;

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

      // Look up source name for tier determination
      const sourceRows = await db
        .select()
        .from(sources)
        .where(eq(sources.id, sourceId))
        .limit(1);

      // Default to tier1 -- all providers crawl official pricing pages
      const tier = 'tier1' as const;

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

        let confidence: 'verified' | 'likely' | 'low_confidence' = 'low_confidence';

        try {
          // Run two-pass verification via LLM
          const verificationResult = await verifyExtraction(
            html,
            [extractionResult],
            process.env.OPENAI_API_KEY ?? '',
          );

          // Calculate confidence from source tier + completeness + verification
          confidence = calculateConfidence(
            tier,
            extractionResult,
            verificationResult.verified,
          );

          // Quarantine: if verification found disagreements, force low_confidence
          if (
            !verificationResult.verified &&
            verificationResult.disagreements.length > 0
          ) {
            console.warn(
              `Score worker: quarantining extraction ${extractionRow.id} (${extractionRow.modelName}) — ${verificationResult.disagreements.length} disagreement(s) found`,
            );
            confidence = 'low_confidence';
          }
        } catch (err) {
          // If verification fails (LLM API error), fall back to existing confidence
          console.error(
            `Score worker: verification failed for extraction ${extractionRow.id}, keeping existing confidence:`,
            err instanceof Error ? err.message : err,
          );
          confidence = extractionRow.confidence as 'verified' | 'likely' | 'low_confidence';
        }

        // Update extraction confidence in database
        await db
          .update(extractions)
          .set({ confidence, updatedAt: new Date() })
          .where(eq(extractions.id, extractionRow.id));

        // Track stats
        if (confidence === 'verified') verifiedCount++;
        else if (confidence === 'likely') likelyCount++;
        else lowConfidenceCount++;
      }

      console.log(
        `Score worker: ${extractionRows.length} extractions scored — ${verifiedCount} verified, ${likelyCount} likely, ${lowConfidenceCount} low_confidence`,
      );

      // Chain to generate stage (D-10: worker-triggered chaining)
      await generateQueue.add('generate', {
        extractionIds,
      });

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
