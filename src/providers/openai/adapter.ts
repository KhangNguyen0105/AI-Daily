import { PlaywrightCrawler } from 'crawlee';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { ProviderAdapter } from '../base';
import type { CrawlResult, ExtractionResult } from '../base';
import { openaiConfig } from './config';

/**
 * Zod schema for AI-extracted pricing data.
 * Per D-14: Core pricing data only (model name, input price, output price, context window).
 * Per T-02-01: Zod validates extraction output shape; invalid data rejected.
 */
const pricingSchema = z.object({
  models: z.array(
    z.object({
      modelName: z.string(),
      inputPricePer1m: z.number(),
      outputPricePer1m: z.number(),
      contextWindow: z.number(),
    })
  ),
});

/**
 * OpenAI provider adapter.
 * Per D-13: First provider adapter.
 * Per D-16: Playwright for all pages.
 * Per D-14: Core pricing data extraction.
 */
export class OpenAIAdapter extends ProviderAdapter {
  config = openaiConfig;

  /**
   * Crawl OpenAI's pricing page using Crawlee PlaywrightCrawler.
   * Per D-16: Playwright for all pages, no HTTP-first fallback.
   */
  async crawl(): Promise<CrawlResult> {
    let result: CrawlResult | null = null;

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 1,
      headless: true,
      async requestHandler({ page, request, log }) {
        log.info(`Crawling ${request.loadedUrl ?? request.url}`);
        const html = await page.content();
        result = {
          url: request.loadedUrl ?? request.url,
          html,
          crawledAt: new Date(),
        };
      },
    });

    await crawler.run([this.config.pricingUrl]);
    if (!result) {
      throw new Error('Failed to crawl OpenAI pricing page');
    }
    return result;
  }

  /**
   * Extract structured pricing data from crawled HTML using Vercel AI SDK.
   * Per D-14: Extract core pricing data only.
   * Per T-02-01: Zod schema validates extraction output shape.
   */
  async extract(html: string): Promise<ExtractionResult[]> {
    try {
      // Per T-02-02: API key loaded from env, never logged or stored
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Truncate HTML to ~100K chars to stay within token limits (WR-03)
      const maxHtmlLength = 100_000;
      const truncatedHtml = html.length > maxHtmlLength
        ? html.slice(0, maxHtmlLength) + '\n<!-- TRUNCATED -->'
        : html;

      const { object } = await generateObject({
        model: openai('gpt-4o'),
        schema: pricingSchema,
        prompt: `Extract all AI model pricing data from this HTML page.
Return an array of models with their name, input price per 1M tokens, output price per 1M tokens, and context window size.
Only extract models that have explicit pricing listed. Skip models marked as "contact sales" or without pricing.

HTML content:
${truncatedHtml}`,
      });

      return object.models.map((model) => ({
        modelName: model.modelName,
        inputPricePer1m: model.inputPricePer1m,
        outputPricePer1m: model.outputPricePer1m,
        contextWindow: model.contextWindow,
        // Per D-06: Default confidence for AI-extracted data
        confidence: 'likely' as const,
        rawEvidence: model,
      }));
    } catch (error) {
      console.error('OpenAI extraction failed:', error);
      // Re-throw so BullMQ retries the job (WR-02)
      throw error;
    }
  }

  /**
   * Normalize extractions to standard format.
   * Per D-06: Default confidence for AI-extracted data is 'likely'.
   * Phase 2 adds real confidence scoring.
   */
  normalize(extractions: ExtractionResult[]): ExtractionResult[] {
    return extractions.map((e) => ({
      ...e,
      confidence: 'likely' as const,
    }));
  }
}
