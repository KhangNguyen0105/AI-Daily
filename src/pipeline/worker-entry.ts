import 'dotenv/config';
import { createCollectWorker } from './workers/collect';
import { createExtractWorker } from './workers/extract';
import { createScoreWorker } from './workers/score';
import { createGenerateWorker } from './workers/generate';
import {
  setupDailyScheduler,
  setupTier1Scheduler,
  createDailyPipelineWorker,
  createTier1RefreshWorker,
} from './scheduler';

/**
 * Worker process entry point.
 * Creates all 6 pipeline workers and keeps them alive.
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
 * on a cron schedule, and the tier1-refresh worker for 4-hour
 * Tier 1 provider refresh (Per D-03).
 */

// Set up the daily repeatable job BEFORE creating workers
// This ensures the cron schedule is registered even if the worker
// process restarts (T-02-04-01: repeat.key prevents duplicates)
await setupDailyScheduler();

// Per D-03: Set up Tier 1 refresh scheduler (every 4 hours)
await setupTier1Scheduler();

// Create all workers (6 total — added tier1-refresh worker)
const collectWorker = createCollectWorker();
const extractWorker = createExtractWorker();
const scoreWorker = createScoreWorker();
const generateWorker = createGenerateWorker();
const dailyPipelineWorker = createDailyPipelineWorker();
const tier1RefreshWorker = createTier1RefreshWorker();

console.log('Pipeline workers started', {
  queues: ['collect', 'extract', 'score', 'generate', 'daily-pipeline', 'tier1-refresh'],
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
    tier1RefreshWorker.close(),
  ]);
  console.log('All workers closed');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
