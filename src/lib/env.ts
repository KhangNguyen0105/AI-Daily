import { z } from 'zod';

/**
 * Validated environment variables.
 * CR-05: OPENAI_API_KEY is validated at runtime in score worker (fail-fast).
 * DATABASE_URL is validated at runtime by src/db/index.ts (lazy).
 * Both are optional here to allow tests and build steps without env vars.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  MIMO_API_KEY: z.string().optional(),
  MIMO_BASE_URL: z.string().default('https://token-plan-sgp.xiaomimimo.com/v1'),
  MIMO_MODEL: z.string().default('mimo-v2.5-pro'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  AI_PROVIDER: z.enum(['anthropic', 'openai', 'mimo']).default('anthropic'),
  AI_FALLBACK_PROVIDER: z.enum(['anthropic', 'openai', 'mimo']).default('openai'),
});

export const env = envSchema.parse(process.env);
