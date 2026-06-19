import { Queue, Worker } from 'bullmq';
import { redisConnection } from './connection';
import { orchestrateDailyRun } from './orchestrator';
import { getAllTier1Adapters, getAllTier2Adapters, getAllTier3Adapters } from '../providers/registry';
import { collectQueue } from './queues';
import { monitorProviderFeeds, createFeedMonitorWorker } from './feed-monitor-worker';
import { desc } from 'drizzle-orm';
import { db } from '../db/index';
import { pipelineRuns } from '../db/schema';

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

      // CR-01: Do NOT finalize here -- the run should be finalized by the last
      // worker in the chain (generate), or by a completion-check mechanism.
      // Premature finalization marked the run "completed" before any work executed.
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

      // CR-03: Create pipeline run for observability
      const inserted = await db
        .insert(pipelineRuns)
        .values({
          status: 'running',
          startedAt: new Date(),
          stats: { type: 'tier1_refresh' },
        })
        .returning({ id: pipelineRuns.id });
      const runId = inserted[0].id;

      const tier1Adapters = getAllTier1Adapters();
      let enqueued = 0;

      for (const adapter of tier1Adapters) {
        await collectQueue.add(
          'collect-tier1-refresh',
          {
            providerName: adapter.config.name,
            pipelineRunId: runId,
            isScheduled: true,
            isTier1Refresh: true,
            isTier1: true,
            isTier2: false,
            isTier3: false,
          },
          {
            jobId: `tier1-refresh-${adapter.config.name}-${Date.now()}`,
            // Per D-01: Tier 1 refresh jobs get highest priority (1)
            priority: 1,
          },
        );
        enqueued++;
      }

      console.log(`Tier 1 refresh: enqueued ${enqueued} collect jobs (runId: ${runId})`);
      return { tier1ProvidersEnqueued: enqueued, runId };
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

      // CR-03: Create pipeline run for observability
      const inserted = await db
        .insert(pipelineRuns)
        .values({
          status: 'running',
          startedAt: new Date(),
          stats: { type: 'tier2_refresh' },
        })
        .returning({ id: pipelineRuns.id });
      const runId = inserted[0].id;

      const tier2Adapters = getAllTier2Adapters();
      let enqueued = 0;

      for (const adapter of tier2Adapters) {
        await collectQueue.add(
          'collect-tier2-refresh',
          {
            providerName: adapter.config.name,
            pipelineRunId: runId,
            isScheduled: true,
            isTier2Refresh: true,
            isTier1: false,
            isTier2: true,
            isTier3: false,
          },
          {
            jobId: `tier2-refresh-${adapter.config.name}-${Date.now()}`,
            // Per D-01: Tier 2 refresh jobs get priority=2 (second highest)
            priority: 2,
          },
        );
        enqueued++;
      }

      console.log(`Tier 2 refresh: enqueued ${enqueued} collect jobs (runId: ${runId})`);
      return { tier2ProvidersEnqueued: enqueued, runId };
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
 * Check if today's daily pipeline has already run. If not, and it's past
 * 6:00 AM UTC, trigger it immediately. This covers the case where the
 * worker was down at 6 AM and missed the scheduled run.
 *
 * Logic:
 * 1. Query pipelineRuns for a completed run started today (UTC date).
 * 2. If none found and current time >= 06:05 UTC (5-min grace period),
 *    enqueue a one-off daily-pipeline job.
 *
 * The 5-minute grace period prevents a race condition where the worker
 * starts up at exactly 6:00 AM and both the cron job and this check
 * fire simultaneously.
 */
export async function checkAndRunMissedDailyPipeline(): Promise<void> {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const sixAmPlusGrace = new Date(todayUTC.getTime() + 6 * 60 * 60 * 1000 + 5 * 60 * 1000);

  // Only check if it's past 6:05 AM UTC
  if (now < sixAmPlusGrace) {
    console.log('Before 6:05 AM UTC — skipping missed-run check');
    return;
  }

  // Check if there's already a completed (or running) daily pipeline for today
  // Look at recent runs and filter by UTC date in JS for reliability
  const recentRuns = await db
    .select({ id: pipelineRuns.id, status: pipelineRuns.status, startedAt: pipelineRuns.startedAt })
    .from(pipelineRuns)
    .limit(5)
    .orderBy(desc(pipelineRuns.startedAt));

  const todayRun = recentRuns.find((run) => {
    if (!run.startedAt) return false;
    const runDate = new Date(run.startedAt);
    return (
      runDate.getUTCFullYear() === todayUTC.getUTCFullYear() &&
      runDate.getUTCMonth() === todayUTC.getUTCMonth() &&
      runDate.getUTCDate() === todayUTC.getUTCDate()
    );
  });

  if (todayRun) {
    console.log(`Daily pipeline already ran today (run ${todayRun.id}, status: ${todayRun.status}) — skipping catch-up`);
    return;
  }

  // No run today — trigger catch-up
  console.log('No daily pipeline run found for today — triggering catch-up run');
  const queue = new Queue('daily-pipeline', { connection: redisConnection });
  await queue.add('daily-catchup', {}, {
    removeOnComplete: { count: 5 },
    removeOnFail: { count: 10 },
  });
  await queue.close();
  console.log('Catch-up daily pipeline job enqueued');
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
