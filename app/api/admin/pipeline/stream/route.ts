import { NextRequest } from 'next/server';
import { auth } from '@/src/auth';
import { db } from '@/src/db/index';
import { pipelineRuns } from '@/src/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  let isClosed = false;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 10;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection keep-alive to flush headers
      controller.enqueue(new TextEncoder().encode(': keep-alive\n\n'));

      // WR-01 fix: Poll every 5 seconds (pipeline events are infrequent)
      const interval = setInterval(async () => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }

        try {
          const runsData = await db
            .select()
            .from(pipelineRuns)
            .orderBy(desc(pipelineRuns.startedAt))
            .limit(20);

          const dataString = JSON.stringify(runsData);
          controller.enqueue(new TextEncoder().encode(`data: ${dataString}\n\n`));
          consecutiveErrors = 0;
        } catch (error) {
          consecutiveErrors++;
          console.error('SSE Error:', error);
          // WR-05 fix: Stop polling after too many consecutive errors
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            isClosed = true;
            clearInterval(interval);
            try { controller.close(); } catch {}
          }
        }
      }, 5000);

      request.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(interval);
      });
    },
    cancel() {
      isClosed = true;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
