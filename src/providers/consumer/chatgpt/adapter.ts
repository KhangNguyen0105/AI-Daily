import { ConsumerAdapter } from '../base';
import { chatgptConsumerConfig } from './config';

/**
 * ChatGPT consumer subscription adapter.
 * Extracts subscription plan data from chatgpt.com/pricing.
 *
 * WR-01: Shared extraction logic moved to ConsumerAdapter base class.
 * Uses default buildExtractionPrompt() since ChatGPT needs no special preamble.
 */
export class ChatGPTConsumerAdapter extends ConsumerAdapter {
  config = chatgptConsumerConfig;
}
