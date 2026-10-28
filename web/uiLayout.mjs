/**
 * Screenshot submit, results, and the executive report at the 7 viewports.
 * Fails when the page scrolls sideways or a control is under 48px.
 */
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { VIEWPORTS } from '../server/engine/viewports.js';
import { generateExecutiveReport } from '../server/report/reportGenerator.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(root, 'web', 'ui-shots');
const VPS = ['ultrawide', 'fhd', 'macbook', 'desktop', 'laptop', 'tablet', 'mobile'];

function capture(name) {
  return {
    status: name === 'mobile' ? 'changed' : 'ok',
    violations: name === 'mobile' ? [{ severity: 'error', rule: 'touch-target', selector: 'a.buy', detail: 'Tap target is 32px' }] : [],
    diffPercent: name === 'mobile' ? 1.2 : 0,
  };
}

const detail = {
  id: 'run_fixture',
  status: 'done',
  createdAt: '2026-10-27T10:00:00.000Z',
  input: { domain: 'https://example.com', pages: ['/pricing'] },
  progress: { pagesDone: 1, pagesTotal: 1, capturesDone: 7, capturesTotal: 7 },
  summary: { violations: { error: 1, warn: 0 }, changed: 1, new: 0 },
  siteProfile: {
    avgResponseTimeMs: 180,
    techStack: ['Next.js'],
    hasMissingViewportMeta: false,
    funnel: { hasPricing: true },
    assetHygiene: {},
    socialSharing: { pageCount: 1, openGraphPages: 1, canonicalPages: 1, hasOpenGraph: true, hasCanonical: true },
    leadContacts: { emails: ['ada@example.com'], phones: [], socials: [] },
    seo: { score: 82, issues: [{ id: 'seo-missing-h1', severity: 'warn', url: 'https://example.com/pricing', detail: 'Page has no H1.' }], pages: [] },
  },
  pages: [{
    url: 'https://example.com/pricing',
    slug: 'pricing',
    roi: { label: 'Pricing', score: 80 },
    viewports: Object.fromEntries(VPS.map((name) => [name, capture(name)])),
  }],
};

const listItem = {
  id: detail.id,
  status: detail.status,
  createdAt: detail.createdAt,
  input: detail.input,
  progress: detail.progress,
  summary: detail.summary,
};

const measure = () => {
  const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  const controls = [...document.querySelectorAll('button, a, input, textarea')].flatMap((el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return [];
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return [];
    if (r.width >= 48 && r.height >= 48) return [];
    const text = (el.innerText || el.getAttribute('aria-label') || el.id || el.tagName).replace(/\s+/g, ' ').slice(0, 48);
    return [`${el.tagName} "${text}" ${Math.round(r.width)}x${Math.round(r.height)}`];
  });
  return { overflow, controls };
};

async function shoot(page, name, vp) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  const box = await page.evaluate(measure);
  const problems = [];
  if (box.overflow > 1) problems.push(`horizontal overflow ${box.overflow}px`);
  if (box.controls.length) problems.push(`small controls: ${box.controls.join('; ')}`);
  await page.screenshot({ path: path.join(shots, `${name}-${vp.name}.png`), fullPage: true });
  if (problems.length) throw new Error(`${name} @ ${vp.name}: ${problems.join(' | ')}`);
}

async function mockApi(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/health')) return route.fulfill({ json: { ok: true, name: 'qaZAR' } });
    if (url.includes('/api/runs/run_fixture')) return route.fulfill({ json: detail });
    if (url.includes('/api/runs')) return route.fulfill({ json: [listItem] });
    if (url.includes('github.com') || url.includes('githubusercontent')) return route.fulfill({ status: 404, body: '' });
    return route.continue();
  });
}

const server = await preview({
  configFile: path.join(root, 'web/vite.config.js'),
  preview: { port: 4173, strictPort: true, host: '127.0.0.1' },
});
const base = server.resolvedUrls?.local?.[0] || 'http://127.0.0.1:4173/';
const browser = await chromium.launch();
const failures = [];
try {
  await rm(shots, { recursive: true, force: true });
  await mkdir(shots, { recursive: true });
  const reportHtml = generateExecutiveReport(detail, 'leads@example.com');
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await mockApi(page);
    try {
      await page.goto(new URL('index.html', base).href, { waitUntil: 'networkidle' });
      await page.locator('#run-form').waitFor();
      await shoot(page, 'submit', vp);
      await page.goto(new URL('results.html', base).href, { waitUntil: 'networkidle' });
      await page.locator('.run-card').waitFor();
      await shoot(page, 'list', vp);
      await page.goto(new URL('results.html?id=run_fixture', base).href, { waitUntil: 'networkidle' });
      await page.locator('#matrix').waitFor();
      await shoot(page, 'detail', vp);
      await page.setContent(reportHtml, { waitUntil: 'load' });
      await page.locator('.grade-card').waitFor();
      await shoot(page, 'report', vp);
    } catch (err) {
      failures.push(err.message);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`UI layout ok. Screenshots in ${shots}`);
