import { Queue } from 'bullmq';

/**
 * Redis connection configuration for BullMQ queues.
 * Uses environment variables with localhost defaults for development.
 */
const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
};

/**
 * Create a BullMQ queue with standard configuration.
 * Per D-09: Separate queues per pipeline stage.
 * Per D-12: Exponential backoff with max 3 retries.
 *
 * @param name - Queue name matching the pipeline stage
 * @returns Configured BullMQ Queue instance
 */
export function createQueue(name: string): Queue {
  return new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });
}

/**
 * Pipeline stage queues (D-09, D-11).
 * Each stage has its own queue for independent scaling and monitoring.
 */
export const collectQueue = createQueue('collect');
export const extractQueue = createQueue('extract');
export const scoreQueue = createQueue('score');
export const generateQueue = createQueue('generate');
