/**
 * Shared Redis connection configuration for BullMQ queues and workers.
 * Centralized to avoid duplication across 5 files.
 * WR-04: Uses validated env module for type-safe configuration.
 */
import { env } from '../lib/env';

export const redisConnection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};
