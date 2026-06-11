import { z } from 'zod';

/**
 * Validated environment variables.
 * CR-05: OPENAI_API_KEY is required (it is the extraction model for ALL providers).
 * WR-04: Removed unused ANTHROPIC_API_KEY, GOOGLE_API_KEY, MISTRAL_API_KEY
 * until they are actually used by provider-specific extraction.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required for extraction'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export const env = envSchema.parse(process.env);
