import { Worker, Job } from 'bullmq';
import { generateQueue } from '../queues';

/**
 * Job data for the score queue.
 */
export interface ScoreJobData {
  extractionIds: number[];
}

/**
 * Return data from the score worker.
 */
export interface ScoreJobResult {
  scored: number;
}

/**
 * Redis connection configuration.
 */
const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
};

/**
 * Create the score worker for the third pipeline stage.
 * Per D-10: Worker chains to generate stage on completion.
 * Per Pitfall 1: Error handler prevents silent crashes.
 *
 * Phase 1: This is a pass-through. Confidence was already set during extraction.
 * Phase 2 adds real confidence scoring based on source tier and extraction completeness.
 *
 * @returns BullMQ Worker instance for the 'score' queue
 */
export function createScoreWorker(): Worker<ScoreJobData, ScoreJobResult> {
  const worker = new Worker<ScoreJobData, ScoreJobResult>(
    'score',
    async (job: Job<ScoreJobData>) => {
      const { extractionIds } = job.data;

      // Phase 1: Pass-through scoring
      // Confidence was already set during extraction (D-06)
      // Phase 2 will add real scoring based on source tier and extraction completeness
      console.log(`Score worker: ${extractionIds.length} extractions scored (pass-through)`);

      // Chain to generate stage (D-10: worker-triggered chaining)
      await generateQueue.add('generate', {
        extractionIds,
      });

      return { scored: extractionIds.length };
    },
    { connection, concurrency: 1 }
  );

  // Per Pitfall 1: Error handler prevents silent crashes
  worker.on('error', (err) => {
    console.error('Score worker error:', err);
  });

  worker.on('completed', (job) => {
    console.log(`Score job ${job.id} completed: ${job.returnValue.scored} extractions scored`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Score job ${job?.id} failed:`, err.message);
  });

  return worker;
}
