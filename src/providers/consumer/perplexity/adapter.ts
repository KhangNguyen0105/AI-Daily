import { ConsumerAdapter } from '../base';
import { perplexityConsumerConfig } from './config';

/**
 * Perplexity consumer subscription adapter.
 * Extracts subscription plan data from perplexity.ai/pro.
 *
 * WR-01: Shared extraction logic moved to ConsumerAdapter base class.
 * Uses default buildExtractionPrompt() since Perplexity needs no special preamble.
 */
export class PerplexityConsumerAdapter extends ConsumerAdapter {
  config = perplexityConsumerConfig;
}
