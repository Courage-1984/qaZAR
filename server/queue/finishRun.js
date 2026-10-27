import { generatePdfReport } from '../report/pdfReport.js';
import { renderReportPdf } from '../report/renderPdf.js';
import { sendReport } from '../mail/sendReport.js';
import { storage } from '../storage/storageAdapter.js';
import { save } from '../storage/runStore.js';
import { enqueue } from './jobs.js';

const BACKOFF = [60_000, 5 * 60_000, 15 * 60_000];

export function emailErrorLine(err) {
  return String(err?.message || err).split('\n')[0];
}

async function clearEmailError(run) {
  if (!run.emailError) return;
  run.emailError = null;
  await save(run);
}

async function ensurePdf(run) {
  if (storage.hasArtifact(run.id, 'report.pdf')) return;
  const agency = process.env.AGENCY_INBOX || 'consulting@qazar.dev';
  const html = generatePdfReport(run, agency);
  await renderReportPdf(html, run.id, { agency, domain: run.input?.domain || '' });
}

/** Write the PDF and send mail. Mail failure enqueues a retry and does not recrawl. */
export async function finishRun(run) {
  try {
    await ensurePdf(run);
    await sendReport({ run });
    await clearEmailError(run);
  } catch (e) {
    run.emailError = emailErrorLine(e);
    await save(run);
    await enqueue(run.id, 'email', BACKOFF[0]);
  }
}

export async function deliverMail(run) {
  await ensurePdf(run);
  await sendReport({ run });
  await clearEmailError(run);
}

export { BACKOFF };
