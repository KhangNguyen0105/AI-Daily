import { Worker, Job } from 'bullmq';
import { getAdapter } from '../../providers/registry';
import { extractQueue } from '../queues';
import { db } from '../../db/index';
import { sources, rawData } from '../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Job data for the collect queue.
 */
export interface CollectJobData {
  providerName: string;
}

/**
 * Return data from the collect worker.
 */
export interface CollectJobResult {
  rawDataId: number;
  sourceId: number;
}

/**
 * Redis connection configuration.
 */
const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
};

/**
 * Create the collect worker for the first pipeline stage.
 * Per D-10: Worker chains to extract stage on completion.
 * Per Pitfall 1: Error handler prevents silent crashes.
 *
 * The collect worker:
 * 1. Gets the provider adapter by name
 * 2. Calls adapter.crawl() to fetch raw HTML
 * 3. Upserts the source in the sources table
 * 4. Stores raw HTML in rawData table
 * 5. Chains to extractQueue with rawDataId
 *
 * @returns BullMQ Worker instance for the 'collect' queue
 */
export function createCollectWorker(): Worker<CollectJobData, CollectJobResult> {
  const worker = new Worker<CollectJobData, CollectJobResult>(
    'collect',
    async (job: Job<CollectJobData>) => {
      const { providerName } = job.data;

      // Get the provider adapter
      const adapter = getAdapter(providerName);
      if (!adapter) {
        throw new Error(`Unknown provider: ${providerName}`);
      }

      // Crawl the provider's pricing page
      const crawlResult = await adapter.crawl();

      // Upsert source (get existing or create new)
      const existingSource = await db
        .select()
        .from(sources)
        .where(eq(sources.name, providerName))
        .limit(1);

      let sourceId: number;
      if (existingSource.length > 0) {
        sourceId = existingSource[0].id;
        // Update the URL and timestamp
        await db
          .update(sources)
          .set({ url: crawlResult.url, updatedAt: new Date() })
          .where(eq(sources.id, sourceId));
      } else {
        const inserted = await db
          .insert(sources)
          .values({
            name: providerName,
            url: crawlResult.url,
            providerType: providerName,
            isActive: 1,
          })
          .returning({ id: sources.id });
        sourceId = inserted[0].id;
      }

      // Store raw crawl data
      const insertedRaw = await db
        .insert(rawData)
        .values({
          sourceId,
          url: crawlResult.url,
          evidence: { html: crawlResult.html },
          crawledAt: crawlResult.crawledAt,
        })
        .returning({ id: rawData.id });

      const rawDataId = insertedRaw[0].id;

      // Chain to extract stage (D-10: worker-triggered chaining)
      await extractQueue.add('extract', {
        rawDataId,
        providerName,
        sourceId,
      });

      return { rawDataId, sourceId };
    },
    { connection, concurrency: 1 }
  );

  // Per Pitfall 1: Error handler prevents silent crashes
  worker.on('error', (err) => {
    console.error('Collect worker error:', err);
  });

  worker.on('completed', (job) => {
    console.log(`Collect job ${job.id} completed for ${job.data.providerName}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Collect job ${job?.id} failed:`, err.message);
  });

  return worker;
}
