import { generateExecutiveReport } from '../report/reportGenerator.js';
import { renderReportPdf } from '../report/renderPdf.js';
import { sendReport } from '../mail/sendReport.js';
import { storage } from '../storage/storageAdapter.js';
import { save } from '../storage/runStore.js';
import { enqueue } from './sqliteQueue.js';

const BACKOFF = [60_000, 5 * 60_000, 15 * 60_000];

async function ensurePdf(run) {
  if (storage.hasArtifact(run.id, 'report.pdf')) return;
  const html = generateExecutiveReport(run, process.env.AGENCY_INBOX || 'consulting@qazar.dev');
  await renderReportPdf(html, run.id);
}

/** Write the PDF and send mail. Mail failure enqueues a retry and does not recrawl. */
export async function finishRun(run) {
  try {
    await ensurePdf(run);
    await sendReport({ run });
    if (run.emailError) {
      run.emailError = null;
      save(run);
    }
  } catch (e) {
    run.emailError = String(e.message || e).split('\n')[0];
    save(run);
    enqueue(run.id, 'email', BACKOFF[0]);
  }
}

export async function deliverMail(run) {
  await ensurePdf(run);
  await sendReport({ run });
  if (run.emailError) {
    run.emailError = null;
    save(run);
  }
}

export { BACKOFF };
