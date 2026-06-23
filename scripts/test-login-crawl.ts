/**
 * Test login-based crawling for consumer subscription adapters.
 *
 * Usage:
 *   npx tsx scripts/test-login-crawl.ts poe
 *   npx tsx scripts/test-login-crawl.ts chatgpt
 *   npx tsx scripts/test-login-crawl.ts grok
 *   npx tsx scripts/test-login-crawl.ts copilot
 *   npx tsx scripts/test-login-crawl.ts gemini
 */

import 'dotenv/config';

async function main() {
  const provider = process.argv[2];
  if (!provider) {
    console.log('Usage: npx tsx scripts/test-login-crawl.ts <provider>');
    console.log('Providers: poe, chatgpt, copilot, grok, gemini');
    process.exit(1);
  }

  // Dynamic imports to ensure env is loaded first
  const { poeConsumerConfig } = await import('../src/providers/consumer/poe/config');
  const { PoeConsumerAdapter } = await import('../src/providers/consumer/poe/adapter');
  const { chatgptConsumerConfig } = await import('../src/providers/consumer/chatgpt/config');
  const { ChatGPTConsumerAdapter } = await import('../src/providers/consumer/chatgpt/adapter');
  const { copilotConsumerConfig } = await import('../src/providers/consumer/copilot/config');
  const { CopilotConsumerAdapter } = await import('../src/providers/consumer/copilot/adapter');
  const { grokConsumerConfig } = await import('../src/providers/consumer/grok/config');
  const { GrokConsumerAdapter } = await import('../src/providers/consumer/grok/adapter');
  const { geminiConsumerConfig } = await import('../src/providers/consumer/gemini/config');
  const { GeminiConsumerAdapter } = await import('../src/providers/consumer/gemini/adapter');

  const adapters: Record<string, { config: any; adapter: any; envKeys: string[] }> = {
    poe: {
      config: poeConsumerConfig,
      adapter: new PoeConsumerAdapter(),
      envKeys: ['POE_EMAIL', 'POE_PASSWORD'],
    },
    chatgpt: {
      config: chatgptConsumerConfig,
      adapter: new ChatGPTConsumerAdapter(),
      envKeys: ['OPENAI_EMAIL', 'OPENAI_PASSWORD'],
    },
    copilot: {
      config: copilotConsumerConfig,
      adapter: new CopilotConsumerAdapter(),
      envKeys: ['MS_EMAIL', 'MS_PASSWORD'],
    },
    grok: {
      config: grokConsumerConfig,
      adapter: new GrokConsumerAdapter(),
      envKeys: ['X_EMAIL', 'X_PASSWORD'],
    },
    gemini: {
      config: geminiConsumerConfig,
      adapter: new GeminiConsumerAdapter(),
      envKeys: ['GOOGLE_EMAIL', 'GOOGLE_PASSWORD'],
    },
  };

  const entry = adapters[provider];
  if (!entry) {
    console.error(`Unknown provider: ${provider}`);
    process.exit(1);
  }

  // Check env vars
  const missing = entry.envKeys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.log(`Missing env vars: ${missing.join(', ')}`);
    console.log('Login will be skipped — testing anonymous crawl only.');
  } else {
    console.log(`Credentials found: ${entry.envKeys.join(', ')}`);
  }

  console.log(`\n=== Testing ${entry.config.name} ===`);
  console.log(`URL: ${entry.config.pricingUrl}`);
  console.log(`Expected plans: ${entry.config.expectedPlanNames.join(', ')}\n`);

  try {
    console.log('Starting crawl...');
    const result = await entry.adapter.crawl();

    console.log(`\nCrawl result:`);
    console.log(`  URL: ${result.url}`);
    console.log(`  HTML length: ${result.html.length}`);
    console.log(`  Crawled at: ${result.crawledAt}`);

    const isStatic = result.html === '<!-- STATIC_FALLBACK -->';
    console.log(`  Static fallback: ${isStatic}`);

    if (!isStatic && result.html.length > 0) {
      // Show a snippet of the HTML
      const snippet = result.html.substring(0, 500);
      console.log(`\nHTML snippet:\n${snippet}...`);

      // Check for price-like patterns
      const pricePattern = /\$[\d,.]+/g;
      const prices = result.html.match(pricePattern);
      if (prices) {
        console.log(`\nPrices found in HTML: ${[...new Set(prices)].join(', ')}`);
      } else {
        console.log('\nNo prices found in HTML');
      }

      // Check for plan names
      for (const name of entry.config.expectedPlanNames) {
        if (result.html.toLowerCase().includes(name.toLowerCase())) {
          console.log(`  Found plan name: "${name}"`);
        }
      }
    }

    // Try extraction
    if (!isStatic) {
      console.log('\nAttempting extraction...');
      const extraction = await entry.adapter.extract(result.html);
      console.log(`\nExtraction result:`);
      console.log(JSON.stringify(extraction, null, 2));
    }
  } catch (error) {
    console.error(`\nCrawl failed:`, error);
  }

  process.exit(0);
}

main().catch(console.error);
