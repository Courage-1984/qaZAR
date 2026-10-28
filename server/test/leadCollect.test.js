import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectBookingLinks, collectLeadEmails, collectLeadPhones, leadListsFromContacts, metaContent,
} from '../crawler/leadCollect.js';

test('metaContent reads first matching property', () => {
  const html = `<meta property="og:site_name" content="Acme &amp; Co"><meta property="og:site_name" content="Other">`;
  assert.equal(metaContent(html, 'og:site_name'), 'Acme & Co');
});

test('collectLeadEmails prefers mailto and skips junk', () => {
  const contacts = [];
  const seen = new Set();
  const html = `mailto:noreply@x.com mailto:hello@acme.com`;
  collectLeadEmails(html, 'https://acme.com/', contacts, seen);
  assert.deepEqual(contacts.map((c) => c.value), ['hello@acme.com']);
});

test('collectLeadPhones and booking links normalize values', () => {
  const contacts = [];
  const seen = new Set();
  collectLeadPhones('tel:+1 (555) 123-4567', 'https://a/', contacts, seen, []);
  assert.ok(contacts[0]?.value.includes('555'));
  assert.deepEqual(
    collectBookingLinks('https://calendly.com/acme/intro?utm=1'),
    ['https://calendly.com/acme/intro'],
  );
});

test('leadListsFromContacts caps lists by kind', () => {
  const contacts = [
    { kind: 'email', value: 'a@b.com' },
    { kind: 'phone', value: '+15551212' },
    { kind: 'social', value: 'https://linkedin.com/company/x' },
  ];
  assert.deepEqual(leadListsFromContacts(contacts), {
    emails: ['a@b.com'], phones: ['+15551212'], socials: ['https://linkedin.com/company/x'],
  });
});
