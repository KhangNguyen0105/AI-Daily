import { Queue, Worker } from 'bullmq';
import { redisConnection } from './connection';
import { orchestrateDailyRun, finalizePipelineRun } from './orchestrator';
import { getAllTier1Adapters } from '../providers/registry';
import { collectQueue } from './queues';

/**
 * Cron pattern for daily collection at 6:00 AM UTC.
 * Using a constant prevents typos and makes the pattern easy to change.
 */
const DAILY_CRON = '0 6 * * *';

/**
 * BullMQ repeat key for the daily collection job.
 * repeat.key prevents duplicate repeatable jobs when workers restart
 * (T-02-04-01 mitigation).
 */
const DAILY_REPEAT_KEY = 'daily-collection';

/**
 * Cron pattern for Tier 1 refresh every 4 hours.
 * Per D-03: Tier 1 providers crawl every 2-4 hours; use 4-hour cron for simplicity.
 * Runs at: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC.
 */
const TIER1_REFRESH_CRON = '0 */4 * * *';

/**
 * BullMQ repeat key for the Tier 1 refresh job.
 */
const TIER1_REFRESH_REPEAT_KEY = 'tier1-refresh';

/**
 * Set up a BullMQ repeatable job that triggers the daily pipeline
 * at 6:00 AM UTC every day.
 *
 * Architecture note (from plan): The 'daily-pipeline' queue is separate
 * from the 4 pipeline stage queues. Its sole purpose is to trigger
 * orchestrateDailyRun() on a cron schedule. The orchestrator then
 * enqueues collect jobs into the existing collectQueue.
 */
export async function setupDailyScheduler(): Promise<void> {
  const queue = new Queue('daily-pipeline', { connection: redisConnection });

  await queue.add(
    DAILY_REPEAT_KEY,
    {},
    {
      repeat: {
        pattern: DAILY_CRON,
        key: DAILY_REPEAT_KEY,
      },
      removeOnComplete: { count: 5 },
      removeOnFail: { count: 10 },
    },
  );

  await queue.close();
  console.log(`Daily scheduler configured: ${DAILY_CRON} (6 AM UTC)`);
}

/**
 * Set up Tier 1 refresh scheduler.
 * Per D-03: Tier 1 providers need 2-4 hour crawl frequency.
 * Per D-01: Tier 1 providers prioritized in orchestration.
 *
 * Creates a repeatable job that runs every 4 hours and enqueues
 * collect jobs for all 10+ Tier 1 providers with priority=2
 * (higher than routine collects at priority=10).
 */
export async function setupTier1Scheduler(): Promise<void> {
  const queue = new Queue('tier1-refresh', { connection: redisConnection });

  await queue.add(
    TIER1_REFRESH_REPEAT_KEY,
    { action: 'refresh_tier1_providers' },
    {
      repeat: {
        pattern: TIER1_REFRESH_CRON,
        key: TIER1_REFRESH_REPEAT_KEY,
      },
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 20 },
    },
  );

  await queue.close();
  console.log(`Tier 1 refresh scheduler configured: ${TIER1_REFRESH_CRON} (every 4 hours)`);
}

/**
 * Remove the daily repeatable job.
 * Useful for teardown in tests or manual disable.
 */
export async function removeDailyScheduler(): Promise<void> {
  const queue = new Queue('daily-pipeline', { connection: redisConnection });

  await queue.removeRepeatable(DAILY_REPEAT_KEY, {
    pattern: DAILY_CRON,
    key: DAILY_REPEAT_KEY,
  });

  await queue.close();
}

/**
 * Remove the Tier 1 refresh repeatable job.
 * Useful for teardown in tests or manual disable.
 */
export async function removeTier1Scheduler(): Promise<void> {
  const queue = new Queue('tier1-refresh', { connection: redisConnection });

  await queue.removeRepeatable(TIER1_REFRESH_REPEAT_KEY, {
    pattern: TIER1_REFRESH_CRON,
    key: TIER1_REFRESH_REPEAT_KEY,
  });

  await queue.close();
}

/**
 * Create a Worker that listens on the 'daily-pipeline' queue
 * and triggers the full orchestrator pipeline.
 *
 * The worker handler is the entry point that triggers the full
 * pipeline via orchestrateDailyRun().
 */
export function createDailyPipelineWorker(): Worker {
  const worker = new Worker(
    'daily-pipeline',
    async (job) => {
      console.log(`Daily pipeline triggered by job ${job.id}`);
      const runId = await orchestrateDailyRun();

      // CR-03: Finalize pipeline run after all collect jobs are enqueued.
      // TODO: In production, finalization should happen when the last
      // generate job completes (requires a completion listener or
      // a separate "pipeline-finish" queue job). For now, we mark
      // "completed" here to prevent runs from being stuck as "running" forever.
      await finalizePipelineRun(runId, 'completed');

      return { runId };
    },
    { connection: redisConnection, concurrency: 1 },
  );

  // Per Pitfall 1: Error handler prevents silent crashes
  worker.on('error', (err) => {
    console.error('Daily pipeline worker error:', err);
  });

  worker.on('completed', (job) => {
    console.log(`Daily pipeline job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Daily pipeline job ${job?.id} failed:`, err.message);
  });

  return worker;
}

/**
 * Create a Worker that listens on the 'tier1-refresh' queue
 * and enqueues collect jobs for all Tier 1 providers.
 *
 * Per D-03: Tier 1 refresh runs every 4 hours.
 * Per D-01: Tier 1 collect jobs get priority=2 (higher than routine).
 *
 * This worker shares the same collectQueue as the daily orchestrator,
 * ensuring Tier 1 providers are refreshed more frequently than
 * the daily 6 AM UTC run.
 */
export function createTier1RefreshWorker(): Worker {
  const worker = new Worker(
    'tier1-refresh',
    async (job) => {
      console.log(`Tier 1 refresh triggered by job ${job.id}`);

      const tier1Adapters = getAllTier1Adapters();
      let enqueued = 0;

      for (const adapter of tier1Adapters) {
        await collectQueue.add(
          'collect-tier1-refresh',
          {
            providerName: adapter.config.name,
            isScheduled: true,
            isTier1Refresh: true,
          },
          {
            jobId: `tier1-refresh-${adapter.config.name}-${Date.now()}`,
            // Per D-01: Tier 1 refresh jobs get priority=2 (higher than routine collects at priority=10)
            priority: 2,
          },
        );
        enqueued++;
      }

      console.log(`Tier 1 refresh: enqueued ${enqueued} collect jobs`);
      return { tier1ProvidersEnqueued: enqueued };
    },
    { connection: redisConnection, concurrency: 1 },
  );

  // Per Pitfall 1: Error handler prevents silent crashes
  worker.on('error', (err) => {
    console.error('Tier 1 refresh worker error:', err);
  });

  worker.on('completed', (job) => {
    console.log(`Tier 1 refresh job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Tier 1 refresh job ${job?.id} failed:`, err.message);
  });

  return worker;
}
