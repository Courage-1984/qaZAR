import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { config } from '../config.js';
import { VIEWPORTS, contextOptions } from './viewports.js';
import { evaluate } from '../heuristics/evaluate.js';
import { assertPublicUrl } from '../routes/validate.js';
import { installNavGuard } from './navGuard.js';
import {
  FREEZE_CSS, LEAD_HTML_CAP, captureBudgets, screenshotOptions,
} from './captureBudgets.js';

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

async function autoScroll(page, budgetMs = 2500) {
  await page.evaluate(async (budget) => {
    const start = performance.now();
    await new Promise((resolve) => {
      let y = 0;
      const step = Math.max(400, innerHeight * 0.8);
      const t = setInterval(() => {
        scrollBy(0, step);
        y += step;
        const timedOut = performance.now() - start > budget;
        if (y >= document.documentElement.scrollHeight || y > 20000 || timedOut) {
          clearInterval(t);
          resolve();
        }
      }, 80);
    });
  }, budgetMs);
  await page.evaluate(() => scrollTo(0, 0));
}

/**
 * Capture one page at one viewport in a fresh, isolated context.
 * Returns { shotFile (absolute), violations, metrics }.
 */
export async function capturePage(url, vp, outFile, {
  collectLeads = false, deterministic = false, fast = false,
} = {}) {
  const browser = await getBrowser();
  const context = await browser.newContext(contextOptions(vp));
  const { scrollBudgetMs, fontCapMs, settleMs } = captureBudgets(fast);
  try {
    if (deterministic) {
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
    }
    await installNavGuard(context);
    const page = await context.newPage();
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() === 'document') {
        try { await assertPublicUrl(route.request().url(), 'nav'); }
        catch { return route.abort('blockedbyclient'); }
      }
      return route.continue();
    });
    const mark = () => Date.now();
    let t = mark();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.navTimeoutMs });
    const gotoMs = mark() - t;
    await assertPublicUrl(page.url(), 'redirect');
    const idleMs = 0;
    await page.addStyleTag({ content: FREEZE_CSS });
    t = mark();
    await autoScroll(page, scrollBudgetMs);
    const scrollMs = mark() - t;
    t = mark();
    const fontWait = await page.evaluate((cap) => Promise.race([
      (document.fonts?.ready || Promise.resolve()).then(() => 'ready'),
      new Promise((resolve) => setTimeout(() => resolve('cap'), cap)),
    ]), fontCapMs);
    const fontMs = mark() - t;
    const partial = fontWait === 'cap';
    if (settleMs) await page.waitForTimeout(settleMs);

    const result = await page.evaluate(evaluate, { touch: vp.touch, viewportWidth: vp.width });
    const leadHtml = collectLeads
      ? await page.evaluate((cap) => (document.documentElement?.outerHTML || '').slice(0, cap), LEAD_HTML_CAP)
      : '';

    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    t = mark();
    await page.screenshot(screenshotOptions(outFile, {
      height, width: vp.width, maxShotHeight: config.maxShotHeight,
    }));
    const timings = { gotoMs, idleMs, scrollMs, fontMs, shotMs: mark() - t };
    const payload = { ...result, timings, partial };
    return leadHtml ? { ...payload, leadHtml } : payload;
  } finally {
    await context.close();
  }
}

export { VIEWPORTS };
