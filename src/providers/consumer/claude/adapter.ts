import { ConsumerAdapter } from '../base';
import { claudeConsumerConfig } from './config';

/**
 * Claude consumer subscription adapter.
 * Extracts subscription plan data from anthropic.com/claude.
 *
 * WR-01: Shared extraction logic moved to ConsumerAdapter base class.
 * Uses default buildExtractionPrompt() since Claude needs no special preamble.
 */
export class ClaudeConsumerAdapter extends ConsumerAdapter {
  config = claudeConsumerConfig;
}
