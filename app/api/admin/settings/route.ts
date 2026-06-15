import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';
import { db } from '@/src/db/index';
import { adminSettings } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await db.select().from(adminSettings);

    const settingsMap: Record<string, string> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    // Default auto_publish to true if not set
    if (!settingsMap.auto_publish) {
      settingsMap.auto_publish = 'true';
    }

    return NextResponse.json({ settings: settingsMap });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const updateSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { key, value } = parsed.data;

    // Upsert setting
    await db
      .insert(adminSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: adminSettings.key,
        set: { value, updatedAt: new Date() },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
