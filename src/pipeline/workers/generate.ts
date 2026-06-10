import { Worker, Job } from 'bullmq';
import { db } from '../../db/index';
import { articles } from '../../db/schema';

/**
 * Job data for the generate queue.
 */
export interface GenerateJobData {
  extractionIds: number[];
}

/**
 * Return data from the generate worker.
 */
export interface GenerateJobResult {
  articleId: number;
}

/**
 * Redis connection configuration.
 */
const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
};

/**
 * Create the generate worker for the fourth and final pipeline stage.
 * Per Pitfall 1: Error handler prevents silent crashes.
 *
 * Phase 1: Creates a placeholder article.
 * Phase 2 adds real article generation using Vercel AI SDK.
 *
 * @returns BullMQ Worker instance for the 'generate' queue
 */
export function createGenerateWorker(): Worker<GenerateJobData, GenerateJobResult> {
  const worker = new Worker<GenerateJobData, GenerateJobResult>(
    'generate',
    async (job: Job<GenerateJobData>) => {
      const { extractionIds } = job.data;

      // Phase 1: Create a placeholder article
      // Phase 2 will generate real articles using Vercel AI SDK
      const today = new Date().toISOString().split('T')[0];
      const title = `AI Daily - ${today}`;
      const content = `Pipeline completed. ${extractionIds.length} models extracted.`;

      const inserted = await db
        .insert(articles)
        .values({
          title,
          content,
          publishedAt: null, // Not auto-published in Phase 1
        })
        .returning({ id: articles.id });

      const articleId = inserted[0].id;

      console.log(`Generate worker: Created placeholder article ${articleId} with ${extractionIds.length} extractions`);

      return { articleId };
    },
    { connection, concurrency: 1 }
  );

  // Per Pitfall 1: Error handler prevents silent crashes
  worker.on('error', (err) => {
    console.error('Generate worker error:', err);
  });

  worker.on('completed', (job) => {
    console.log(`Generate job ${job.id} completed: article ${job.returnValue.articleId}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Generate job ${job?.id} failed:`, err.message);
  });

  return worker;
}
