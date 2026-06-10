import 'dotenv/config';
import { createCollectWorker } from './workers/collect';
import { createExtractWorker } from './workers/extract';
import { createScoreWorker } from './workers/score';
import { createGenerateWorker } from './workers/generate';

/**
 * Worker process entry point.
 * Creates all 4 pipeline workers and keeps them alive.
 *
 * Per Pitfall 1: Workers stay alive as event-driven processes.
 * Do NOT call worker.close() in the main flow.
 *
 * Per D-11: Four distinct pipeline stages:
 * 1. collect: crawl provider page, store raw HTML
 * 2. extract: AI parses HTML into structured data
 * 3. score: assign confidence based on source tier
 * 4. generate: create daily article from extracted data
 */

// Create all workers
const collectWorker = createCollectWorker();
const extractWorker = createExtractWorker();
const scoreWorker = createScoreWorker();
const generateWorker = createGenerateWorker();

console.log('Pipeline workers started', {
  queues: ['collect', 'extract', 'score', 'generate'],
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
  ]);
  console.log('All workers closed');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
