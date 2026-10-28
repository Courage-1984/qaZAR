import test from 'node:test';
import assert from 'node:assert/strict';
import { reportFindingsHtml, reportListHtml, reportMailtoHref } from '../report/reportHtml.js';

test('reportListHtml escapes items', () => {
  assert.match(reportListHtml(['<b>x</b>']), /&lt;b&gt;x&lt;\/b&gt;/);
});

test('reportFindingsHtml marks info as needs review', () => {
  const html = reportFindingsHtml([{
    severity: 'info', rule: 'contrast-indeterminate', observed: '1 of 1',
    totalOccurrences: 1, detail: 'maybe', selector: '#a',
  }]);
  assert.match(html, /Needs review/i);
  assert.match(html, /contrast-indeterminate/);
  assert.match(html, /#a/);
});

test('reportMailtoHref encodes subject and body', () => {
  const href = reportMailtoHref('a@b.com', 'ex.com', '4/5 captures', 'rid');
  assert.match(href, /^mailto:a@b\.com\?/);
  assert.match(href, /Audit%20findings/);
  assert.match(href, /rid/);
});
