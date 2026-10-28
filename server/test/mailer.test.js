import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOwnerHtml,
  buildProspectHtml,
  buildOwnerText,
  buildProspectText,
  resolveAgencyInbox,
  resolveAgencyBrand,
} from '../report/mailer.js';

const run = {
  id: 'r1',
  shareToken: 'tok-1',
  input: {
    domain: 'https://shop.example',
    prospectEmail: 'ada@shop.example',
    prospectName: 'Ada',
  },
  summary: { captures: 7 },
  siteProfile: { leadContacts: { emails: ['hidden@shop.example'] } },
};

test('branded HTML omits scraped contacts and names Dennis', () => {
  const prospect = buildProspectHtml(run, { shareUrl: 'https://api.example/api/share/tok-1' });
  const owner = buildOwnerHtml(run, { shareUrl: 'https://api.example/api/share/tok-1' });
  assert.match(prospect, /Logi-Ink/);
  assert.match(prospect, /Ada/);
  assert.match(prospect, /Dennis James Webster/);
  assert.match(owner, /Follow-up/);
  assert.match(owner, /ada@shop\.example/);
  assert.equal(prospect.includes('hidden@'), false);
  assert.equal(owner.includes('hidden@'), false);
});

test('text bodies stay contact-safe for prospects', () => {
  assert.match(buildProspectText(run), /Logi-Ink audit/);
  assert.match(buildOwnerText(run), /\/api\/share\/tok-1/);
  assert.equal(buildProspectText(run).includes('hidden@'), false);
});

test('resolveAgency helpers honour env', () => {
  assert.equal(resolveAgencyBrand({ AGENCY_BRAND: 'Acme' }), 'Acme');
  assert.equal(resolveAgencyBrand({}), 'Logi-Ink');
  assert.equal(
    resolveAgencyInbox({ LOGI_INK_OWNER_EMAIL: 'dennis@logi-ink.co.za' }),
    'dennis@logi-ink.co.za',
  );
});
