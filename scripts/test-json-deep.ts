/**
 * Deep parse ChatGPT's React Router JSON for price data.
 */
import { PlaywrightCrawler } from 'crawlee';

const crawler = new PlaywrightCrawler({
  maxRequestsPerCrawl: 1,
  headless: true,
  async requestHandler({ page }) {
    await page.goto('https://chatgpt.com/pricing', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const html = await page.content();

    // Find ALL script tags
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script')).map(s => s.textContent?.substring(0, 200) || '');
    });

    // Look for the script with pricing data
    for (let i = 0; i < scripts.length; i++) {
      const s = scripts[i];
      if (s.includes('pricing') || s.includes('price') || s.includes('$')) {
        console.log(`Script ${i}: ${s.substring(0, 200)}`);
      }
    }

    // Find the full script content with "Pricing"
    const fullScripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script'))
        .map(s => s.textContent || '')
        .filter(s => s.includes('Pricing') && s.length > 1000)
        .map(s => s.substring(0, 2000));
    });

    console.log(`\nFound ${fullScripts.length} scripts with "Pricing":`);
    fullScripts.forEach((s, i) => {
      console.log(`\n--- Script ${i} (first 2000 chars) ---`);
      console.log(s);
    });

    // Also check for inline JSON-LD
    const jsonLd = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      return Array.from(scripts).map(s => s.textContent || '');
    });

    if (jsonLd.length > 0) {
      console.log('\n=== JSON-LD ===');
      jsonLd.forEach(j => console.log(j));
    } else {
      console.log('\nNo JSON-LD found');
    }

    // Check for meta tags with prices
    const metas = await page.evaluate(() => {
      const metas = document.querySelectorAll('meta[property*="price"], meta[name*="price"], meta[property*="amount"]');
      return Array.from(metas).map(m => ({
        name: m.getAttribute('name') || m.getAttribute('property'),
        content: m.getAttribute('content'),
      }));
    });

    if (metas.length > 0) {
      console.log('\n=== Price meta tags ===');
      metas.forEach(m => console.log(`${m.name}: ${m.content}`));
    } else {
      console.log('\nNo price meta tags found');
    }
  },
});

crawler.run([{ url: 'https://chatgpt.com/pricing' }]);
