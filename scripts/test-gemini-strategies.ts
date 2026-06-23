/**
 * Test different crawling strategies for Gemini/Google One.
 */
import 'dotenv/config';
import { PlaywrightCrawler } from 'crawlee';

const strategies = [
  {
    name: 'commit only',
    url: 'https://one.google.com/about/plans',
    waitUntil: 'commit' as const,
  },
  {
    name: 'domcontentloaded',
    url: 'https://one.google.com/about/plans',
    waitUntil: 'domcontentloaded' as const,
  },
  {
    name: 'store.google.com',
    url: 'https://store.google.com/category/subscriptions',
    waitUntil: 'domcontentloaded' as const,
  },
  {
    name: 'google.com/intl/en/about/plans',
    url: 'https://one.google.com/intl/en/about/plans',
    waitUntil: 'domcontentloaded' as const,
  },
];

async function main() {
  const strategyIdx = parseInt(process.argv[2] || '0', 10);
  const strategy = strategies[strategyIdx];

  if (!strategy) {
    console.log('Available strategies:');
    strategies.forEach((s, i) => console.log(`  [${i}] ${s.name}: ${s.url}`));
    process.exit(0);
  }

  console.log(`\n=== Testing: ${strategy.name} ===`);
  console.log(`URL: ${strategy.url}`);
  console.log(`waitUntil: ${strategy.waitUntil}\n`);

  let result: { url: string; html: string } | null = null;

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 1,
    headless: true,
    requestHandlerTimeoutSecs: 30,
    launchContext: {
      launchOptions: {
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      },
    },
    async requestHandler({ page }) {
      try {
        const response = await page.goto(strategy.url, {
          waitUntil: strategy.waitUntil,
          timeout: 20_000,
        });
        console.log(`Response status: ${response?.status()}`);

        // Wait for more content
        await page.waitForTimeout(5000);

        const html = await page.content();
        result = { url: strategy.url, html };

        console.log(`HTML length: ${html.length}`);

        // Check for prices
        const prices = html.match(/\$[\d,.]+/g);
        if (prices) {
          console.log(`Prices found: ${[...new Set(prices)].slice(0, 10).join(', ')}`);
        }

        // Check for plan names
        const planKeywords = ['AI Premium', 'Google One', 'Gemini Advanced', 'subscription'];
        for (const kw of planKeywords) {
          if (html.toLowerCase().includes(kw.toLowerCase())) {
            console.log(`  Found keyword: "${kw}"`);
          }
        }
      } catch (e: any) {
        console.error(`Error: ${e.message}`);
      }
    },
  });

  await crawler.run([{ url: strategy.url, uniqueKey: `${strategy.url}-${Date.now()}` }]);

  if (!result) {
    console.log('\nAll strategies failed.');
  }
}

main().catch(console.error);
