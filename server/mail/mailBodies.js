/** Agency + prospect copy for the audit PDF. Never includes scraped contacts. */
import {
  buildOwnerText, buildProspectText,
} from '../report/mailer.js';

export function buildMailBodies(run) {
  return {
    agency: buildOwnerText(run),
    prospect: buildProspectText(run),
    filename: 'Logi-Ink-audit.pdf',
  };
}

/**
 * Provider HTTP request for one recipient.
 * `provider` is already lower-cased (`resend` default).
 * Optional `html` for branded templates.
 */
export function buildMailRequest({
  provider, from, to, replyTo, subject, body, html, filename, content, apiKey,
}) {
  if (provider === 'postmark') {
    const payload = {
      From: from,
      To: to,
      ReplyTo: replyTo,
      Subject: subject,
      TextBody: body,
      Attachments: [{ Name: filename, Content: content, ContentType: 'application/pdf' }],
    };
    if (html) payload.HtmlBody = html;
    return {
      url: 'https://api.postmarkapp.com/email',
      headers: { 'X-Postmark-Server-Token': apiKey },
      payload,
    };
  }
  const payload = {
    from,
    to: [to],
    reply_to: replyTo,
    subject,
    text: body,
    attachments: [{ filename, content }],
  };
  if (html) payload.html = html;
  return {
    url: 'https://api.resend.com/emails',
    headers: { Authorization: `Bearer ${apiKey}` },
    payload,
  };
}

/** True when MAIL_API_KEY and MAIL_FROM are both set. */
export function isMailConfigured(env = process.env) {
  return Boolean(env.MAIL_API_KEY && env.MAIL_FROM) || Boolean(env.SMTP_HOST);
}
