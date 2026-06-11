import { getAllAdapters } from '../providers/registry';
import { collectQueue } from './queues';
import { db } from '../db/index';
import { pipelineRuns } from '../db/schema';
import { eq } from 'drizzle-orm';

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
 * @param pipelineRunId - The pipeline run to update
 * @param updates - Partial stats to merge into the existing stats
 */
export async function updatePipelineStats(
  pipelineRunId: number,
  updates: Partial<PipelineStats>,
): Promise<void> {
  const rows = await db
    .select()
    .from(pipelineRuns)
    .where(eq(pipelineRuns.id, pipelineRunId))
    .limit(1);

  if (rows.length === 0) {
    throw new Error(`Pipeline run not found: ${pipelineRunId}`);
  }

  const currentStats = (rows[0].stats as PipelineStats) ?? ({} as PipelineStats);

  // Additive merge: numeric fields are treated as deltas (increment by value),
  // non-numeric fields are replaced. This allows workers to pass
  // { attempted: 1, succeeded: 1 } and have counts accumulate correctly.
  const merged = { ...currentStats } as Record<string, unknown>;
  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === 'number' && typeof merged[key] === 'number') {
      merged[key] = (merged[key] as number) + value;
    } else {
      merged[key] = value;
    }
  }

  await db
    .update(pipelineRuns)
    .set({ stats: merged as unknown as PipelineStats, updatedAt: new Date() })
    .where(eq(pipelineRuns.id, pipelineRunId));
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
