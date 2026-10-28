/**
 * Logi-Ink branded audit mail. HTTP providers (Resend/Postmark) are default.
 * Optional SMTP: set SMTP_HOST and install nodemailer (`npm i nodemailer`).
 */
import { logiInkOwnerEmail } from '../auth/logiInkAuth.js';

const BRAND = 'Logi-Ink';
const ACCENT = '#c45c26';

export function resolveAgencyInbox(env = process.env) {
  return logiInkOwnerEmail(env) || String(env.AGENCY_INBOX || '').trim();
}

export function resolveAgencyBrand(env = process.env) {
  return String(env.AGENCY_BRAND || BRAND).trim() || BRAND;
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shell({ title, lead, bullets, ctaLabel, ctaHref, footnote }) {
  const list = (bullets || []).map((b) => `<li style="margin:0 0 8px">${esc(b)}</li>`).join('');
  const cta = ctaHref
    ? `<p style="margin:28px 0 0"><a href="${esc(ctaHref)}" style="display:inline-block;padding:14px 22px;background:${ACCENT};color:#fff;text-decoration:none;font-weight:600;border-radius:4px">${esc(ctaLabel || 'View report')}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ee;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e6e0d6;padding:32px 28px;text-align:left">
        <tr><td>
          <p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${ACCENT}">${esc(BRAND)}</p>
          <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">${esc(title)}</h1>
          <p style="margin:0 0 18px;font-size:16px;line-height:1.55">${esc(lead)}</p>
          ${list ? `<ul style="margin:0;padding:0 0 0 18px;font-size:15px;line-height:1.5">${list}</ul>` : ''}
          ${cta}
          <p style="margin:28px 0 0;font-size:13px;color:#5c564c">${esc(footnote || '')}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Prospect-facing HTML (no scraped contacts). */
export function buildProspectHtml(run, { shareUrl = '' } = {}) {
  const domain = run.input?.domain || 'your site';
  const name = run.input?.prospectName || '';
  const greet = name ? `${name}, your` : 'Your';
  return shell({
    title: `${greet} viewport audit is ready`,
    lead: `We finished the Logi-Ink / qaZAR audit for ${domain}. The PDF is attached — grade, component failures, and a remediation vs rebuild path.`,
    bullets: [
      'Seven fixed viewports (ultrawide → mobile)',
      'UI/UX heuristics + visual regression summary',
      'Clear next step: remediate the current stack or rebuild lean with Logi-Ink',
    ],
    ctaLabel: 'Open shareable report',
    ctaHref: shareUrl || undefined,
    footnote: 'Reply to this email and Dennis James Webster will walk you through the findings.',
  });
}

/** Internal copy for Dennis James Webster (follow-up owner). */
export function buildOwnerHtml(run, { shareUrl = '' } = {}) {
  const domain = run.input?.domain || run.id;
  const prospect = run.input?.prospectEmail || '(no prospect email)';
  const name = run.input?.prospectName || '';
  return shell({
    title: `Follow-up: audit for ${domain}`,
    lead: 'Internal notification. Own the client conversation — prospect PDF attached.',
    bullets: [
      `Prospect: ${name || '—'} <${prospect}>`,
      `Domain: ${domain}`,
      `Share: ${shareUrl || `/api/share/${run.shareToken || ''}`}`,
      run.summary ? `Captures: ${run.summary.captures}` : 'Captures: —',
    ],
    ctaLabel: 'Open share payload',
    ctaHref: shareUrl || undefined,
    footnote: 'Route external client communication from this inbox.',
  });
}

export function buildProspectText(run) {
  const domain = run.input?.domain || '';
  return `Your Logi-Ink audit for ${domain} is attached. Reply to book a walkthrough with Dennis James Webster.`;
}

export function buildOwnerText(run) {
  const domain = run.input?.domain || '';
  const share = `/api/share/${run.shareToken || ''}`;
  const lines = [
    `Audit finished for ${domain}.`,
    `Share path: ${share}`,
    `Prospect: ${run.input?.prospectEmail || '—'}`,
    run.summary ? `Captures: ${run.summary.captures}` : '',
    'Own external follow-up from this copy.',
  ];
  return lines.filter(Boolean).join('\n');
}

/**
 * Optional Nodemailer SMTP path. Returns null when SMTP_HOST is unset.
 * Requires the optional `nodemailer` package when SMTP is used.
 */
export async function sendViaSmtp({
  to, from, replyTo, subject, text, html, filename, contentBase64, env = process.env,
}) {
  if (!env.SMTP_HOST) return null;
  let nodemailer;
  try {
    nodemailer = await import('nodemailer');
  } catch {
    throw new Error('SMTP_HOST is set but nodemailer is not installed');
  }
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: String(env.SMTP_SECURE || '') === '1',
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS || '' } : undefined,
  });
  const attachments = contentBase64
    ? [{ filename: filename || 'Logi-Ink-audit.pdf', content: Buffer.from(contentBase64, 'base64'), contentType: 'application/pdf' }]
    : [];
  await transport.sendMail({
    from, to, replyTo, subject, text, html, attachments,
  });
  return { via: 'smtp', to };
}
