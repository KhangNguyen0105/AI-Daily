import { Queue, Worker } from 'bullmq';
import { redisConnection } from './connection';
import { orchestrateDailyRun } from './orchestrator';

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
