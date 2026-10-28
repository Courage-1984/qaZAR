import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePdfReport } from '../report/pdfReport.js';

test('PDF HTML is a document, not the on-screen report chrome', () => {
  const domain = 'https://evil.example/<script>';
  const html = generatePdfReport({
    id: 'run-pdf',
    createdAt: '2026-10-27T12:00:00.000Z',
    input: { domain },
    pages: [],
    summary: { changed: 0 },
  }, 'consulting@qazar.dev', { agency: 'Logi-Ink' });
  assert.match(html, /grade/i);
  assert.equal(html.includes('Verified Domain Ownership'), false);
  assert.equal(html.includes(domain), false);
  assert.match(html, /evil\.example\/&lt;script&gt;/);
  assert.equal(html.includes('btn-print'), false);
  assert.equal(html.includes('summary-md'), false);
  assert.match(html, /Reply to consulting@qazar\.dev/);
  assert.match(html, /Logi-Ink/);
});

test('PDF HTML includes stack, funnel, viewport errors, and capture time', () => {
  const html = generatePdfReport({
    id: 'run-rich',
    createdAt: '2026-10-27T12:00:00.000Z',
    input: { domain: 'https://shop.example' },
    captureMs: 6400,
    crawlMs: 52,
    siteProfile: {
      techStack: ['Shopify'],
      avgResponseTimeMs: 120,
      security: { score: 80 },
      funnel: { hasPricing: true },
    },
    pages: [{
      viewports: {
        mobile: { violations: [{ severity: 'error', rule: 'touch-target' }] },
      },
    }],
    summary: { changed: 0 },
  });
  assert.match(html, /Shopify/);
  assert.match(html, /80\/100/);
  assert.match(html, /pricing/);
  assert.match(html, /<td>mobile<\/td><td>1<\/td>/);
  assert.match(html, /Capture 6400 ms/);
});
