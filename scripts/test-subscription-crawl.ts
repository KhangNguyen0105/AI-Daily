/**
 * Standalone test script for subscription crawling.
 * Tests crawl + extract for a single consumer adapter without needing
 * Redis/BullMQ pipeline infrastructure.
 *
 * Usage: npx tsx scripts/test-subscription-crawl.ts [provider-name]
 * Example: npx tsx scripts/test-subscription-crawl.ts chatgpt-consumer
 */

// IMPORTANT: Load .env BEFORE any other imports — env.ts parses process.env at import time
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(import.meta.dirname, '..', '.env') });

// Verify env loaded
if (!process.env.MIMO_API_KEY && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
  console.error('ERROR: No AI API key found in .env. Set MIMO_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.');
  process.exit(1);
}

async function main() {
  // Dynamic import AFTER dotenv is loaded — env.ts parses process.env at import time
  const { getConsumerAdapter, getAllConsumerAdapters } = await import('../src/providers/consumer/registry');

  const providerName = process.argv[2];

  let adapter;
  if (providerName) {
    adapter = getConsumerAdapter(providerName);
    if (!adapter) {
      console.error(`Unknown consumer adapter: ${providerName}`);
      console.error('Available adapters:');
      for (const a of getAllConsumerAdapters()) {
        console.error(`  - ${a.config.name}`);
      }
      process.exit(1);
    }
  } else {
    // Default: test ChatGPT
    adapter = getConsumerAdapter('chatgpt-consumer');
    if (!adapter) {
      console.error('ChatGPT consumer adapter not found');
      process.exit(1);
    }
  }

  console.log(`\n=== Testing subscription crawl for: ${adapter.config.name} ===`);
  console.log(`Pricing URL: ${adapter.config.pricingUrl}`);
  console.log(`Expected plans: ${(adapter.config as any).expectedPlanNames?.join(', ') ?? 'N/A'}`);
  console.log(`Timeout: ${(adapter.config as any).adapterTimeoutMs ?? 'default'}ms\n`);

  // Step 1: Crawl
  console.log('[1/2] Crawling pricing page...');
  const startTime = Date.now();
  let crawlResult;
  try {
    crawlResult = await adapter.crawl();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✓ Crawl completed in ${elapsed}s`);
    console.log(`  URL: ${crawlResult.url}`);
    console.log(`  HTML length: ${crawlResult.html.length.toLocaleString()} chars`);
  } catch (err) {
    console.error('  ✗ Crawl failed:', err);
    process.exit(1);
  }

  // Step 2: Extract
  console.log('\n[2/2] Extracting subscription plans...');
  const extractStart = Date.now();
  let extraction;
  try {
    extraction = await adapter.extract(crawlResult.html);
    const elapsed = ((Date.now() - extractStart) / 1000).toFixed(1);
    console.log(`  ✓ Extraction completed in ${elapsed}s`);
  } catch (err) {
    console.error('  ✗ Extraction failed:', err);
    process.exit(1);
  }

  // Results
  console.log(`\n=== Results ===`);
  console.log(`Models: ${extraction.models.length}`);
  console.log(`Promotions: ${extraction.promotions.length}`);
  console.log(`Subscription Plans: ${extraction.subscriptionPlans?.length ?? 0}`);

  if (extraction.subscriptionPlans && extraction.subscriptionPlans.length > 0) {
    console.log('\n--- Subscription Plans ---');
    for (const plan of extraction.subscriptionPlans) {
      console.log(`\n  Plan: ${plan.planName}`);
      console.log(`  Monthly: ${plan.monthlyPrice !== null ? `$${plan.monthlyPrice}` : 'N/A'}`);
      console.log(`  Annual: ${plan.annualPrice !== null ? `$${plan.annualPrice}` : 'N/A'}`);
      console.log(`  Annual/Monthly: ${plan.annualMonthlyPrice !== null ? `$${plan.annualMonthlyPrice}` : 'N/A'}`);
      console.log(`  Raw text: ${plan.rawPriceText ?? 'N/A'}`);
      console.log(`  Billing: ${plan.billingPeriod}`);
      console.log(`  Free trial: ${plan.freeTrialDays ? `${plan.freeTrialDays} days` : 'None'}`);
      if (plan.freeTrialConditions) {
        console.log(`  Trial conditions: ${plan.freeTrialConditions}`);
      }
      console.log(`  Features: ${plan.keyFeatures.length} items`);
      if (plan.keyFeatures.length > 0) {
        for (const f of plan.keyFeatures.slice(0, 5)) {
          console.log(`    • ${f}`);
        }
        if (plan.keyFeatures.length > 5) {
          console.log(`    ... and ${plan.keyFeatures.length - 5} more`);
        }
      }
      console.log(`  Confidence: ${plan.confidence}`);
      if (plan.extractionNotes) {
        console.log(`  Notes: ${plan.extractionNotes}`);
      }
    }
  } else {
    console.log('\n⚠ No subscription plans extracted!');
    console.log('Possible causes:');
    console.log('  - Pricing page HTML structure changed');
    console.log('  - LLM extraction returned empty results');
    console.log('  - Extraction timed out');
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nTotal time: ${totalElapsed}s`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
