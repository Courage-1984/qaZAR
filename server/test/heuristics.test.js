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
  assert.equal(hit?.severity, 'info');
  const aa = violations.find((v) => v.rule === 'target-size-minimum');
  assert.equal(aa?.severity, 'warn');
});

async function check(file, { width, height, touch = false }) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch });
  const page = await context.newPage();
  await page.setContent(fs.readFileSync(path.join(FIXTURES, file), 'utf8'));
  const result = await page.evaluate(evaluate, { touch, viewportWidth: width });
  await context.close();
  return result.violations;
}

test('heuristics: 24px passes AA, spaced 20px passes, 48px shortfall is info', async () => {
  const violations = await check('targets.html', { width: 390, height: 844, touch: true });
  const of = (id) => violations.filter((v) => v.selector === `#${id}`);
  assert.equal(of('aa').some((v) => v.rule === 'target-size-minimum'), false);
  assert.equal(of('aa').find((v) => v.rule === 'touch-target-size')?.severity, 'info');
  assert.equal(of('one').some((v) => v.rule === 'target-size-minimum'), false);
  assert.equal(of('two').some((v) => v.rule === 'target-size-minimum'), false);
  assert.equal(of('inline').some((v) => v.rule === 'target-size-minimum'), false);
});

test('heuristics: body text under 16px is info', async () => {
  const violations = await check('font.html', { width: 1440, height: 900 });
  const hit = violations.find((v) => v.rule === 'body-font-size');
  assert.equal(hit?.severity, 'info');
});

test('heuristics: contrast compositing, indeterminate paints, and child colour', async () => {
  const violations = await check('contrast-cases.html', { width: 1440, height: 900 });
  const rules = (id) => violations.filter((v) => v.selector === `#${id}`).map((v) => v.rule);
  assert.ok(rules('ghost').includes('wcag-contrast'));
  assert.equal(rules('nested').includes('wcag-contrast'), false);
  assert.ok(rules('same').includes('wcag-contrast'));
  assert.equal(rules('same').includes('wcag-contrast-indeterminate'), false);
  for (const id of ['grad', 'photo', 'pseudo']) {
    assert.ok(rules(id).includes('wcag-contrast-indeterminate'), id);
    assert.equal(rules(id).includes('wcag-contrast'), false, id);
  }
  assert.equal(rules('parent').includes('wcag-contrast'), false);
  assert.equal(rules('child').includes('wcag-contrast'), false);
});

test('heuristics: clipped media passes and an escaping image fails', async () => {
  const violations = await check('media.html', { width: 390, height: 844 });
  const rules = (id) => violations.filter((v) => v.selector === `#${id}`).map((v) => v.rule);
  assert.equal(rules('clip').includes('media-bleed'), false);
  assert.ok(rules('wide').includes('media-bleed'));
  assert.ok(rules('left').includes('media-bleed'));
});

test('heuristics: decorative overlap is a warning and a covered control says so', async () => {
  const violations = await check('overlap.html', { width: 1440, height: 900 });
  const hits = violations.filter((v) => v.rule === 'element-collision');
  assert.ok(hits.length);
  assert.equal(hits.some((v) => v.severity === 'error'), false);
  assert.ok(hits.some((v) => v.detail.startsWith('Possible overlap') && !v.detail.includes('covering a control')));
  assert.ok(hits.some((v) => v.detail.includes('covering a control')));
});

test('heuristics: a hamburger outside the nav does not clear a broken menu', async () => {
  const violations = await check('nav.html', { width: 390, height: 844, touch: true });
  const navs = violations.filter((v) => v.rule === 'nav-not-collapsed');
  assert.ok(navs.some((v) => v.selector === '#open'));
  assert.ok(navs.some((v) => v.selector === '#empty'));
  assert.equal(navs.some((v) => v.selector === '#ok'), false);
});

test('heuristics: unnamed or non-keyboard menu toggles are flagged', async () => {
  const violations = await check('menu-toggle.html', { width: 390, height: 844, touch: true });
  assert.ok(violations.some((v) => v.rule === 'menu-toggle-keyboard'));
  assert.equal(violations.some((v) => v.rule === 'menu-toggle-name' && v.selector?.includes('ok')), false);
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
