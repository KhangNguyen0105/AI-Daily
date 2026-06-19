import { ConsumerAdapter } from '../base';
import { poeConsumerConfig } from './config';

/**
 * Poe consumer subscription adapter.
 * Extracts subscription plan data from poe.com/subscribe.
 *
 * WR-01: Shared extraction logic moved to ConsumerAdapter base class.
 * Uses default buildExtractionPrompt() since Poe needs no special preamble.
 */
export class PoeConsumerAdapter extends ConsumerAdapter {
  config = poeConsumerConfig;
}
