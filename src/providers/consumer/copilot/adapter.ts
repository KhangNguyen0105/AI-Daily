import { ConsumerAdapter } from '../base';
import { copilotConsumerConfig } from './config';

/**
 * Copilot consumer subscription adapter.
 * Extracts subscription plan data from copilot.microsoft.com.
 *
 * WR-01: Shared extraction logic moved to ConsumerAdapter base class.
 * Uses default buildExtractionPrompt() since Copilot needs no special preamble.
 */
export class CopilotConsumerAdapter extends ConsumerAdapter {
  config = copilotConsumerConfig;
}
