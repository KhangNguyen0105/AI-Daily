import { NextResponse } from 'next/server';
import { auth } from '@/src/auth';
import { db } from '@/src/db/index';
import { pipelineRuns } from '@/src/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const runs = await db
      .select()
      .from(pipelineRuns)
      .orderBy(desc(pipelineRuns.startedAt))
      .limit(50);

    return NextResponse.json({ runs });
  } catch (error) {
    console.error('Error fetching pipeline runs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
