import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';
import { db } from '@/src/db/index';
import { sources } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { collectQueue } from '@/src/pipeline/queues';
import { z } from 'zod';

const schema = z.object({
  providerName: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { providerName } = parsed.data;

    // Verify provider exists
    const source = await db
      .select()
      .from(sources)
      .where(eq(sources.name, providerName))
      .limit(1);

    if (source.length === 0) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Check if any workers are connected
    const workers = await collectQueue.getWorkers();
    if (workers.length === 0) {
      return NextResponse.json(
        { error: 'No pipeline workers are running. Start the worker process first: pnpm dev:worker' },
        { status: 503 },
      );
    }

    // Enqueue collect job
    await collectQueue.add(
      'collect',
      { providerName, pipelineRunId: null },
      { jobId: `re-crawl-${providerName}-${Date.now()}` }
    );

    return NextResponse.json({
      success: true,
      message: `Re-crawl job queued for ${providerName}`,
    });
  } catch (error) {
    console.error('Error queuing re-crawl:', error);
    return NextResponse.json({ error: 'Re-crawl failed to queue' }, { status: 500 });
  }
}
