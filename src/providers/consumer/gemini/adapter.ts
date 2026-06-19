import { ConsumerAdapter } from '../base';
import { geminiConsumerConfig } from './config';

/**
 * Gemini consumer subscription adapter.
 * Extracts subscription plan data from one.google.com/about/plans.
 *
 * WR-01: Shared extraction logic moved to ConsumerAdapter base class.
 * Uses default buildExtractionPrompt() since Gemini needs no special preamble.
 */
export class GeminiConsumerAdapter extends ConsumerAdapter {
  config = geminiConsumerConfig;
}
