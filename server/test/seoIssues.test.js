import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalFlags,
  dupGroups,
  isVagueTitle,
  pageIssues,
  scoreSeoPages,
} from '../crawler/seoIssues.js';

test('isVagueTitle and pageIssues pin missing title and noindex', () => {
  assert.equal(isVagueTitle('Home'), true);
  assert.equal(isVagueTitle('Pricing Plans'), false);
  const issues = pageIssues({
    url: 'https://x.com/',
    noindex: true,
    title: '',
    description: 'long enough description for shoppers',
    h1Count: 1,
    hasJsonLd: true,
    lang: 'en',
    hasOg: true,
    canonical: 'https://x.com/',
  });
  assert.ok(issues.some((i) => i.id === 'seo-noindex' && i.severity === 'error'));
  assert.ok(issues.some((i) => i.id === 'seo-missing-title'));
});

test('scoreSeoPages and dupGroups pin deductions', () => {
  assert.equal(scoreSeoPages([{ title: 'A', description: 'd', h1Count: 1 }], 0, 0), 100);
  assert.equal(scoreSeoPages([{ title: '', description: 'd', h1Count: 1 }], 0, 0), 80);
  assert.equal(scoreSeoPages([{ title: 'A', description: 'd', h1Count: 1, noindex: true }], 0, 0), 75);
  const groups = dupGroups([
    { title: 'Same' },
    { title: ' same ' },
    { title: 'Other' },
  ], 'title');
  assert.equal(groups.length, 1);
  assert.equal(groups[0].length, 2);
});

test('canonicalFlags marks relative and offsite', () => {
  assert.deepEqual(canonicalFlags('/a', 'https://x.com/'), { canonicalRelative: true, canonicalOffsite: false });
  assert.deepEqual(
    canonicalFlags('https://other.com/a', 'https://x.com/'),
    { canonicalRelative: false, canonicalOffsite: true },
  );
  assert.deepEqual(
    canonicalFlags('https://x.com/a', 'https://x.com/'),
    { canonicalRelative: false, canonicalOffsite: false },
  );
});
