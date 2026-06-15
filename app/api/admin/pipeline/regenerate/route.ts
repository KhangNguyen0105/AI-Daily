import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';
import { generateQueue } from '@/src/pipeline/queues';
import { z } from 'zod';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

    const { date } = parsed.data;

    // Enqueue generate job with force flag
    await generateQueue.add(
      'generate',
      { date, force: true },
      { jobId: `regenerate-${date}-${Date.now()}` }
    );

    return NextResponse.json({
      success: true,
      message: `Article regeneration queued for ${date}`,
    });
  } catch (error) {
    console.error('Error queuing regeneration:', error);
    return NextResponse.json({ error: 'Regeneration failed to queue' }, { status: 500 });
  }
}
