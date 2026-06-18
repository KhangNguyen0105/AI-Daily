import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';
import { db } from '@/src/db/index';
import { pipelineRuns } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

const MAX_PIPELINE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // CR-03 fix: Check if a pipeline run is already in progress
    const runningPipelines = await db
      .select({ id: pipelineRuns.id })
      .from(pipelineRuns)
      .where(eq(pipelineRuns.status, 'running'))
      .limit(1);

    if (runningPipelines.length > 0) {
      return NextResponse.json(
        { error: 'A pipeline run is already in progress' },
        { status: 409 },
      );
    }

    const { orchestrateDailyRun, finalizePipelineRun } = await import('@/src/pipeline/orchestrator');
    const { collectQueue, extractQueue, scoreQueue, generateQueue } = await import('@/src/pipeline/queues');

    // Check if any workers are connected to the collect queue
    const workers = await collectQueue.getWorkers();
    if (workers.length === 0) {
      return NextResponse.json(
        {
          error: 'No pipeline workers are running. Start the worker process first: pnpm dev:worker',
        },
        { status: 503 },
      );
    }

    const pipelineRunId = await orchestrateDailyRun();

    // Background task to mark pipeline as completed when queues are empty
    // CR-01 fix: Add maximum duration timeout to prevent infinite loop
    // CR-04 fix: Track finalize failures and give up after limit
    (async () => {
      const deadline = Date.now() + MAX_PIPELINE_DURATION_MS;
      // Wait 10 seconds for initial jobs to enqueue and start processing
      await new Promise(r => setTimeout(r, 10000));

      let emptyCount = 0;
      let finalizeAttempts = 0;
      const MAX_FINALIZE_ATTEMPTS = 3;

      while (Date.now() < deadline) {
        try {
          const c = await collectQueue.getJobCounts('wait', 'active', 'delayed');
          const e = await extractQueue.getJobCounts('wait', 'active', 'delayed');
          const s = await scoreQueue.getJobCounts('wait', 'active', 'delayed');
          const g = await generateQueue.getJobCounts('wait', 'active', 'delayed');

          const totalPending = c.wait + c.active + c.delayed +
                               e.wait + e.active + e.delayed +
                               s.wait + s.active + s.delayed +
                               g.wait + g.active + g.delayed;

          if (totalPending === 0) {
            emptyCount++;
            // Require it to be empty for 2 consecutive checks (10 seconds) to ensure no chaining delays
            if (emptyCount >= 2) {
              try {
                await finalizePipelineRun(pipelineRunId, 'completed');
                return;
              } catch (finalizeErr) {
                finalizeAttempts++;
                console.error(`Finalize attempt ${finalizeAttempts} failed:`, finalizeErr);
                if (finalizeAttempts >= MAX_FINALIZE_ATTEMPTS) {
                  return; // Exit loop, pipeline stays running (manual cleanup needed)
                }
              }
            }
          } else {
            emptyCount = 0;
          }
        } catch (err) {
          console.error('Error checking queue status:', err);
        }
        await new Promise(r => setTimeout(r, 5000));
      }

      // CR-01 fix: Timed out — mark as failed
      try {
        await finalizePipelineRun(pipelineRunId, 'failed');
      } catch (err) {
        console.error('Failed to finalize timed-out pipeline:', err);
      }
    })();

    return NextResponse.json({
      success: true,
      message: `Full pipeline run started (ID: ${pipelineRunId})`,
      pipelineRunId,
    });
  } catch (error) {
    console.error('Error starting full pipeline:', error);
    return NextResponse.json({ error: 'Failed to start full pipeline run' }, { status: 500 });
  }
}
