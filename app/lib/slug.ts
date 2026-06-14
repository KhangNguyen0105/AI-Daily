import { db } from '@/src/db/index';
import { extractions } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Generate a URL-safe slug from a model name and source ID.
 * Format: "normalized-model-name--sourceId"
 *
 * Examples:
 *   ("gpt-4o", 1) -> "gpt-4o--1"
 *   ("Claude 3.5 Sonnet", 2) -> "claude-35-sonnet--2"
 *   ("gemini-1.5-pro", 3) -> "gemini-15-pro--3"
 */
export function generateSlug(modelName: string, sourceId: number): string {
  const modelSlug = modelName
    .toLowerCase()
    .replace(/\./g, '') // strip dots (version numbers like 3.5 -> 35)
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric to hyphens
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens

  return `${modelSlug}--${sourceId}`;
}

/**
 * Parse a slug to extract the sourceId.
 * Returns null if the slug is invalid (no '--' separator or non-numeric sourceId).
 * Does NOT query the database — use resolveSlug for full resolution.
 */
export function parseSlug(slug: string): { sourceId: number } | null {
  const lastDoubleDash = slug.lastIndexOf('--');
  if (lastDoubleDash === -1) return null;

  const sourceIdStr = slug.slice(lastDoubleDash + 2);
  const sourceId = parseInt(sourceIdStr, 10);
  if (isNaN(sourceId)) return null;

  return { sourceId };
}

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
