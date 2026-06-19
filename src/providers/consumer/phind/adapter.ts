import { ConsumerAdapter } from '../base';
import { phindConsumerConfig } from './config';

/**
 * Phind consumer subscription adapter.
 * Extracts subscription plan data from phind.com/pro.
 *
 * WR-01: Shared extraction logic moved to ConsumerAdapter base class.
 * Uses default buildExtractionPrompt() since Phind needs no special preamble.
 */
export class PhindConsumerAdapter extends ConsumerAdapter {
  config = phindConsumerConfig;
}
