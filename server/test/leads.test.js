import test from 'node:test';
import assert from 'node:assert/strict';

test('junk emails are dropped and a real mailto is kept', async () => {
  const { extractLeads } = await import('../crawler/leads.js');
  const html = `
    <a href="mailto:noreply@shop.com">n</a>
    <a href="mailto:alerts@sentry.io">s</a>
    <a href="mailto:hello@example.com">e</a>
    <a href="mailto:logo@cdn.shop.png">i</a>
    <p>Ask the founder: <a href="mailto:ada@shop.com">Ada</a></p>
  `;
  const leads = extractLeads(html, 'https://shop.com/contact');
  assert.deepEqual(leads.emails, ['ada@shop.com']);
  assert.equal(leads.contacts.find((c) => c.value === 'ada@shop.com').role, 'founder');
});

test('JSON-LD organization and contact point supply name, email, and phone', async () => {
  const { extractLeads } = await import('../crawler/leads.js');
  const html = `
    <meta property="og:site_name" content="Fallback Co">
    <script type="application/ld+json">
      {"@type":"Organization","name":"Shop Demo","email":"owner@shop.com",
       "contactPoint":{"@type":"ContactPoint","name":"Press","email":"press@shop.com","telephone":"+1 555 0100"}}
    </script>
  `;
  const leads = extractLeads(html, 'https://shop.com/');
  assert.equal(leads.companyName, 'Shop Demo');
  assert.ok(leads.emails.includes('owner@shop.com'));
  assert.ok(leads.emails.includes('press@shop.com'));
  assert.equal(leads.contacts.find((c) => c.value === 'press@shop.com').role, 'press');
  assert.ok(leads.phones.includes('+15550100'));
});

test('company name falls back to og:site_name', async () => {
  const { extractLeads } = await import('../crawler/leads.js');
  const leads = extractLeads('<meta property="og:site_name" content="Northwind">', 'https://n.example/');
  assert.equal(leads.companyName, 'Northwind');
});

test('phones are normalized and non-numbers are dropped', async () => {
  const { extractLeads, normalizePhone } = await import('../crawler/leads.js');
  assert.equal(normalizePhone('call us'), '');
  assert.equal(normalizePhone('0000000'), '');
  const html = `<a href="tel:+1 (555) 123-4567">t</a><a href="https://wa.me/447700900123">w</a>`;
  const leads = extractLeads(html, 'https://shop.com/');
  assert.ok(leads.phones.includes('+15551234567'));
  assert.ok(leads.phones.includes('447700900123'));
});

test('share and tracking links are dropped, company profiles stay', async () => {
  const { extractLeads } = await import('../crawler/leads.js');
  const html = `
    <a href="https://twitter.com/intent/tweet?url=https%3A%2F%2Fshop.com">share</a>
    <a href="https://www.linkedin.com/company/shopdemo?utm_source=share&fbclid=1">in</a>
    <a href="https://calendly.com/shop/intro?utm_source=site">book</a>
  `;
  const leads = extractLeads(html, 'https://shop.com/');
  assert.deepEqual(leads.socials, ['https://www.linkedin.com/company/shopdemo']);
  assert.deepEqual(leads.bookingLinks, ['https://calendly.com/shop/intro']);
});

test('lead heat sums the public contact signals and caps at 100', async () => {
  const { scoreLeadHeat } = await import('../crawler/leads.js');
  assert.equal(scoreLeadHeat({}), 0);
  assert.equal(scoreLeadHeat({ emails: ['a@b.co'] }), 30);
  assert.equal(scoreLeadHeat({
    emails: ['a@b.co'],
    phones: ['+15551212'],
    bookingLinks: ['https://cal.com/a'],
    hasLeadForm: true,
    hasContact: true,
    hasPricing: true,
  }), 100);
});

test('page budget keeps the homepage and the best contact URL', async () => {
  const { selectTopRoiCandidates } = await import('../crawler/roiScorer.js');
  const urls = [
    'https://example.com/',
    'https://example.com/blog/post-1',
    'https://example.com/blog/post-2',
    'https://example.com/blog/post-3',
    'https://example.com/pricing',
    'https://example.com/contact',
  ];
  const top = selectTopRoiCandidates(urls, 2);
  assert.deepEqual(top, ['https://example.com/', 'https://example.com/contact']);
});
