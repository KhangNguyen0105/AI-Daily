import { getAllAdapters, getAllTier1Adapters, getAllTier2Adapters, getAllTier3Adapters, isTier1Provider, isTier2Provider, isTier3Provider } from '../providers/registry';
import { collectQueue } from './queues';
import { db } from '../db/index';
import { pipelineRuns } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

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
  attempted: number;
  succeeded: number;
  failed: number;
  tier1_succeeded: number;
  tier1_failed: number;
  tier2_succeeded: number;
  tier2_failed: number;
  tier3_succeeded: number;
  tier3_failed: number;
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
  const adapters = getAllAdapters();
  const tier1Adapters = getAllTier1Adapters();
  const tier2Adapters = getAllTier2Adapters();
  const tier3Adapters = getAllTier3Adapters();

  const initialStats: PipelineStats = {
    totalProviders: adapters.length,
    tier1ProvidersCount: tier1Adapters.length,
    tier2ProvidersCount: tier2Adapters.length,
    tier3ProvidersCount: tier3Adapters.length,
    attempted: 0,
    succeeded: 0,
    failed: 0,
    tier1_succeeded: 0,
    tier1_failed: 0,
    tier2_succeeded: 0,
    tier2_failed: 0,
    tier3_succeeded: 0,
    tier3_failed: 0,
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

  // Enqueue a collect job for each registered provider
  // Per D-01: Tier 1 providers get priority=3 (highest), Tier 2 priority=2, Tier 3 priority=1
  // BullMQ: lower number = higher priority
  for (const adapter of adapters) {
    const isT1 = isTier1Provider(adapter.config.name);
    const isT2 = isTier2Provider(adapter.config.name);
    const isT3 = isTier3Provider(adapter.config.name);

    const priority = isT1 ? 3 : isT2 ? 2 : isT3 ? 1 : 10;

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

  console.log(
    `Orchestrator: started pipeline run ${runId} with ${adapters.length} providers ` +
    `(${tier1Adapters.length} Tier 1, ${tier2Adapters.length} Tier 2, ${tier3Adapters.length} Tier 3)`,
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
  'tier3ProvidersCount', 'attempted', 'succeeded', 'failed',
  'tier1_succeeded', 'tier1_failed', 'tier2_succeeded', 'tier2_failed',
  'tier3_succeeded', 'tier3_failed', 'extractions', 'verifiedCount',
  'likelyCount', 'lowConfidenceCount',
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
  const nonNumericEntries = Object.entries(updates).filter(([, v]) => typeof v !== 'number');
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
