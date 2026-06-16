import { Queue, Worker } from 'bullmq';
import { redisConnection } from './connection';
import { orchestrateDailyRun, finalizePipelineRun } from './orchestrator';
import { getAllTier1Adapters, getAllTier2Adapters, getAllTier3Adapters } from '../providers/registry';
import { collectQueue } from './queues';
import { monitorProviderFeeds, createFeedMonitorWorker } from './feed-monitor-worker';

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
 * Cron pattern for Tier 2 refresh every 12 hours.
 * Per D-03: Tier 2 providers crawl every 6-12 hours.
 * Runs at: 00:00 UTC and 12:00 UTC.
 */
const TIER2_REFRESH_CRON = '0 0,12 * * *';

/**
 * BullMQ repeat key for the Tier 2 refresh job.
 */
const TIER2_REFRESH_REPEAT_KEY = 'tier2-refresh';

/**
 * Cron pattern for feed monitoring at 2 AM UTC.
 * Per D-02: Feed monitoring runs before main orchestrator (2 AM before 6 AM).
 */
const FEED_MONITOR_CRON = '0 2 * * *';

/**
 * BullMQ repeat key for the feed monitoring job.
 */
const FEED_MONITOR_REPEAT_KEY = 'feed-monitor';

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
 * Set up Tier 2 refresh scheduler.
 * Per D-03: Tier 2 providers crawl every 6-12 hours.
 * Per D-01: Tier 2 providers are API-first, widely used — second priority.
 *
 * Creates a repeatable job that runs every 12 hours (00:00 and 12:00 UTC)
 * and enqueues collect jobs for all Tier 2 providers with priority=5.
 */
export async function setupTier2Scheduler(): Promise<void> {
  const queue = new Queue('tier2-refresh', { connection: redisConnection });

  await queue.add(
    TIER2_REFRESH_REPEAT_KEY,
    { action: 'refresh_tier2_providers' },
    {
      repeat: {
        pattern: TIER2_REFRESH_CRON,
        key: TIER2_REFRESH_REPEAT_KEY,
      },
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 20 },
    },
  );

  await queue.close();
  console.log(`Tier 2 refresh scheduler configured: ${TIER2_REFRESH_CRON} (every 12 hours)`);
}

/**
 * Set up feed monitoring scheduler.
 * Per D-02: Feed monitoring runs daily at 2 AM UTC (before main orchestrator at 6 AM).
 * Detects new model announcements early via changelogs, APIs, and diffs.
 */
export async function setupFeedMonitorScheduler(): Promise<void> {
  const queue = new Queue('feed-monitor', { connection: redisConnection });

  await queue.add(
    FEED_MONITOR_REPEAT_KEY,
    { action: 'monitor_all_feeds' },
    {
      repeat: {
        pattern: FEED_MONITOR_CRON,
        key: FEED_MONITOR_REPEAT_KEY,
      },
      removeOnComplete: { count: 5 },
      removeOnFail: { count: 10 },
    },
  );

  await queue.close();
  console.log(`Feed monitor scheduler configured: ${FEED_MONITOR_CRON} (2 AM UTC)`);
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
 * Remove the Tier 2 refresh repeatable job.
 */
export async function removeTier2Scheduler(): Promise<void> {
  const queue = new Queue('tier2-refresh', { connection: redisConnection });

  await queue.removeRepeatable(TIER2_REFRESH_REPEAT_KEY, {
    pattern: TIER2_REFRESH_CRON,
    key: TIER2_REFRESH_REPEAT_KEY,
  });

  await queue.close();
}

/**
 * Remove the feed monitor repeatable job.
 */
export async function removeFeedMonitorScheduler(): Promise<void> {
  const queue = new Queue('feed-monitor', { connection: redisConnection });

  await queue.removeRepeatable(FEED_MONITOR_REPEAT_KEY, {
    pattern: FEED_MONITOR_CRON,
    key: FEED_MONITOR_REPEAT_KEY,
  });

  await queue.close();
}

/**
 * Create a Worker that listens on the 'daily-pipeline' queue
 * and triggers the full orchestrator pipeline.
 *
 * Per D-01: Enqueues Tier 1, Tier 2, Tier 3+ collect jobs with priority 3/2/1.
 * Per D-02: Also triggers feed monitoring as part of daily run.
 */
export function createDailyPipelineWorker(): Worker {
  const worker = new Worker(
    'daily-pipeline',
    async (job) => {
      console.log(`Daily pipeline triggered by job ${job.id}`);
      const runId = await orchestrateDailyRun();

      // Finalize pipeline run after all collect jobs are enqueued.
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

/**
 * Create a Worker that listens on the 'tier2-refresh' queue
 * and enqueues collect jobs for all Tier 2 providers.
 *
 * Per D-03: Tier 2 refresh runs every 12 hours (00:00 and 12:00 UTC).
 * Per D-01: Tier 2 collect jobs get priority=5 (medium priority).
 */
export function createTier2RefreshWorker(): Worker {
  const worker = new Worker(
    'tier2-refresh',
    async (job) => {
      console.log(`Tier 2 refresh triggered by job ${job.id}`);

      const tier2Adapters = getAllTier2Adapters();
      let enqueued = 0;

      for (const adapter of tier2Adapters) {
        await collectQueue.add(
          'collect-tier2-refresh',
          {
            providerName: adapter.config.name,
            isScheduled: true,
            isTier2Refresh: true,
          },
          {
            jobId: `tier2-refresh-${adapter.config.name}-${Date.now()}`,
            // Per D-01: Tier 2 refresh jobs get priority=5 (medium priority)
            priority: 5,
          },
        );
        enqueued++;
      }

      console.log(`Tier 2 refresh: enqueued ${enqueued} collect jobs`);
      return { tier2ProvidersEnqueued: enqueued };
    },
    { connection: redisConnection, concurrency: 1 },
  );

  worker.on('error', (err) => {
    console.error('Tier 2 refresh worker error:', err);
  });

  worker.on('completed', (job) => {
    console.log(`Tier 2 refresh job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Tier 2 refresh job ${job?.id} failed:`, err.message);
  });

  return worker;
}

/**
 * Initialize all schedulers and workers.
 * Call this once at application startup to configure all cron patterns.
 *
 * Schedule:
 * - 2:00 AM UTC: Feed monitoring (detect new models early)
 * - 4:00 AM UTC: Tier 1 refresh (every 4 hours)
 * - 6:00 AM UTC: Daily pipeline (all tiers)
 * - 12:00 PM UTC: Tier 2 refresh (every 12 hours)
 */
export async function initializeAllSchedulers(): Promise<void> {
  await setupDailyScheduler();
  await setupTier1Scheduler();
  await setupTier2Scheduler();
  await setupFeedMonitorScheduler();
  console.log('All schedulers initialized');
}

/**
 * Create all workers for the scheduling system.
 * Returns workers for graceful shutdown handling.
 */
export function createAllWorkers(): Worker[] {
  return [
    createDailyPipelineWorker(),
    createTier1RefreshWorker(),
    createTier2RefreshWorker(),
    createFeedMonitorWorker(),
  ];
}
