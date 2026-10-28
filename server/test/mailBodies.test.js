import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMailBodies, buildMailRequest, isMailConfigured } from '../mail/mailBodies.js';

const run = {
  id: 'r1',
  shareToken: 'tok-1',
  input: { domain: 'https://shop.example', prospectEmail: 'ada@shop.example' },
  siteProfile: { leadContacts: { emails: ['hidden@shop.example'] } },
  summary: { captures: 7 },
};

test('buildMailBodies omits scraped contacts and includes share path', () => {
  const bodies = buildMailBodies(run);
  assert.equal(bodies.filename, 'Logi-Ink-audit.pdf');
  assert.match(bodies.agency, /https:\/\/shop\.example/);
  assert.match(bodies.agency, /\/api\/share\/tok-1/);
  assert.match(bodies.agency, /Captures: 7/);
  assert.match(bodies.prospect, /Logi-Ink audit for https:\/\/shop\.example/);
  const blob = JSON.stringify(bodies);
  assert.equal(blob.includes('hidden@'), false);
});

test('buildMailBodies tolerates missing summary and domain', () => {
  const bodies = buildMailBodies({ shareToken: 'x', input: {} });
  assert.equal(bodies.agency.includes('Captures:'), false);
  assert.match(bodies.prospect, /Logi-Ink audit/);
});

test('buildMailRequest shapes resend and postmark payloads with optional html', () => {
  const base = {
    from: 'qa@example.com',
    to: 'agency@example.com',
    replyTo: 'agency@example.com',
    subject: 'Logi-Ink audit — https://shop.example',
    body: 'hello',
    html: '<p>hello</p>',
    filename: 'Logi-Ink-audit.pdf',
    content: 'cGRm',
    apiKey: 'k',
  };
  const resend = buildMailRequest({ ...base, provider: 'resend' });
  assert.equal(resend.url, 'https://api.resend.com/emails');
  assert.equal(resend.headers.Authorization, 'Bearer k');
  assert.deepEqual(resend.payload.to, ['agency@example.com']);
  assert.equal(resend.payload.reply_to, 'agency@example.com');
  assert.equal(resend.payload.html, '<p>hello</p>');

  const postmark = buildMailRequest({ ...base, provider: 'postmark' });
  assert.equal(postmark.url, 'https://api.postmarkapp.com/email');
  assert.equal(postmark.headers['X-Postmark-Server-Token'], 'k');
  assert.equal(postmark.payload.To, 'agency@example.com');
  assert.equal(postmark.payload.HtmlBody, '<p>hello</p>');
  assert.equal(postmark.payload.Attachments[0].ContentType, 'application/pdf');
});

test('isMailConfigured accepts HTTP keys or SMTP host', () => {
  assert.equal(isMailConfigured({ MAIL_API_KEY: 'k', MAIL_FROM: 'a@b.c' }), true);
  assert.equal(isMailConfigured({ SMTP_HOST: 'smtp.example' }), true);
  assert.equal(isMailConfigured({ MAIL_API_KEY: 'k' }), false);
  assert.equal(isMailConfigured({ MAIL_FROM: 'a@b.c' }), false);
  assert.equal(isMailConfigured({}), false);
});
