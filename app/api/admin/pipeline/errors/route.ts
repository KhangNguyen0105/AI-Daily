import { NextResponse } from 'next/server';
import { auth } from '@/src/auth';
import { db } from '@/src/db/index';
import { pipelineRuns } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const errors = await db
      .select()
      .from(pipelineRuns)
      .where(eq(pipelineRuns.status, 'failed'))
      .orderBy(desc(pipelineRuns.startedAt))
      .limit(20);

    return NextResponse.json({ errors });
  } catch (error) {
    console.error('Error fetching pipeline errors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
