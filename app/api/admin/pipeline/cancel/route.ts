import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';
import { db } from '@/src/db/index';
import { pipelineRuns } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // CR-05 fix: Validate id type
    const body = await request.json();
    const id = Number(body.id);
    if (!id || isNaN(id) || !Number.isInteger(id)) {
      return NextResponse.json({ error: 'Invalid pipeline run ID' }, { status: 400 });
    }

    // CR-05 fix: Check that the run exists and is in running state
    const [run] = await db.select().from(pipelineRuns).where(eq(pipelineRuns.id, id)).limit(1);
    if (!run) {
      return NextResponse.json({ error: 'Pipeline run not found' }, { status: 404 });
    }
    if (run.status !== 'running') {
      return NextResponse.json({ error: 'Pipeline run is not in running state' }, { status: 409 });
    }

    // CR-02 fix: Remove active BullMQ jobs for this pipeline run
    const { collectQueue, extractQueue, scoreQueue, generateQueue } = await import('@/src/pipeline/queues');
    const queues = [collectQueue, extractQueue, scoreQueue, generateQueue];
    for (const queue of queues) {
      const jobs = await queue.getJobs(['active', 'waiting', 'delayed']);
      for (const job of jobs) {
        if (job.data?.pipelineRunId === id) {
          await job.remove();
        }
      }
    }

    await db.update(pipelineRuns)
      .set({ status: 'failed', completedAt: new Date() })
      .where(eq(pipelineRuns.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling pipeline:', error);
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }
}
