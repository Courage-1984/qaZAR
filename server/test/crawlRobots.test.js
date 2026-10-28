import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyRobotRules, robotRulesFromParsed, robotsLoadMiss, robotsLoadOk,
} from '../crawler/crawlRobots.js';

test('emptyRobotRules pins zero crawl-delay and empty lists', () => {
  assert.deepEqual(emptyRobotRules(), { disallows: [], allows: [], crawlDelay: 0 });
});

test('robotRulesFromParsed defaults crawlDelay and tolerates missing fields', () => {
  assert.deepEqual(robotRulesFromParsed({ disallows: ['/x'], allows: ['/y'] }), {
    disallows: ['/x'], allows: ['/y'], crawlDelay: 0,
  });
  assert.equal(robotRulesFromParsed({ crawlDelay: 2.5 }).crawlDelay, 2.5);
});

test('robotsLoadOk and robotsLoadMiss set hasRobotsTxt', () => {
  assert.equal(robotsLoadOk({ disallows: [] }).hasRobotsTxt, true);
  assert.equal(robotsLoadMiss().hasRobotsTxt, false);
});
