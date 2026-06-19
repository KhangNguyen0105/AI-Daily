import { ConsumerAdapter } from '../base';
import type { ConsumerSubscriptionPlan } from '../../base';
import { youConsumerConfig } from './config';
import { youStaticPlans } from './static-data';

/**
 * You.com consumer subscription adapter.
 * Extracts subscription plan data from you.com/pro.
 *
 * Static fallback: You.com has pivoted to API platform.
 * Uses static data when crawl fails.
 */
export class YouConsumerAdapter extends ConsumerAdapter {
  config = youConsumerConfig;

  protected getStaticPlans(): Omit<ConsumerSubscriptionPlan, 'currency' | 'sourceUrl' | 'confidence' | 'extractionNotes'>[] {
    return youStaticPlans;
  }
}
