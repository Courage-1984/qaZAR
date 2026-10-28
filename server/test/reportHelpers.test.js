import test from 'node:test';
import assert from 'node:assert/strict';
import { pathOf, seoScoreColor, summarizeSeoInfo } from '../report/seoHelpers.js';
import {
  contactKindLabel, isNotSalesContact, leadContactRows,
} from '../report/leadHelpers.js';

test('pathOf keeps path+search and tolerates junk', () => {
  assert.equal(pathOf('https://ex.com/a?b=1#x'), '/a?b=1');
  assert.equal(pathOf('https://ex.com'), '/');
  assert.equal(pathOf('not a url'), 'not a url');
});

test('seoScoreColor and summarizeSeoInfo pin report thresholds', () => {
  assert.equal(seoScoreColor(69), '#ef4444');
  assert.equal(seoScoreColor(70), '#f59e0b');
  assert.equal(seoScoreColor(90), '#10b981');
  assert.equal(
    summarizeSeoInfo([
      { id: 'seo-title-long', severity: 'info' },
      { id: 'seo-title-long', severity: 'info' },
      { id: 'seo-missing-title', severity: 'error' },
      { id: 'seo-custom', severity: 'info' },
    ]),
    '2 long titles · 1 seo-custom',
  );
});

test('leadContactRows prefers rich contacts and flattens legacy lists', () => {
  const rich = { leadContacts: { contacts: [{ value: 'a@b.com', kind: 'email' }] } };
  assert.equal(leadContactRows(rich).length, 1);
  const flat = leadContactRows({
    leadContacts: { emails: ['x@y.com'], phones: ['+1'], socials: ['https://x'] },
  });
  assert.equal(flat.length, 3);
  assert.equal(flat[0].kind, 'email');
  assert.equal(contactKindLabel('phone'), 'Phone');
  assert.equal(contactKindLabel('other'), 'Email');
  assert.equal(isNotSalesContact('legal@ex.com'), true);
  assert.equal(isNotSalesContact('sales@ex.com'), false);
});
