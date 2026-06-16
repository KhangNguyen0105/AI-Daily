import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { orchestrateDailyRun, finalizePipelineRun } = await import('@/src/pipeline/orchestrator');
    const { collectQueue, extractQueue, scoreQueue, generateQueue } = await import('@/src/pipeline/queues');
    
    const pipelineRunId = await orchestrateDailyRun();
    
    // Background task to mark pipeline as completed when queues are empty
    (async () => {
      // Wait 10 seconds for initial jobs to enqueue and start processing
      await new Promise(r => setTimeout(r, 10000));
      
      let emptyCount = 0;
      while (true) {
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
              await finalizePipelineRun(pipelineRunId, 'completed');
              break;
            }
          } else {
            emptyCount = 0;
          }
        } catch (err) {
          console.error('Error checking queue status:', err);
        }
        await new Promise(r => setTimeout(r, 5000));
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
