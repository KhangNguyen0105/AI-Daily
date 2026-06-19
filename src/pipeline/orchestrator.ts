import { getAllAdapters, getAllTier1Adapters, getAllTier2Adapters, getAllTier3Adapters, isTier1Provider, isTier2Provider, isTier3Provider } from '../providers/registry';
import { getAllConsumerAdapters, isConsumerTier1Provider, isConsumerTier2Provider, mirrorToMainRegistry } from '../providers/consumer/registry';
import { collectQueue } from './queues';
import { db } from '../db/index';
import { pipelineRuns } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

// Module-level singleton flag for consumer adapter mirroring (WR-01: was function-local, always false)
let consumerMirrored = false;

/**
 * Pipeline run statistics tracked across all stages.
 * Stored as JSONB in pipelineRuns.stats.
 *
 * Per Wave 4: Added Tier 1-specific stats for tracking tier1_succeeded/tier1_failed.
 */
export interface PipelineStats {
  totalProviders: number;
  tier1ProvidersCount: number;
  tier2ProvidersCount: number;
  tier3ProvidersCount: number;
  consumerProvidersCount: number;
  attempted: number;
  succeeded: number;
  failed: number;
  tier1_succeeded: number;
  tier1_failed: number;
  tier2_succeeded: number;
  tier2_failed: number;
  tier3_succeeded: number;
  tier3_failed: number;
  consumerSuccesses: number;
  consumerFailures: number;
  extractions: number;
  verifiedCount: number;
  likelyCount: number;
  lowConfidenceCount: number;
}

/**
 * Create a new pipeline run record and enqueue collect jobs for all
 * registered providers.
 *
 * Per D-01: Tier 1 providers get priority=1 (high priority) in the collect queue.
 * Per Wave 4: Tracks tier1ProvidersCount, tier1_succeeded, tier1_failed stats.
 *
 * @returns The ID of the newly created pipeline run
 */
export async function orchestrateDailyRun(): Promise<number> {
  // Mirror consumer adapters into main registry (lazy init to avoid circular deps)
  if (!consumerMirrored) {
    await mirrorToMainRegistry();
    consumerMirrored = true;
  }

  const adapters = getAllAdapters();
  const tier1Adapters = getAllTier1Adapters();
  const tier2Adapters = getAllTier2Adapters();
  const tier3Adapters = getAllTier3Adapters();
  const consumerAdapters = getAllConsumerAdapters();

  const initialStats: PipelineStats = {
    totalProviders: adapters.length,
    tier1ProvidersCount: tier1Adapters.length,
    tier2ProvidersCount: tier2Adapters.length,
    tier3ProvidersCount: tier3Adapters.length,
    consumerProvidersCount: consumerAdapters.length,
    attempted: 0,
    succeeded: 0,
    failed: 0,
    tier1_succeeded: 0,
    tier1_failed: 0,
    tier2_succeeded: 0,
    tier2_failed: 0,
    tier3_succeeded: 0,
    tier3_failed: 0,
    consumerSuccesses: 0,
    consumerFailures: 0,
    extractions: 0,
    verifiedCount: 0,
    likelyCount: 0,
    lowConfidenceCount: 0,
  };

  // Create pipeline run record
  const inserted = await db
    .insert(pipelineRuns)
    .values({
      status: 'running',
      startedAt: new Date(),
      stats: initialStats,
    })
    .returning({ id: pipelineRuns.id });

  const runId = inserted[0].id;

  // Enqueue a collect job for each registered API provider
  // Per D-01: Tier 1 providers get highest priority
  // BullMQ: lower number = higher priority (1 is highest)
  for (const adapter of adapters) {
    const isT1 = isTier1Provider(adapter.config.name);
    const isT2 = isTier2Provider(adapter.config.name);
    const isT3 = isTier3Provider(adapter.config.name);

    const priority = isT1 ? 1 : isT2 ? 2 : isT3 ? 3 : 10;

    await collectQueue.add(
      'collect',
      {
        providerName: adapter.config.name,
        pipelineRunId: runId,
        isTier1: isT1,
        isTier2: isT2,
        isTier3: isT3,
      },
      {
        jobId: `collect-${adapter.config.name}-${Date.now()}`,
        priority,
      },
    );
  }

  // Phase 10: Enqueue collect jobs for consumer adapters with failure isolation
  // Review #6: One adapter enqueue failure does not fail the whole run
  let consumerFailures = 0;
  for (const adapter of consumerAdapters) {
    try {
      const isT1 = isConsumerTier1Provider(adapter.config.name);
      const isT2 = isConsumerTier2Provider(adapter.config.name);
      const priority = isT1 ? 5 : isT2 ? 6 : 10;

      await collectQueue.add(
        'collect',
        {
          providerName: adapter.config.name,
          pipelineRunId: runId,
          isTier1: false,
          isTier2: false,
          isTier3: false,
        },
        {
          jobId: `collect-${adapter.config.name}-${Date.now()}`,
          priority,
        },
      );
    } catch (error) {
      // Review #6: Failure isolation — one adapter enqueue failure does not fail the whole run
      console.error(`Failed to enqueue consumer adapter ${adapter.config.name}:`, error);
      consumerFailures++;
    }
  }

  console.log(
    `Orchestrator: started pipeline run ${runId} with ${adapters.length} API providers ` +
    `(${tier1Adapters.length} Tier 1, ${tier2Adapters.length} Tier 2, ${tier3Adapters.length} Tier 3) ` +
    `+${consumerAdapters.length} consumer adapters (${consumerFailures} enqueue failures)`,
  );

  return runId;
}

