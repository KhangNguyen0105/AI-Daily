import { getAllAdapters } from '../providers/registry';
import { collectQueue } from './queues';
import { db } from '../db/index';
import { pipelineRuns } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Pipeline run statistics tracked across all stages.
 * Stored as JSONB in pipelineRuns.stats.
 */
export interface PipelineStats {
  totalProviders: number;
  attempted: number;
  succeeded: number;
  failed: number;
  extractions: number;
  verifiedCount: number;
  likelyCount: number;
  lowConfidenceCount: number;
}

/**
 * Create a new pipeline run record and enqueue collect jobs for all
 * registered providers.
 *
 * @returns The ID of the newly created pipeline run
 */
export async function orchestrateDailyRun(): Promise<number> {
  const adapters = getAllAdapters();

  const initialStats: PipelineStats = {
    totalProviders: adapters.length,
    attempted: 0,
    succeeded: 0,
    failed: 0,
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
  for (const adapter of adapters) {
    await collectQueue.add(
      'collect',
      {
        providerName: adapter.config.name,
        pipelineRunId: runId,
      },
      {
        jobId: `collect-${adapter.config.name}-${Date.now()}`,
      },
    );
  }

  console.log(
    `Orchestrator: started pipeline run ${runId} with ${adapters.length} providers`,
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
export async function updatePipelineStats(
  pipelineRunId: number,
  updates: Partial<PipelineStats>,
): Promise<void> {
  // Process numeric fields with atomic increments using jsonb_set
  // This is safe under concurrent workers because each UPDATE is atomic
  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === 'number') {
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
