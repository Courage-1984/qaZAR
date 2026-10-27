import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { config } from '../config.js';
import { VIEWPORTS, contextOptions } from './viewports.js';
import { evaluate } from '../heuristics/evaluate.js';
import { assertPublicUrl } from '../routes/validate.js';
import { waitForHost } from '../crawler/hostGate.js';

const FREEZE_CSS = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}`;

let browserPromise;
export async function getBrowser() {
  if (browserPromise) {
    try {
      const browser = await browserPromise;
      if (browser.isConnected()) return browser;
    } catch {
      /* relaunch below */
    }
    browserPromise = null;
  }
  const launching = chromium.launch();
  browserPromise = launching;
  try {
    return await launching;
  } catch (err) {
    if (browserPromise === launching) browserPromise = null;
    throw err;
  }
}
export async function closeBrowser() {
  if (browserPromise) (await browserPromise).close();
  browserPromise = null;
}

async function autoScroll(page) {
  await page.evaluate(async (budgetMs) => {
    const start = performance.now();
    await new Promise((resolve) => {
      let y = 0;
      const step = Math.max(400, innerHeight * 0.8);
      const t = setInterval(() => {
        scrollBy(0, step);
        y += step;
        const timedOut = performance.now() - start > budgetMs;
        if (y >= document.documentElement.scrollHeight || y > 20000 || timedOut) {
          clearInterval(t);
          resolve();
        }
      }, 80);
    });
  }, 2500);
  await page.evaluate(() => scrollTo(0, 0));
}

/**
 * Capture one page at one viewport in a fresh, isolated context.
 * Returns { shotFile (absolute), violations, metrics }.
 */
export async function capturePage(url, vp, outFile, { collectLeads = false } = {}) {
  const browser = await getBrowser();
  const context = await browser.newContext(contextOptions(vp));
  let release = () => {};
  try {
    await context.addInitScript(() => {
      const fixed = new Date('2024-01-01T12:00:00Z').getTime();
      const RealDate = Date;
      // eslint-disable-next-line no-global-assign
      Date = class extends RealDate {
        constructor(...a) { a.length ? super(...a) : super(fixed); }
        static now() { return fixed; }
      };
      let s = 42;
      Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    });
    const page = await context.newPage();
    release = await waitForHost(new URL(url).origin);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.navTimeoutMs });
    await assertPublicUrl(page.url(), 'redirect');
    await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    await page.addStyleTag({ content: FREEZE_CSS });
    await autoScroll(page);
    await page.evaluate(() => Promise.race([
      document.fonts?.ready || Promise.resolve(),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]));
    await page.waitForTimeout(250);

    const result = await page.evaluate(evaluate, { touch: vp.touch, viewportWidth: vp.width });
    const leadHtml = collectLeads
      ? await page.evaluate(() => (document.documentElement?.outerHTML || '').slice(0, 1500000))
      : '';

    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    await page.screenshot({
      path: outFile,
      fullPage: true,
      animations: 'disabled',
      ...(height > config.maxShotHeight ? { clip: { x: 0, y: 0, width: vp.width, height: config.maxShotHeight } } : {}),
    });
    return leadHtml ? { ...result, leadHtml } : result;
  } finally {
    release();
    await context.close();
  }
}

export { VIEWPORTS };
