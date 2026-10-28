import fs from 'node:fs';
import { storage } from '../storage/storageAdapter.js';
import { buildMailBodies, buildMailRequest, isMailConfigured } from './mailBodies.js';

function pdfBase64(runId) {
  const file = storage.getArtifactPath(runId, 'report.pdf');
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file).toString('base64');
}

async function post(url, headers, payload, fetchImpl) {
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`mail provider returned ${res.status}`);
}

/**
 * @param {{ run: object, fetchImpl?: typeof fetch }} opts
 * Sends the PDF to the agency and, when present, the prospect. The prospect
 * body does not include scraped contacts.
 */
export async function sendReport({ run, fetchImpl = fetch }) {
  const toProspect = run.input?.prospectEmail || '';
  const agency = process.env.AGENCY_INBOX || '';
  if (!isMailConfigured()) {
    if (toProspect) throw new Error('mail is not configured');
    return { skipped: true };
  }
  const content = pdfBase64(run.id);
  if (!content) throw new Error('report.pdf is missing');
  const text = buildMailBodies(run);
  const from = process.env.MAIL_FROM;
  const provider = (process.env.MAIL_PROVIDER || 'resend').toLowerCase();
  const replyTo = agency || from;
  const subject = `qaZAR audit — ${run.input?.domain || run.id}`;
  const recipients = [agency, toProspect].filter(Boolean);
  for (const to of recipients) {
    const body = to === toProspect ? text.prospect : text.agency;
    const req = buildMailRequest({
      provider,
      from,
      to,
      replyTo,
      subject,
      body,
      filename: text.filename,
      content,
      apiKey: process.env.MAIL_API_KEY,
    });
    await post(req.url, req.headers, req.payload, fetchImpl);
  }
  return { sent: recipients.length };
}
