import { getBrowser } from '../engine/capturePage.js';
import { storage } from '../storage/storageAdapter.js';
import { esc } from './esc.js';

/** Render the A4 audit document. Worker process only. */
export async function renderReportPdf(html, runId, meta = {}) {
  const browser = await getBrowser();
  const context = await browser.newContext();
  const agency = esc(meta.agency || 'qaZAR');
  const domain = esc(meta.domain || '');
  const chrome = 'font-size:9px;width:100%;padding:0 12mm;color:#444;font-family:system-ui,sans-serif;';
  try {
    const page = await context.newPage();
    await page.emulateMedia({ media: 'print' });
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="${chrome}">${agency} · ${domain}</div>`,
      footerTemplate: `<div style="${chrome}display:flex;justify-content:space-between;"><span>${domain}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
      margin: { top: '16mm', bottom: '16mm', left: '12mm', right: '12mm' },
    });
    storage.writeArtifact(runId, 'report.pdf', pdf);
    return pdf;
  } finally {
    await context.close();
  }
}
