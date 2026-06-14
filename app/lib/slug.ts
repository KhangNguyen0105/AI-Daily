import { db } from '@/src/db/index';
import { extractions } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { parseSlug, generateSlug } from '@/app/lib/slug-utils';

// Re-export pure utilities so existing imports from '@/app/lib/slug' still work
export { generateSlug, parseSlug } from '@/app/lib/slug-utils';

/**
 * Resolve a slug back to model name + source ID.
 * Parses the sourceId from the slug, queries extractions for that source,
 * then matches by regenerating slugs.
 *
 * Returns null if slug is invalid, DB is unavailable, or no match found.
 */
export async function resolveSlug(slug: string): Promise<{
  modelName: string;
  sourceId: number;
} | null> {
  const parsed = parseSlug(slug);
  if (!parsed) return null;

  try {
    const rows = await db
      .select({
        modelName: extractions.modelName,
        sourceId: extractions.sourceId,
      })
      .from(extractions)
      .where(eq(extractions.sourceId, parsed.sourceId))
      .groupBy(extractions.modelName, extractions.sourceId);

    for (const row of rows) {
      if (generateSlug(row.modelName, row.sourceId) === slug) {
        return { modelName: row.modelName, sourceId: row.sourceId };
      }
    }
  } catch {
    // DB unavailable — return null
  }

  return null;
}
