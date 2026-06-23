/**
 * Try to extract prices from fully hydrated DOM.
 */
import { PlaywrightCrawler } from 'crawlee';

async function extractChatGPTPrices() {
  console.log('\n=== CHATGPT: Extract from hydrated DOM ===');
  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 1,
    headless: true,
    async requestHandler({ page }) {
      await page.goto('https://chatgpt.com/pricing', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      // Wait extra long for full hydration
      await page.waitForTimeout(10000);

      // Try to find price elements in the DOM
      const result = await page.evaluate(() => {
        // Method 1: Look for elements with price-like text content
        const allElements = document.querySelectorAll('*');
        const priceElements: { tag: string; text: string; parent: string }[] = [];
        for (const el of allElements) {
          const text = el.textContent?.trim() || '';
          // Match standalone price patterns like "$20", "$200", "Free"
          if (/^\$\d+(\.\d{2})?$/.test(text) || text === 'Free') {
            const parent = el.parentElement?.textContent?.trim()?.substring(0, 100) || '';
            priceElements.push({ tag: el.tagName, text, parent });
          }
        }

        // Method 2: Look for aria-label or data attributes with prices
        const ariaElements = document.querySelectorAll('[aria-label*="$"], [data-price], [data-amount]');
        const ariaPrices = Array.from(ariaElements).map(el => ({
          tag: el.tagName,
          ariaLabel: el.getAttribute('aria-label'),
          text: el.textContent?.trim()?.substring(0, 50),
        }));

        // Method 3: Get all text and search for price patterns
        const bodyText = document.body.innerText;
        const pricePattern = /\$\d+(?:\.\d{2})?/g;
        const allPrices = bodyText.match(pricePattern) || [];

        // Method 4: Look for specific plan card structures
        const planCards = document.querySelectorAll('[class*="plan"], [class*="pricing"], [class*="tier"]');
        const planInfo = Array.from(planCards).map(el => ({
          tag: el.tagName,
          className: (el as HTMLElement).className?.substring(0, 50),
          text: el.textContent?.trim()?.substring(0, 200),
        }));

        return {
          priceElements: priceElements.slice(0, 20),
          ariaPrices: ariaPrices.slice(0, 10),
          allPrices,
          planInfo: planInfo.slice(0, 10),
        };
      });

      console.log('Price elements:', JSON.stringify(result.priceElements, null, 2));
      console.log('Aria prices:', JSON.stringify(result.ariaPrices, null, 2));
      console.log('All prices in text:', result.allPrices);
      console.log('Plan cards:', result.planInfo.length);
      result.planInfo.forEach((p, i) => console.log(`  ${i}: <${p.tag} class="${p.className}"> ${p.text}`));
    },
  });
  await crawler.run([{ url: 'https://chatgpt.com/pricing' }]);
}

async function extractPoePrices() {
  console.log('\n=== POE: Extract from hydrated DOM ===');
  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 1,
    headless: true,
    async requestHandler({ page }) {
      await page.goto('https://poe.com/subscribe', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(8000);

      const result = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const pricePattern = /\$\d+(?:\.\d{2})?/g;
        const allPrices = bodyText.match(pricePattern) || [];

        // Get all text lines
        const lines = bodyText.split('\n').filter(l => l.trim()).map(l => l.trim());

        return { allPrices, lines: lines.slice(0, 50) };
      });

      console.log('All prices:', result.allPrices);
      console.log('Page text:');
      result.lines.forEach((l, i) => console.log(`  ${i}: ${l.substring(0, 100)}`));
    },
  });
  await crawler.run([{ url: 'https://poe.com/subscribe' }]);
}

(async () => {
  await extractChatGPTPrices();
  await extractPoePrices();
})();
