import test from 'node:test';
import assert from 'node:assert/strict';
import { isRobotsRuleField, robotsLineParts } from '../crawler/robotsLine.js';

test('robotsLineParts strips comments and splits field/value', () => {
  assert.equal(robotsLineParts(''), null);
  assert.equal(robotsLineParts('# only comment'), null);
  assert.deepEqual(robotsLineParts('Disallow: /private # note'), { field: 'disallow', val: '/private' });
  assert.deepEqual(robotsLineParts('Crawl-delay: 1.5'), { field: 'crawl-delay', val: '1.5' });
});

test('isRobotsRuleField pins allow disallow crawl-delay', () => {
  assert.equal(isRobotsRuleField('allow'), true);
  assert.equal(isRobotsRuleField('sitemap'), false);
});
