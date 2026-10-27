import { getBrowser } from '../engine/capturePage.js';
import { storage } from '../storage/storageAdapter.js';

/** Render the executive report HTML to report.pdf. Worker process only. */
export async function renderReportPdf(html, runId) {
  const browser = await getBrowser();
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.emulateMedia({ media: 'print' });
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    storage.writeArtifact(runId, 'report.pdf', pdf);
    return pdf;
  } finally {
    await context.close();
  }
}
