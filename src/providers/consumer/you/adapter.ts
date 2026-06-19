import { ConsumerAdapter } from '../base';
import { youConsumerConfig } from './config';

/**
 * You.com consumer subscription adapter.
 * Extracts subscription plan data from you.com/pro.
 *
 * WR-01: Shared extraction logic moved to ConsumerAdapter base class.
 * Uses default buildExtractionPrompt() since You.com needs no special preamble.
 */
export class YouConsumerAdapter extends ConsumerAdapter {
  config = youConsumerConfig;
}
