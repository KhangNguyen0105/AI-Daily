/**
 * Test stealth crawling approaches for blocked providers.
 * 1. ChatGPT: Extract prices from React Router JSON blob
 * 2. Gemini: Try with stealth user-agent and extra headers
 * 3. Poe: Try with stealth
 * 4. X/Grok: Try with stealth
 */
import { PlaywrightCrawler } from 'crawlee';

// Approach 1: ChatGPT - Extract from JSON blob
async function testChatGPT() {
  console.log('\n=== CHATGPT: Extract prices from JSON ===');
  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 1,
    headless: true,
    async requestHandler({ page }) {
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(3000);
      const html = await page.content();

      // The React Router context contains plan data with price tokens
      // "chatgpt.pro.5x", "chatgpt.plus", "chatgpt.go", "chatgpt.free"
      // and analytics strings like "Pro $100"
      // But actual prices are resolved client-side via API

      // Try to find the pricing API call
      const apiResponses: string[] = [];
      page.on('response', async (resp) => {
        const url = resp.url();
        if (url.includes('/api/') || url.includes('pricing') || url.includes('subscription')) {
          try {
            const body = await resp.text();
            if (body.includes('$') || body.includes('price')) {
              apiResponses.push(`[${resp.status()}] ${url}: ${body.substring(0, 300)}`);
            }
          } catch {}
        }
      });

      // Reload to capture API calls
      await page.reload({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(5000);

      console.log('API responses with prices:');
      apiResponses.forEach(r => console.log('  ' + r));

      // Also try: get prices from page.evaluate after full hydration
      const hydrated = await page.evaluate(() => {
        // Check __NEXT_DATA__ or similar
        const win = window as any;
        if (win.__reactRouterContext) {
          return 'Has reactRouterContext';
        }
        // Check for any global state with prices
        const keys = Object.keys(win).filter(k =>
          k.includes('price') || k.includes('plan') || k.includes('subscription')
        );
        return `Global keys: ${keys.join(', ')}`;
      });
      console.log('Hydration check:', hydrated);
    },
  });
  await crawler.run([{ url: 'https://chatgpt.com/pricing' }]);
}

// Approach 2: Gemini with stealth
async function testGeminiStealth() {
  console.log('\n=== GEMINI: Stealth approach ===');
  const urls = [
    'https://one.google.com/about/plans',
    'https://one.google.com/plans',
    'https://gemini.google.com/advanced',
  ];
  for (const url of urls) {
    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 1,
      headless: true,
      browserPoolOptions: {
        useFingerprints: true,
      },
      async requestHandler({ page }) {
        // Set stealth headers
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(5000);
        const text = await page.evaluate(() => document.body.innerText);
        const hasPrice = /\$[\d,.]+/.test(text);
        console.log(`  ${url}: hasPrice=${hasPrice}, textLen=${text.length}`);
        if (hasPrice) {
          const lines = text.split('\n').filter(l => /\$[\d,.]+/.test(l));
          lines.slice(0, 5).forEach(l => console.log('    ' + l.trim().substring(0, 100)));
        }
      },
      failedRequestHandler() {
        console.log(`  ${url}: FAILED`);
      },
    });
    await crawler.run([{ url }]);
  }
}

// Approach 3: Poe stealth
async function testPoeStealth() {
  console.log('\n=== POE: Stealth approach ===');
  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 1,
    headless: true,
    browserPoolOptions: { useFingerprints: true },
    async requestHandler({ page }) {
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(5000);
      const text = await page.evaluate(() => document.body.innerText);
      const hasPrice = /\$[\d,.]+/.test(text);
      console.log(`  URL: ${page.url()}, hasPrice: ${hasPrice}, textLen: ${text.length}`);
      if (hasPrice) {
        const lines = text.split('\n').filter(l => /\$[\d,.]+/.test(l));
        lines.slice(0, 10).forEach(l => console.log('    ' + l.trim().substring(0, 100)));
      }
      // Check if redirected to login
      if (page.url().includes('login')) {
        console.log('  Redirected to login');
        // Try to find pricing content anyway
        const priceLines = text.split('\n').filter(l => /month|year|free|pro|plan/i.test(l) && l.trim().length < 100);
        priceLines.slice(0, 10).forEach(l => console.log('    [plan] ' + l.trim()));
      }
    },
  });
  await crawler.run([{ url: 'https://poe.com/subscribe' }]);
}

// Approach 4: X/Grok stealth
async function testGrokStealth() {
  console.log('\n=== GROK/X: Stealth approach ===');
  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 1,
    headless: true,
    browserPoolOptions: { useFingerprints: true },
    async requestHandler({ page }) {
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(5000);
      const text = await page.evaluate(() => document.body.innerText);
      const hasPrice = /\$[\d,.]+/.test(text);
      console.log(`  URL: ${page.url()}, hasPrice: ${hasPrice}, textLen: ${text.length}`);
      if (hasPrice) {
        const lines = text.split('\n').filter(l => /\$[\d,.]+/.test(l));
        lines.slice(0, 10).forEach(l => console.log('    ' + l.trim().substring(0, 100)));
      }
      if (page.url().includes('login') || page.url().includes('onboarding')) {
        console.log('  Redirected to login');
        const planLines = text.split('\n').filter(l => /premium|basic|pro|free|month/i.test(l) && l.trim().length < 100);
        planLines.slice(0, 10).forEach(l => console.log('    [plan] ' + l.trim()));
      }
    },
  });
  await crawler.run([{ url: 'https://x.com/i/premium' }]);
}

(async () => {
  await testChatGPT();
  await testGeminiStealth();
  await testPoeStealth();
  await testGrokStealth();
})();
