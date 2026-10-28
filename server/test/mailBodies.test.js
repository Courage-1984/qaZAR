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
  assert.equal(bodies.filename, 'qaZAR-audit.pdf');
  assert.match(bodies.agency, /https:\/\/shop\.example/);
  assert.match(bodies.agency, /\/api\/share\/tok-1/);
  assert.match(bodies.agency, /Captures: 7/);
  assert.equal(bodies.prospect, 'Your qaZAR audit for https://shop.example is attached.');
  const blob = JSON.stringify(bodies);
  assert.equal(blob.includes('hidden@'), false);
  assert.equal(blob.includes('ada@'), false);
});

test('buildMailBodies tolerates missing summary and domain', () => {
  const bodies = buildMailBodies({ shareToken: 'x', input: {} });
  assert.equal(bodies.agency.includes('Captures:'), false);
  assert.equal(bodies.prospect, 'Your qaZAR audit for  is attached.');
});

test('buildMailRequest shapes resend and postmark payloads', () => {
  const base = {
    from: 'qa@example.com',
    to: 'agency@example.com',
    replyTo: 'agency@example.com',
    subject: 'qaZAR audit — https://shop.example',
    body: 'hello',
    filename: 'qaZAR-audit.pdf',
    content: 'cGRm',
    apiKey: 'k',
  };
  const resend = buildMailRequest({ ...base, provider: 'resend' });
  assert.equal(resend.url, 'https://api.resend.com/emails');
  assert.equal(resend.headers.Authorization, 'Bearer k');
  assert.deepEqual(resend.payload.to, ['agency@example.com']);
  assert.equal(resend.payload.reply_to, 'agency@example.com');

  const postmark = buildMailRequest({ ...base, provider: 'postmark' });
  assert.equal(postmark.url, 'https://api.postmarkapp.com/email');
  assert.equal(postmark.headers['X-Postmark-Server-Token'], 'k');
  assert.equal(postmark.payload.To, 'agency@example.com');
  assert.equal(postmark.payload.Attachments[0].ContentType, 'application/pdf');
});

test('isMailConfigured requires key and from', () => {
  assert.equal(isMailConfigured({ MAIL_API_KEY: 'k', MAIL_FROM: 'a@b.c' }), true);
  assert.equal(isMailConfigured({ MAIL_API_KEY: 'k' }), false);
  assert.equal(isMailConfigured({ MAIL_FROM: 'a@b.c' }), false);
  assert.equal(isMailConfigured({}), false);
});
