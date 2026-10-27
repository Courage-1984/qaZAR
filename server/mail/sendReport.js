import fs from 'node:fs';
import { storage } from '../storage/storageAdapter.js';

function pdfBase64(runId) {
  const file = storage.getArtifactPath(runId, 'report.pdf');
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file).toString('base64');
}

function bodies(run, pdf) {
  const domain = run.input?.domain || '';
  const share = `/api/share/${run.shareToken}`;
  const agency = [
    `Audit finished for ${domain}.`,
    `Share path: ${share}`,
    run.summary ? `Captures: ${run.summary.captures}` : '',
  ].filter(Boolean).join('\n');
  const prospect = `Your qaZAR audit for ${domain} is attached.`;
  return {
    agency,
    prospect,
    filename: 'qaZAR-audit.pdf',
    content: pdf,
  };
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
  if (!process.env.MAIL_API_KEY || !process.env.MAIL_FROM) {
    if (toProspect) throw new Error('mail is not configured');
    return { skipped: true };
  }
  const content = pdfBase64(run.id);
  if (!content) throw new Error('report.pdf is missing');
  const text = bodies(run, content);
  const from = process.env.MAIL_FROM;
  const provider = (process.env.MAIL_PROVIDER || 'resend').toLowerCase();
  const recipients = [agency, toProspect].filter(Boolean);
  for (const to of recipients) {
    const copy = to === toProspect ? text.prospect : text.agency;
    if (provider === 'postmark') {
      await post('https://api.postmarkapp.com/email', { 'X-Postmark-Server-Token': process.env.MAIL_API_KEY }, {
        From: from,
        To: to,
        ReplyTo: agency || from,
        Subject: `qaZAR audit — ${run.input?.domain || run.id}`,
        TextBody: copy,
        Attachments: [{ Name: text.filename, Content: content, ContentType: 'application/pdf' }],
      }, fetchImpl);
    } else {
      await post('https://api.resend.com/emails', { Authorization: `Bearer ${process.env.MAIL_API_KEY}` }, {
        from,
        to: [to],
        reply_to: agency || from,
        subject: `qaZAR audit — ${run.input?.domain || run.id}`,
        text: copy,
        attachments: [{ filename: text.filename, content }],
      }, fetchImpl);
    }
  }
  return { sent: recipients.length };
}
