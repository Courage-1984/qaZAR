import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qazar-mail-'));
process.env.DATA_DIR = dir;
process.env.MAIL_API_KEY = 'mail-key';
process.env.MAIL_FROM = 'qa@example.com';
process.env.AGENCY_INBOX = 'agency@example.com';
process.env.MAIL_PROVIDER = 'resend';

const { config } = await import('../config.js');
config.dataDir = dir;
const { storage } = await import('../storage/storageAdapter.js');
const { sendReport } = await import('../mail/sendReport.js');

test('mail goes to the agency and the prospect without scraped contacts', async () => {
  const run = {
    id: 'run-mail',
    shareToken: 'share-mail',
    input: { domain: 'https://shop.example', prospectEmail: 'ada@shop.example' },
    siteProfile: { leadContacts: { emails: ['hidden@shop.example'] } },
    summary: { captures: 7 },
  };
  storage.writeArtifact(run.id, 'report.pdf', Buffer.from('pdf'));
  const calls = [];
  await sendReport({
    run,
    fetchImpl: async (url, opts) => {
      calls.push({ url, body: JSON.parse(opts.body) });
      return { ok: true };
    },
  });
  assert.equal(calls.length, 2);
  const blob = JSON.stringify(calls);
  assert.equal(blob.includes('hidden@shop.example'), false);
  assert.equal(blob.includes('ada@shop.example'), true);
  assert.equal(blob.includes('agency@example.com'), true);
  assert.equal(calls[0].body.reply_to, 'agency@example.com');
});

test('the API process does not import the PDF renderer', () => {
  const src = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
  assert.equal(src.includes('renderReportPdf'), false);
  assert.equal(src.includes('capturePage'), false);
});
