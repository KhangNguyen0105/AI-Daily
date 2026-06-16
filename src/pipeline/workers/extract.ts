import { Worker, Job } from 'bullmq';
import { getAdapter } from '../../providers/registry';
import { scoreQueue } from '../queues';
import { redisConnection } from '../connection';
import { db } from '../../db/index';
import { rawData, extractions, promotions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { classifyEdgeCases } from '../edge-case-classifier';
import { buildEvidenceQuotes, captureEvidence } from '../../lib/evidence-anchor';
import type { EdgeCaseFlags } from '../edge-case-classifier';
import type { EvidenceQuotes } from '../../lib/evidence-anchor';

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

      // Classify edge cases in the HTML (D-08)
      const edgeCaseFlags = await classifyEdgeCases(html, {
        modelName: normalized.models[0]?.modelName ?? '',
        inputPricePer1m: normalized.models[0]?.inputPricePer1m ?? null,
        outputPricePer1m: normalized.models[0]?.outputPricePer1m ?? null,
        contextWindow: normalized.models[0]?.contextWindow ?? null,
      }, providerName);

      // Insert each extraction into the database
      const extractionIds: number[] = [];
      const allEvidenceQuotes: Record<number, EvidenceQuotes> = {};

      for (const result of normalized.models) {
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
        let verificationStatus: string | null = null;
        if (result.inputPricePer1m !== null && !evidenceQuotes.input_price) {
          verificationStatus = 'needs_review';
        }
        if (result.outputPricePer1m !== null && !evidenceQuotes.output_price) {
          verificationStatus = 'needs_review';
        }

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
            verificationStatus: verificationStatus as any,
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
              verificationStatus: verificationStatus as any,
            },
          })
          .returning({ id: extractions.id });

        const extractionId = inserted[0].id;
        extractionIds.push(extractionId);
        allEvidenceQuotes[extractionId] = evidenceQuotes;
      }

      // Update promotions: delete old ones for this source and insert new ones
      if (normalized.promotions && normalized.promotions.length > 0) {
        await db.delete(promotions).where(eq(promotions.sourceId, sourceId));
        for (const promo of normalized.promotions) {
          await db.insert(promotions).values({
            sourceId,
            modelPattern: promo.modelPattern,
            type: promo.type,
            description: promo.description,
            credits: promo.credits,
          });
        }
      }

      // Chain to score stage (D-10: worker-triggered chaining)
      // Pass evidenceQuotes and edgeCaseFlags for evidence-based verification (D-08)
      // WR-01: Propagate pipelineRunId for downstream stats tracking
      await scoreQueue.add('score', {
        extractionIds,
        rawDataId,
        sourceId,
        pipelineRunId,
        evidenceQuotes: allEvidenceQuotes,
        edgeCaseFlags,
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
  });

  return worker;
}
