import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';
import { db } from '@/src/db/index';
import { sources } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const schema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const sourceId = parseInt(id, 10);
    if (isNaN(sourceId)) {
      return NextResponse.json({ error: 'Invalid source ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { isActive } = parsed.data;

    // Update source
    const updated = await db
      .update(sources)
      .set({ isActive: isActive ? 1 : 0, updatedAt: new Date() })
      .where(eq(sources.id, sourceId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      name: updated[0].name,
      isActive: updated[0].isActive === 1,
    });
  } catch (error) {
    console.error('Error updating source trust:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
