import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addUnique,
  asStringList,
  cleanSocial,
  decodeLeadText,
  pushContact,
  roleNear,
} from '../crawler/leadParse.js';

test('cleanSocial keeps profiles and drops share intents', () => {
  assert.equal(cleanSocial('https://www.linkedin.com/company/acme'), 'https://www.linkedin.com/company/acme');
  assert.equal(cleanSocial('https://twitter.com/intent/tweet?text=hi'), '');
  assert.equal(cleanSocial('https://facebook.com/acme'), '');
  assert.equal(cleanSocial('https://github.com/'), '');
  assert.equal(cleanSocial('not-a-url'), '');
});

test('roleNear and pushContact pin role fill and dedupe', () => {
  const html = '<p>Talk to our sales team</p><a href="mailto:ada@shop.com">ada</a>';
  const idx = html.indexOf('mailto:');
  assert.equal(roleNear(html, idx), 'sales');
  const list = [];
  const seen = new Set();
  pushContact(list, seen, { value: 'ada@shop.com', kind: 'email', role: '' });
  pushContact(list, seen, { value: 'ada@shop.com', kind: 'email', role: 'sales' });
  assert.equal(list.length, 1);
  assert.equal(list[0].role, 'sales');
  for (let i = 0; i < 20; i++) pushContact(list, seen, { value: `u${i}@shop.com`, kind: 'email', role: '' });
  assert.equal(list.length, 12);
});

test('decodeLeadText, asStringList, addUnique', () => {
  assert.equal(decodeLeadText('Acme &amp; Co'), 'Acme & Co');
  assert.deepEqual(asStringList(['a', 1, null, {}]), ['a', 1]);
  const out = [];
  addUnique(out, 'x');
  addUnique(out, 'x');
  addUnique(out, '');
  assert.deepEqual(out, ['x']);
});
