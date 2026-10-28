/** Agency + prospect copy for the audit PDF. Never includes scraped contacts. */
export function buildMailBodies(run) {
  const domain = run.input?.domain || '';
  const share = `/api/share/${run.shareToken}`;
  const agency = [
    `Audit finished for ${domain}.`,
    `Share path: ${share}`,
    run.summary ? `Captures: ${run.summary.captures}` : '',
  ].filter(Boolean).join('\n');
  return {
    agency,
    prospect: `Your qaZAR audit for ${domain} is attached.`,
    filename: 'qaZAR-audit.pdf',
  };
}

/**
 * Provider HTTP request for one recipient.
 * `provider` is already lower-cased (`resend` default).
 */
export function buildMailRequest({
  provider, from, to, replyTo, subject, body, filename, content, apiKey,
}) {
  if (provider === 'postmark') {
    return {
      url: 'https://api.postmarkapp.com/email',
      headers: { 'X-Postmark-Server-Token': apiKey },
      payload: {
        From: from,
        To: to,
        ReplyTo: replyTo,
        Subject: subject,
        TextBody: body,
        Attachments: [{ Name: filename, Content: content, ContentType: 'application/pdf' }],
      },
    };
  }
  return {
    url: 'https://api.resend.com/emails',
    headers: { Authorization: `Bearer ${apiKey}` },
    payload: {
      from,
      to: [to],
      reply_to: replyTo,
      subject,
      text: body,
      attachments: [{ filename, content }],
    },
  };
}

/** True when MAIL_API_KEY and MAIL_FROM are both set. */
export function isMailConfigured(env = process.env) {
  return Boolean(env.MAIL_API_KEY && env.MAIL_FROM);
}
