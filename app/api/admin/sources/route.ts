import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';
import { db } from '@/src/db/index';
import { sources } from '@/src/db/schema';
import { eq, asc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    // WR-02 fix: Build conditions and apply at database level
    const conditions = [];
    if (status === 'active') {
      conditions.push(eq(sources.isActive, 1));
    } else if (status === 'inactive') {
      conditions.push(eq(sources.isActive, 0));
    }
    if (type && type !== 'all') {
      conditions.push(eq(sources.providerType, type));
    }

    const filteredSources = await db
      .select()
      .from(sources)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(sources.name));

    return NextResponse.json({ sources: filteredSources });
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
