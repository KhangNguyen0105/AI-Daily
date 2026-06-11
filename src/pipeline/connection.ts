/**
 * Shared Redis connection configuration for BullMQ queues and workers.
 * Centralized to avoid duplication across 5 files (WR-04).
 * Includes radix 10 for parseInt (WR-06).
 */
export const redisConnection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
};
