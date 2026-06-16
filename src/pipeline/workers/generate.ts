import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection';
import { db } from '../../db/index';
import { articles } from '../../db/schema';
import { computeDiff } from '../article-diff';
import { generateArticle } from '../article-generator';
import { finalizePipelineRun } from '../orchestrator';

/**
 * Job data for the generate queue.
 */
export interface GenerateJobData {
  extractionIds: number[];
  pipelineRunId?: number;
}

/**
 * Return data from the generate worker.
 */
export interface GenerateJobResult {
  articleId: number;
}

/**
 * Normalize a Date to UTC midnight (start of day).
 */
function toUTCMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Format a Date as 'YYYY-MM-DD' string in UTC.
 */
function formatDateUTC(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Create the generate worker for the fourth and final pipeline stage.
 *
 * Real implementation (Phase 6):
 * 1. Computes diff between today and yesterday extractions
 * 2. Generates article via Vercel AI SDK with provider fallback
 * 3. Upserts into articles table using date-based deduplication
 * 4. Sets publishedAt immediately (auto-publish per D-18)
 *
 * @returns BullMQ Worker instance for the 'generate' queue
 */
export function createGenerateWorker(): Worker<GenerateJobData, GenerateJobResult> {
  const worker = new Worker<GenerateJobData, GenerateJobResult>(
    'generate',
    async (job: Job<GenerateJobData>) => {
      // 1. Compute today's and yesterday's UTC dates
      const now = new Date();
      const today = toUTCMidnight(now);
      const yesterday = new Date(today);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);

      // 2. Compute diff context
      const diff = await computeDiff(today, yesterday);

      // 3. Generate article via AI
      const generated = await generateArticle(diff);

      // 4. Format today's date for the date column
      const todayStr = formatDateUTC(today);

      // 5. Upsert into articles table (D-20: one article per day)
      const inserted = await db
        .insert(articles)
        .values({
          date: todayStr,
          title: generated.title,
          summary: generated.summary,
          content: generated.content,
          publishedAt: new Date(), // D-18: auto-publish immediately
        })
        .onConflictDoUpdate({
          target: articles.date,
          set: {
            title: generated.title,
            summary: generated.summary,
            content: generated.content,
            publishedAt: new Date(),
            updatedAt: new Date(),
          },
        })
        .returning({ id: articles.id });

      const articleId = inserted[0].id;

      console.log(
        `Generate worker: Upserted article ${articleId} for ${todayStr} — "${generated.title}"`,
      );

      // CR-08: Finalize pipeline run (generate is the last stage)
      if (job.data.pipelineRunId) {
        await finalizePipelineRun(job.data.pipelineRunId, 'completed');
      }

      return { articleId };
    },
    { connection: redisConnection, concurrency: 1 },
  );

  // Per Pitfall 1: Error handler prevents silent crashes
  worker.on('error', (err) => {
    console.error('Generate worker error:', err);
  });

  worker.on('completed', (job) => {
    console.log(`Generate job ${job.id} completed: article ${job.returnvalue.articleId}`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`Generate job ${job?.id} failed:`, err.message);
    // CR-08: Finalize pipeline run as failed when generate stage fails
    if (job?.data?.pipelineRunId) {
      try {
        await finalizePipelineRun(job.data.pipelineRunId, 'failed');
      } catch (finalizeErr) {
        console.error('Generate worker: failed to finalize pipeline run:', finalizeErr);
      }
    }
  });

  return worker;
}
