import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';
import { db } from '@/src/db/index';
import { sources } from '@/src/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    let query = db.select().from(sources).$dynamic();

    // Apply filters - we'll build conditions
    const conditions = [];
    if (status === 'active') {
      conditions.push(eq(sources.isActive, 1));
    } else if (status === 'inactive') {
      conditions.push(eq(sources.isActive, 0));
    }
    if (type && type !== 'all') {
      conditions.push(eq(sources.providerType, type));
    }

    // Simple approach: fetch all and filter in memory for now
    // (Drizzle dynamic where is complex with optional conditions)
    const allSources = await db
      .select()
      .from(sources)
      .orderBy(asc(sources.name));

    let filtered = allSources;
    if (status === 'active') {
      filtered = filtered.filter((s) => s.isActive === 1);
    } else if (status === 'inactive') {
      filtered = filtered.filter((s) => s.isActive === 0);
    }
    if (type && type !== 'all') {
      filtered = filtered.filter((s) => s.providerType === type);
    }

    return NextResponse.json({ sources: filtered });
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
