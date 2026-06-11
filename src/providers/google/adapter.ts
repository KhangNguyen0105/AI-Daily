import { PlaywrightCrawler } from 'crawlee';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { ProviderAdapter } from '../base';
import type { CrawlResult, ExtractionResult } from '../base';
import { googleConfig } from './config';

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

export class GoogleAdapter extends ProviderAdapter {
  config = googleConfig;

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
      throw new Error('Failed to crawl Google AI pricing page');
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
        prompt: `Extract Gemini model pricing from this HTML page.
Look for model names like gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash, etc.
Note tiered pricing if present and extract the standard tier.
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
      console.error('Google extraction failed:', error);
      throw error;
    }
  }

  normalize(extractions: ExtractionResult[]): ExtractionResult[] {
    return extractions.map((e) => ({
      ...e,
      confidence: 'likely' as const,
    }));
  }
}
