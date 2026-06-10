import { Worker, Job } from 'bullmq';
import { getAdapter } from '../../providers/registry';
import { scoreQueue } from '../queues';
import { db } from '../../db/index';
import { rawData, extractions } from '../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Job data for the extract queue.
 */
export interface ExtractJobData {
  rawDataId: number;
  providerName: string;
  sourceId: number;
}

/**
 * Return data from the extract worker.
 */
export interface ExtractJobResult {
  extractionIds: number[];
}

/**
 * Redis connection configuration.
 */
const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
};

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
      const { rawDataId, providerName, sourceId } = job.data;

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
      const evidence = rawRecord.evidence as { html: string };
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

      // Insert each extraction into the database
      const extractionIds: number[] = [];
      for (const result of normalized) {
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
            rawEvidence: result.rawEvidence ? JSON.parse(result.rawEvidence) : null,
            collectedAt: new Date(),
          })
          .returning({ id: extractions.id });

        extractionIds.push(inserted[0].id);
      }

      // Chain to score stage (D-10: worker-triggered chaining)
      await scoreQueue.add('score', {
        extractionIds,
      });

      return { extractionIds };
    },
    { connection, concurrency: 1 }
  );

  // Per Pitfall 1: Error handler prevents silent crashes
  worker.on('error', (err) => {
    console.error('Extract worker error:', err);
  });

  worker.on('completed', (job) => {
    console.log(`Extract job ${job.id} completed: ${job.returnValue.extractionIds.length} extractions`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Extract job ${job?.id} failed:`, err.message);
  });

  return worker;
}
