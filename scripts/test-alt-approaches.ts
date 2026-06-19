/**
 * Alternative approaches for non-crawlable providers.
 */
import { PlaywrightCrawler } from 'crawlee';

// ChatGPT: Parse the React Router JSON for price data
async function testChatGPTJsonParse() {
  console.log('\n=== CHATGPT: Parse JSON for prices ===');
  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 1,
    headless: true,
    async requestHandler({ page }) {
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(3000);
      const html = await page.content();

      // Find the React Router context JSON
      const match = html.match(/window\.__reactRouterContext\s*=\s*\{.*?"routes\/\(\$lang\)\.pricing".*?\}\s*;/s);
      if (!match) {
        console.log('No React Router pricing context found');
        return;
      }

      // Extract the pricing data array from the JSON
      // The JSON uses a flat array with references. Find the pricing section.
      const data = match[0];

      // Find all string values that look like prices or plan info
      const stringValues: string[] = [];
      const stringPattern = /"([^"]{1,200})"/g;
      let m;
      while ((m = stringPattern.exec(data)) !== null) {
        const val = m[1];
        if (/\$[\d,.]+/.test(val) || /month|year|free|pro|plus|go|plan|price|billing/i.test(val)) {
          stringValues.push(val);
        }
      }

      console.log('Relevant strings from JSON:');
      stringValues.forEach(s => console.log('  ' + s));
    },
  });
  await crawler.run([{ url: 'https://chatgpt.com/pricing' }]);
}

// Gemini: Try HTTP crawler (no browser)
async function testGeminiHTTP() {
  console.log('\n=== GEMINI: HTTP approach ===');
  const urls = [
    'https://one.google.com/about/plans',
    'https://store.google.com/category/phones',
    'https://ai.google.dev/pricing',
  ];
  for (const url of urls) {
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });
      const html = await resp.text();
      const hasPrice = /\$[\d,.]+/.test(html);
      console.log(`  ${url}: status=${resp.status}, hasPrice=${hasPrice}, len=${html.length}`);
      if (hasPrice) {
        const matches = html.match(/\$[\d,.]+/g);
        console.log(`    Prices: ${matches?.join(', ')}`);
      }
    } catch (e: any) {
      console.log(`  ${url}: ERROR: ${e.message}`);
    }
  }
}

// Poe: Try HTTP approach
async function testPoeHTTP() {
  console.log('\n=== POE: HTTP approach ===');
  try {
    const resp = await fetch('https://poe.com/subscribe', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });
    const html = await resp.text();
    console.log(`  Status: ${resp.status}, URL: ${resp.url}, Len: ${html.length}`);
    const hasPrice = /\$[\d,.]+/.test(html);
    console.log(`  HasPrice: ${hasPrice}`);
    if (hasPrice) {
      const matches = html.match(/\$[\d,.]+/g);
      console.log(`  Prices: ${matches?.join(', ')}`);
    }
  } catch (e: any) {
    console.log(`  ERROR: ${e.message}`);
  }
}

// X/Grok: Try HTTP approach
async function testGrokHTTP() {
  console.log('\n=== GROK/X: HTTP approach ===');
  try {
    const resp = await fetch('https://x.com/i/premium', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });
    const html = await resp.text();
    console.log(`  Status: ${resp.status}, URL: ${resp.url}, Len: ${html.length}`);
    const hasPrice = /\$[\d,.]+/.test(html);
    console.log(`  HasPrice: ${hasPrice}`);
  } catch (e: any) {
    console.log(`  ERROR: ${e.message}`);
  }
}

(async () => {
  await testChatGPTJsonParse();
  await testGeminiHTTP();
  await testPoeHTTP();
  await testGrokHTTP();
})();
