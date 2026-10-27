import { getBrowser } from '../engine/capturePage.js';
import { installNavGuard } from '../engine/navGuard.js';
import { normalizeUrl, isAssetUrl, sameOrigin } from './normalize.js';
import { assertPublicUrl } from '../routes/validate.js';

/**
 * Discovers links from client-side rendered / SPA pages using a headless browser.
 * Executes JS to ensure dynamically mounted links (<div id="root">) are discovered.
 * @param {string} url
 * @param {number} [timeoutMs=20000]
 * @returns {Promise<string[]>}
 */
export async function extractLinksHeadless(url, timeoutMs = 20000) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 qaZAR/0.1',
  });

  const links = new Set();
  try {
    await installNavGuard(context);
    await context.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (type === 'image' || type === 'media' || type === 'font') return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await assertPublicUrl(page.url(), 'redirect');
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const hrefs = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors.map((a) => a.getAttribute('href')).filter(Boolean);
    });

    for (const href of hrefs) {
      const normalized = normalizeUrl(href, url);
      if (normalized && sameOrigin(normalized, url) && !isAssetUrl(normalized)) {
        links.add(normalized);
      }
    }
  } catch (err) {
    /* skip unreachable page */
  } finally {
    await context.close().catch(() => {});
  }

  return [...links];
}