/**
 * Merge partial stats updates into an existing pipeline run's stats.
 *
 * WR-06: Uses per-field atomic JSONB updates to avoid TOCTOU race condition.
 * Each numeric field is incremented in its own atomic jsonb_set operation,
 * preventing lost updates when multiple workers call this concurrently.
 *
 * @param pipelineRunId - The pipeline run to update
 * @param updates - Partial stats to merge. Numeric values are treated as deltas
 *                  (increment by value), non-numeric values are replaced.
 */
// CR-07: Allowlist of valid stats keys to prevent JSONB path injection
const VALID_STATS_KEYS = new Set([
  'totalProviders', 'tier1ProvidersCount', 'tier2ProvidersCount',
  'tier3ProvidersCount', 'consumerProvidersCount', 'attempted', 'succeeded', 'failed',
  'tier1_succeeded', 'tier1_failed', 'tier2_succeeded', 'tier2_failed',
  'tier3_succeeded', 'tier3_failed', 'consumerSuccesses', 'consumerFailures',
  'extractions', 'verifiedCount', 'likelyCount', 'lowConfidenceCount',
]);

export async function updatePipelineStats(
  pipelineRunId: number,
  updates: Partial<PipelineStats>,
): Promise<void> {
  // Process numeric fields with atomic increments using jsonb_set
  // This is safe under concurrent workers because each UPDATE is atomic
  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === 'number') {
      // CR-07: Validate key against allowlist before interpolation
      if (!VALID_STATS_KEYS.has(key)) {
        console.warn(`updatePipelineStats: ignoring unknown key "${key}"`);
        continue;
      }
      await db
        .update(pipelineRuns)
        .set({
          stats: sql`jsonb_set(
            COALESCE(${pipelineRuns.stats}, '{}'::jsonb),
            ${`{"${key}"}`},
            to_jsonb(COALESCE((${pipelineRuns.stats} ->> ${key})::int, 0) + ${value})
          )`,
          updatedAt: new Date(),
        })
        .where(eq(pipelineRuns.id, pipelineRunId));
    }
  }

  // Process non-numeric fields with simple merge
  // IN-02: Validate non-numeric keys against the same allowlist as numeric fields
  const nonNumericEntries = Object.entries(updates).filter(([k, v]) => {
    if (typeof v === 'number') return false;
    if (!VALID_STATS_KEYS.has(k)) {
      console.warn(`updatePipelineStats: ignoring unknown non-numeric key "${k}"`);
      return false;
    }
    return true;
  });
  if (nonNumericEntries.length > 0) {
    const mergeObj = Object.fromEntries(nonNumericEntries);
    await db
      .update(pipelineRuns)
      .set({
        stats: sql`COALESCE(${pipelineRuns.stats}, '{}'::jsonb) || ${JSON.stringify(mergeObj)}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(pipelineRuns.id, pipelineRunId));
  }
}

/**
 * Mark a pipeline run as completed or failed.
 *
 * @param pipelineRunId - The pipeline run to finalize
 * @param status - Terminal status: 'completed' or 'failed'
 */
export async function finalizePipelineRun(
  pipelineRunId: number,
  status: 'completed' | 'failed',
): Promise<void> {
  await db
    .update(pipelineRuns)
    .set({
      status,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pipelineRuns.id, pipelineRunId));
}
