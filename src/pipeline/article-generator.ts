import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { env } from '@/src/lib/env';
import type { DiffResult } from '@/src/pipeline/article-diff';

/**
 * Parsed article returned by generateArticle().
 * - title: article heading (from "# {title}" line)
 * - summary: one-line summary (max 150 chars, from "SUMMARY: ..." line)
 * - content: full Markdown body (everything after the title line)
 */
export interface GeneratedArticle {
  title: string;
  summary: string;
  content: string;
}

/**
 * MIMO provider client — created once at module level (I-02).
 * Uses OpenAI-compatible API with custom baseURL.
 * Uses .chat() method to force /chat/completions endpoint instead of /responses.
 */
const mimoProvider = createOpenAI({
  baseURL: env.MIMO_BASE_URL,
  apiKey: env.MIMO_API_KEY,
});

/**
 * Get the appropriate AI model object for a given provider name.
 * MIMO uses the OpenAI-compatible API with a custom baseURL.
 */
function getModel(provider: string) {
  switch (provider) {
    case 'anthropic':
      return anthropic('claude-sonnet-4-5');
    case 'openai':
      return openai('gpt-4o');
    case 'mimo':
      return mimoProvider.chat('mimo-v2.5-pro');
    default:
      return anthropic('claude-sonnet-4-5');
  }
}

/**
 * Build a compact context string from the DiffResult for the AI prompt.
 * Focuses on what changed (model names, prices, promotions) — not raw JSON.
 * Keeps the prompt under ~2K tokens.
 */
function buildDiffContext(diff: DiffResult): string {
  const parts: string[] = [];

  parts.push(`Total models tracked today: ${diff.totalModelsToday}`);

  if (diff.newModels.length > 0) {
    parts.push(`\nNew models (${diff.newModels.length}):`);
    for (const m of diff.newModels) {
      const price = m.inputPricePer1m != null
        ? `$${m.inputPricePer1m}/1M input, $${m.outputPricePer1m ?? '?'}/1M output`
        : 'pricing unknown';
      const ctx = m.contextWindow ? `, ${Math.round(m.contextWindow / 1000)}K context` : '';
      parts.push(`  - ${m.modelName}: ${price}${ctx} (source: ${m.sourceName})`);
    }
  }

  if (diff.priceChanges.length > 0) {
    parts.push(`\nPrice changes (${diff.priceChanges.length}):`);
    for (const c of diff.priceChanges) {
      const direction = c.changePercent > 0 ? 'increased' : 'decreased';
      parts.push(
        `  - ${c.modelName} ${c.field} price ${direction} ${Math.abs(c.changePercent).toFixed(1)}%: $${c.oldPrice} -> $${c.newPrice} per 1M tokens`,
      );
    }
  }

  if (diff.newPromotions.length > 0) {
    parts.push(`\nNew promotions (${diff.newPromotions.length}):`);
    for (const p of diff.newPromotions) {
      parts.push(`  - ${p.modelPattern} (${p.type}): ${p.description}`);
    }
  }

  if (
    diff.newModels.length === 0 &&
    diff.priceChanges.length === 0 &&
    diff.newPromotions.length === 0
  ) {
    parts.push('\nNo changes detected today. All models unchanged from yesterday.');
  }

  return parts.join('\n');
}

const SYSTEM_PROMPT = `You are an AI pricing analyst writing a daily digest for software developers.

Rules:
- Write in exactly 4 sections: "## Key Changes", "## Pricing Highlights", "## What to Watch"
- Precede the sections with a title line as "# {title}"
- Use neutral, factual tone. Example: "GPT-4o input price dropped 20% to $2.50/1M tokens"
- Keep the total article between 300-500 words
- Return ONLY the article content, no preamble or wrapping
- On the VERY FIRST line, output a one-line summary (max 150 characters) preceded by "SUMMARY: "
- On the SECOND line, output the article title as "# {title}"
- When no changes are detected, write a "no changes" article: "No pricing changes detected today. {N} models tracked." followed by brief context about what the system is monitoring`;

/**
 * Generate a daily AI pricing article from a DiffResult.
 *
 * Uses Vercel AI SDK generateText() with automatic provider fallback.
 * Parses the LLM response to extract title, summary, and content.
 *
 * @param diff - The diff result comparing today's extractions with yesterday's
 * @returns GeneratedArticle with title, summary, and Markdown content
 */
export async function generateArticle(diff: DiffResult): Promise<GeneratedArticle> {
  const primaryProvider = env.AI_PROVIDER;
  const fallbackProvider = env.AI_FALLBACK_PROVIDER;

  const diffContext = buildDiffContext(diff);

  const userPrompt = `Here is today's AI pricing diff context:\n\n${diffContext}\n\nGenerate the daily digest article.`;

  const callOptions = {
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.3,
    maxOutputTokens: 1024,
  };

  let responseText: string;

  try {
    const result = await generateText({
      model: getModel(primaryProvider),
      ...callOptions,
    });
    responseText = result.text;
  } catch (primaryErr) {
    console.warn(
      `Primary AI provider (${primaryProvider}) failed, trying fallback (${fallbackProvider}):`,
      primaryErr,
    );
    const result = await generateText({
      model: getModel(fallbackProvider),
      ...callOptions,
    });
    responseText = result.text;
  }

  return parseArticleResponse(responseText);
}

/**
 * Parse the LLM response text to extract title, summary, and content.
 *
 * Expected format:
 *   SUMMARY: <one-line summary>
 *   # <title>
 *   <markdown content>
 *
 * Falls back to heuristic extraction if delimiters are not found.
 */
function parseArticleResponse(text: string): GeneratedArticle {
  const lines = text.split('\n');
  let summary = '';
  let title = '';
  let contentStart = 0;

  // Try to parse SUMMARY: delimiter on the first non-empty line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    if (line.startsWith('SUMMARY:')) {
      summary = line.substring('SUMMARY:'.length).trim();
      // Next non-empty line should be the title
      for (let j = i + 1; j < lines.length; j++) {
        const titleLine = lines[j].trim();
        if (titleLine === '') continue;
        if (titleLine.startsWith('# ')) {
          title = titleLine.substring(2).trim();
          contentStart = j + 1;
        }
        break;
      }
      break;
    } else if (line.startsWith('# ')) {
      // No SUMMARY delimiter, but found a title
      title = line.substring(2).trim();
      contentStart = i + 1;
      break;
    } else {
      // No recognized delimiter — fallback
      title = 'AI Daily Digest';
      const truncated = text.substring(0, 150);
      const lastSpace = truncated.lastIndexOf(' ');
      summary = (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated).trim();
      return { title, summary, content: text };
    }
  }

  // Extract content (everything after the title line)
  const content = lines.slice(contentStart).join('\n').trim();

  // Fallback if parsing didn't produce results
  if (!title) {
    title = 'AI Daily Digest';
  }
  if (!summary) {
    const truncated = content.substring(0, 150);
    const lastSpace = truncated.lastIndexOf(' ');
    summary = (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated).trim();
  }

  return { title, summary, content };
}
