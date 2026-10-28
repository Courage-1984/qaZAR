import test from 'node:test';
import assert from 'node:assert/strict';
import {
  baselineObjectKey, baselineSitePrefix, runArtifactKey, runPrefix,
} from '../storage/s3Keys.js';

test('runArtifactKey and runPrefix nest under runs/', () => {
  assert.equal(runArtifactKey('rid', 'home/desktop.png'), 'runs/rid/home/desktop.png');
  assert.equal(runPrefix('rid'), 'runs/rid/');
});

test('baselineObjectKey includes owner segment and png', () => {
  const key = baselineObjectKey('acme', 'https://ex.com', 'home', 'desktop');
  assert.match(key, /^baselines\//);
  assert.match(key, /\/home\/desktop\.png$/);
  assert.match(baselineSitePrefix('acme', 'hash'), /^baselines\/.*\/hash\/$/);
});
