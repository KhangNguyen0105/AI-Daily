/**
 * Intercept API calls to find pricing data endpoints.
 */
import { PlaywrightCrawler } from 'crawlee';

async function interceptChatGPT() {
  console.log('\n=== CHATGPT: Intercept ALL network requests ===');
  const apiCalls: { url: string; status: number; body: string }[] = [];

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 1,
    headless: true,
    async requestHandler({ page }) {
      // Capture ALL responses
      page.on('response', async (resp) => {
        const url = resp.url();
        // Skip static assets
        if (url.includes('.js') || url.includes('.css') || url.includes('.png') || url.includes('.svg') || url.includes('favicon')) return;
        if (url.includes('analytics') || url.includes('telemetry') || url.includes('statsig') || url.includes('sentry')) return;

        try {
          const ct = resp.headers()['content-type'] || '';
          if (ct.includes('json') || ct.includes('text')) {
            const body = await resp.text();
            if (body.length < 50000 && (body.includes('price') || body.includes('plan') || body.includes('$') || body.includes('subscription'))) {
              apiCalls.push({
                url: url.substring(0, 150),
                status: resp.status(),
                body: body.substring(0, 500),
              });
            }
          }
        } catch {}
      });

      await page.goto('https://chatgpt.com/pricing', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(8000);
    },
  });

  await crawler.run([{ url: 'https://chatgpt.com/pricing' }]);

  console.log(`Found ${apiCalls.length} API calls with pricing data:`);
  apiCalls.forEach((c, i) => {
    console.log(`\n${i}: [${c.status}] ${c.url}`);
    console.log(`   ${c.body.substring(0, 300)}`);
  });
}

async function interceptPoe() {
  console.log('\n=== POE: Intercept ALL network requests ===');
  const apiCalls: { url: string; status: number; body: string }[] = [];

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 1,
    headless: true,
    async requestHandler({ page }) {
      page.on('response', async (resp) => {
        const url = resp.url();
        if (url.includes('.js') || url.includes('.css') || url.includes('.png')) return;
        try {
          const body = await resp.text();
          if (body.length < 10000 && (body.includes('price') || body.includes('plan') || body.includes('subscription') || body.includes('$'))) {
            apiCalls.push({ url: url.substring(0, 150), status: resp.status(), body: body.substring(0, 500) });
          }
        } catch {}
      });

      await page.goto('https://poe.com/subscribe', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(5000);
    },
  });

  await crawler.run([{ url: 'https://poe.com/subscribe' }]);

  console.log(`Found ${apiCalls.length} API calls:`);
  apiCalls.forEach((c, i) => {
    console.log(`\n${i}: [${c.status}] ${c.url}`);
    console.log(`   ${c.body.substring(0, 300)}`);
  });
}

(async () => {
  await interceptChatGPT();
  await interceptPoe();
})();
