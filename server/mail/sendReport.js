import fs from 'node:fs';
import { storage } from '../storage/storageAdapter.js';
import { buildMailBodies, buildMailRequest, isMailConfigured } from './mailBodies.js';
import {
  buildOwnerHtml,
  buildProspectHtml,
  resolveAgencyInbox,
  sendViaSmtp,
} from '../report/mailer.js';

function pdfBase64(runId) {
  const file = storage.getArtifactPath(runId, 'report.pdf');
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file).toString('base64');
}

function shareUrlFor(run) {
  const base = String(process.env.QAZAR_PUBLIC_BASE || '').replace(/\/$/, '');
  const path = `/api/share/${run.shareToken || ''}`;
  return base ? `${base}${path}` : path;
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
 * Sends the PDF to Dennis (agency inbox) and, when present, the prospect.
 * Prefer SMTP when SMTP_HOST is set; otherwise Resend/Postmark HTTP APIs.
 */
export async function sendReport({ run, fetchImpl = fetch }) {
  const toProspect = run.input?.prospectEmail || '';
  const agency = resolveAgencyInbox();
  if (!isMailConfigured()) {
    if (toProspect) throw new Error('mail is not configured');
    return { skipped: true };
  }
  const content = pdfBase64(run.id);
  if (!content) throw new Error('report.pdf is missing');
  const text = buildMailBodies(run);
  const from = process.env.MAIL_FROM || process.env.SMTP_FROM || '';
  const provider = (process.env.MAIL_PROVIDER || 'resend').toLowerCase();
  const replyTo = agency || from;
  const subject = `Logi-Ink audit — ${run.input?.domain || run.id}`;
  const shareUrl = shareUrlFor(run);
  const htmlByTo = {
    [agency]: buildOwnerHtml(run, { shareUrl }),
    [toProspect]: buildProspectHtml(run, { shareUrl }),
  };
  const recipients = [agency, toProspect].filter(Boolean);
  for (const to of recipients) {
    const body = to === toProspect ? text.prospect : text.agency;
    const html = htmlByTo[to];
    const smtp = await sendViaSmtp({
      to, from, replyTo, subject, text: body, html,
      filename: text.filename, contentBase64: content,
    });
    if (smtp) continue;
    const req = buildMailRequest({
      provider,
      from,
      to,
      replyTo,
      subject,
      body,
      html,
      filename: text.filename,
      content,
      apiKey: process.env.MAIL_API_KEY,
    });
    await post(req.url, req.headers, req.payload, fetchImpl);
  }
  return { sent: recipients.length };
}
