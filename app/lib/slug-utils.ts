/**
 * Pure slug utilities with no database dependencies.
 * Safe to import in client components.
 *
 * Separated from slug.ts which imports the database module.
 */

/**
 * Generate a URL-safe slug from a model name and source ID.
 * Format: "normalized-model-name--sourceId"
 *
 * Examples:
 *   ("gpt-4o", 1) -> "gpt-4o--1"
 *   ("Claude 3.5 Sonnet", 2) -> "claude-3-5-sonnet--2"
 *   ("gemini-1.5-pro", 3) -> "gemini-1-5-pro--3"
 */
export function generateSlug(modelName: string, sourceId: number): string {
  const modelSlug = modelName
    .toLowerCase()
    .replace(/\./g, '-') // dots become hyphens (version numbers like 3.5 -> 3-5)
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
