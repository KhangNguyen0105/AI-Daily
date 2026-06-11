import { PlaywrightCrawler } from 'crawlee';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { ProviderAdapter } from '../base';
import type { CrawlResult, ExtractionResult } from '../base';
import { bedrockConfig } from './config';

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

export class BedrockAdapter extends ProviderAdapter {
  config = bedrockConfig;

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
      throw new Error('Failed to crawl Amazon Bedrock pricing page');
    }
    return result;
  }

  async extract(html: string): Promise<ExtractionResult[]> {
    try {
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const maxHtmlLength = 100_000;
      const truncatedHtml = html.length > maxHtmlLength
        ? html.slice(0, maxHtmlLength) + '\n<!-- TRUNCATED -->'
        : html;

      const { object } = await generateObject({
        model: openai('gpt-4o'),
        schema: pricingSchema,
        prompt: `Extract Amazon Bedrock model pricing from this HTML page.
Look for models from multiple providers available through Bedrock (Anthropic, Meta, Cohere, AI21, Mistral, etc.).
IMPORTANT: Bedrock prices may be per-1000-tokens. Convert ALL prices to per-1M-tokens (multiply by 1000).
Extract input and output prices per million tokens and context window size.
Only extract models with explicit pricing. Skip models without pricing.

HTML content:
${truncatedHtml}`,
      });

      return object.models.map((model) => ({
        modelName: model.modelName,
        inputPricePer1m: model.inputPricePer1m,
        outputPricePer1m: model.outputPricePer1m,
        contextWindow: model.contextWindow,
        confidence: 'likely' as const,
        rawEvidence: model,
      }));
    } catch (error) {
      console.error('Bedrock extraction failed:', error);
      throw error;
    }
  }

  /**
   * Normalize Bedrock extractions.
   * Bedrock prices may be in per-1K-tokens format; normalize to per-1M-tokens.
   */
  normalize(extractions: ExtractionResult[]): ExtractionResult[] {
    return extractions.map((e) => ({
      ...e,
      // If prices look like per-1K (< $0.01 likely means per-1K), convert to per-1M
      inputPricePer1m:
        e.inputPricePer1m !== null && e.inputPricePer1m < 0.01
          ? e.inputPricePer1m * 1000
          : e.inputPricePer1m,
      outputPricePer1m:
        e.outputPricePer1m !== null && e.outputPricePer1m < 0.01
          ? e.outputPricePer1m * 1000
          : e.outputPricePer1m,
      confidence: 'likely' as const,
    }));
  }
}
