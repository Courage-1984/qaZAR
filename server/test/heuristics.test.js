import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { evaluate } from '../heuristics/evaluate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures');

let browser;

test.before(async () => {
  browser = await chromium.launch();
});

test.after(async () => {
  if (browser) await browser.close();
});

test('heuristics: clean page has zero violations', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const html = fs.readFileSync(path.join(FIXTURES, 'clean.html'), 'utf8');
  await page.setContent(html);

  const { violations } = await page.evaluate(evaluate, { touch: false, viewportWidth: 1440 });
  await context.close();

  assert.equal(violations.length, 0);
});

test('heuristics: detects horizontal overflow', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const html = fs.readFileSync(path.join(FIXTURES, 'overflow.html'), 'utf8');
  await page.setContent(html);

  const { violations } = await page.evaluate(evaluate, { touch: false, viewportWidth: 1440 });
  await context.close();

  const hit = violations.find((v) => v.rule.startsWith('h-overflow'));
  assert.ok(hit, 'Expected h-overflow violation');
});

test('heuristics: detects small touch target on touch viewports', async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  const html = fs.readFileSync(path.join(FIXTURES, 'touch.html'), 'utf8');
  await page.setContent(html);

  const { violations } = await page.evaluate(evaluate, { touch: true, viewportWidth: 390 });
  await context.close();

  const hit = violations.find((v) => v.rule === 'touch-target-size');
  assert.ok(hit, 'Expected touch-target-size violation on mobile');
});

test('heuristics: detects low WCAG contrast ratio', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const html = fs.readFileSync(path.join(FIXTURES, 'contrast.html'), 'utf8');
  await page.setContent(html);

  const { violations } = await page.evaluate(evaluate, { touch: false, viewportWidth: 1440 });
  await context.close();

  const hit = violations.find((v) => v.rule === 'wcag-contrast');
  assert.ok(hit, 'Expected wcag-contrast violation');
});
