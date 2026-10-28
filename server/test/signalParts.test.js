import test from 'node:test';
import assert from 'node:assert/strict';
import { contactsOf, funnelOf, performanceOf } from '../crawler/signalParts.js';

test('performanceOf flags compression and counts assets', () => {
  const html = '<script src="/a.js"></script><img src="/x.png">';
  const got = performanceOf(html, (n) => (n === 'content-encoding' ? 'gzip' : null));
  assert.equal(got.compressed, true);
  assert.ok(got.unlazyImages >= 1);
});

test('funnelOf and contactsOf pin pricing path and lead lists', () => {
  const funnel = funnelOf('<form><input type="email"></form>', 'https://ex.com/pricing');
  assert.equal(funnel.isPricing, true);
  assert.equal(funnel.hasLeadForm, true);
  assert.deepEqual(contactsOf({ emails: ['a@b.com'], phones: [], socials: [] }).emails, ['a@b.com']);
});
