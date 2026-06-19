import { ConsumerAdapter } from '../base';
import type { ConsumerSubscriptionPlan } from '../../base';
import { phindConsumerConfig } from './config';
import { phindStaticPlans } from './static-data';

/**
 * Phind consumer subscription adapter.
 * Extracts subscription plan data from phind.com/pro.
 *
 * Static fallback: Phind is a SPA with minimal HTML.
 * Uses static data when crawl fails.
 */
export class PhindConsumerAdapter extends ConsumerAdapter {
  config = phindConsumerConfig;

  protected getStaticPlans(): Omit<ConsumerSubscriptionPlan, 'currency' | 'sourceUrl' | 'confidence' | 'extractionNotes'>[] {
    return phindStaticPlans;
  }
}
