import { Worker, Job } from 'bullmq';
import { getAdapter } from '../../providers/registry';
import { extractQueue } from '../queues';
import { redisConnection } from '../connection';
import { db } from '../../db/index';
import { sources, rawData } from '../../db/schema';
import { updatePipelineStats } from '../orchestrator';

/**
 * Job data for the collect queue.
 * pipelineRunId is passed from the orchestrator so the collect worker
 * can update pipeline stats as providers complete.
 */
export interface CollectJobData {
  providerName: string;
  pipelineRunId?: number;
}

/**
 * Return data from the collect worker.
 * pipelineRunId is passed through for downstream stages.
 */
export interface CollectJobResult {
  rawDataId: number;
  sourceId: number;
  pipelineRunId?: number;
}

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
 * 6. Updates pipeline stats (attempted/succeeded/failed)
 *
 * @returns BullMQ Worker instance for the 'collect' queue
 */
export function createCollectWorker(): Worker<CollectJobData, CollectJobResult> {
  const worker = new Worker<CollectJobData, CollectJobResult>(
    'collect',
    async (job: Job<CollectJobData>) => {
      const { providerName, pipelineRunId } = job.data;

      // Get the provider adapter
      const adapter = getAdapter(providerName);
      if (!adapter) {
        throw new Error(`Unknown provider: ${providerName}`);
      }

      // Crawl the provider's pricing page
      const crawlResult = await adapter.crawl();

      // Atomic upsert source (WR-08: prevents race condition)
      const inserted = await db
        .insert(sources)
        .values({
          name: providerName,
          url: crawlResult.url,
          providerType: providerName,
          isActive: 1,
        })
        .onConflictDoUpdate({
          target: sources.name,
          set: { url: crawlResult.url, updatedAt: new Date() },
        })
        .returning({ id: sources.id });

      const sourceId = inserted[0].id;

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
      // Propagate pipelineRunId for downstream stats tracking
      await extractQueue.add('extract', {
        rawDataId,
        providerName,
        sourceId,
        pipelineRunId,
      });

      // Update pipeline stats: provider succeeded
      if (pipelineRunId) {
        await updatePipelineStats(pipelineRunId, {
          attempted: 1,
          succeeded: 1,
        });
      }

      return { rawDataId, sourceId, pipelineRunId };
    },
    { connection: redisConnection, concurrency: 1 }
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

    // Update pipeline stats: provider failed
    // Use .catch() to prevent error handler from throwing
    if (job?.data.pipelineRunId) {
      updatePipelineStats(job.data.pipelineRunId, {
        attempted: 1,
        failed: 1,
      }).catch(() => {});
    }
  });

  return worker;
}
