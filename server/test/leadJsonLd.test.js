import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLeadLdAcc, readLeadJsonLd, walkLeadLd } from '../crawler/leadJsonLd.js';

test('walkLeadLd picks Organization name email and ContactPoint role', () => {
  const acc = emptyLeadLdAcc();
  walkLeadLd({
    '@type': 'Organization',
    name: 'Acme &amp; Co',
    email: 'hello@acme.com',
    telephone: '+15551212',
    contactPoint: { '@type': 'ContactPoint', name: 'Sales desk', email: 'sales@acme.com' },
  }, acc);
  assert.equal(acc.companyName, 'Acme & Co');
  assert.ok(acc.emails.some((e) => e.email === 'hello@acme.com'));
  assert.ok(acc.emails.some((e) => e.email === 'sales@acme.com' && e.role === 'sales'));
  assert.ok(acc.phones.includes('+15551212'));
});

test('readLeadJsonLd skips invalid blocks and keeps valid ones', () => {
  const html = `
    <script type="application/ld+json">{bad</script>
    <script type="application/ld+json">{"@type":"Organization","name":"Beta","email":"b@c.com"}</script>
  `;
  const acc = readLeadJsonLd(html);
  assert.equal(acc.companyName, 'Beta');
  assert.equal(acc.emails[0].email, 'b@c.com');
});
