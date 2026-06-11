import 'dotenv/config';
import { createCollectWorker } from './workers/collect';
import { createExtractWorker } from './workers/extract';
import { createScoreWorker } from './workers/score';
import { createGenerateWorker } from './workers/generate';
import { setupDailyScheduler, createDailyPipelineWorker } from './scheduler';

/**
 * Worker process entry point.
 * Creates all 5 pipeline workers and keeps them alive.
 *
 * Per Pitfall 1: Workers stay alive as event-driven processes.
 * Do NOT call worker.close() in the main flow.
 *
 * Per D-11: Four distinct pipeline stages:
 * 1. collect: crawl provider page, store raw HTML
 * 2. extract: AI parses HTML into structured data
 * 3. score: assign confidence based on source tier
 * 4. generate: create daily article from extracted data
 *
 * Plus the daily-pipeline worker that triggers the orchestrator
 * on a cron schedule.
 */

// Set up the daily repeatable job BEFORE creating workers
// This ensures the cron schedule is registered even if the worker
// process restarts (T-02-04-01: repeat.key prevents duplicates)
await setupDailyScheduler();

// Create all workers (5 total)
const collectWorker = createCollectWorker();
const extractWorker = createExtractWorker();
const scoreWorker = createScoreWorker();
const generateWorker = createGenerateWorker();
const dailyPipelineWorker = createDailyPipelineWorker();

console.log('Pipeline workers started', {
  queues: ['collect', 'extract', 'score', 'generate', 'daily-pipeline'],
  pid: process.pid,
});

/**
 * Graceful shutdown handler.
 * Closes all workers on SIGTERM or SIGINT.
 */
async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down workers...`);
  await Promise.all([
    collectWorker.close(),
    extractWorker.close(),
    scoreWorker.close(),
    generateWorker.close(),
    dailyPipelineWorker.close(),
  ]);
  console.log('All workers closed');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
