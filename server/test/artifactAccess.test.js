import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  parseArtifactPath, canReadArtifact, isPathInside, MEDIA,
} from '../routes/artifactAccess.js';

test('parseArtifactPath accepts nested media and rejects traversal', () => {
  assert.deepEqual(parseArtifactPath('/run-1/shots/home/desktop.png'), {
    runId: 'run-1',
    rel: 'shots/home/desktop.png',
  });
  assert.equal(parseArtifactPath('/run-1'), null);
  assert.equal(parseArtifactPath('/run-1/../etc/passwd'), null);
  assert.equal(parseArtifactPath(''), null);
});

test('canReadArtifact enforces owner keys and anonymous media-only', () => {
  const run = { id: 'r1', ownerId: 'logi-ink' };
  assert.equal(canReadArtifact({ via: 'key', ownerId: 'logi-ink' }, run, 'shots/a.png'), true);
  assert.equal(canReadArtifact({ via: 'key', ownerId: 'other' }, run, 'shots/a.png'), false);
  assert.equal(canReadArtifact({ via: 'pages' }, run, 'shots/a.png'), true);
  assert.equal(canReadArtifact({ via: 'pages' }, run, 'run.json'), false);
  assert.equal(canReadArtifact({ via: 'cookie' }, run, 'run.json'), true);
  assert.equal(canReadArtifact({ via: 'pages' }, run, 'report.pdf'), true);
  assert.equal(MEDIA.test('x.PNG'), true);
});

test('isPathInside blocks sibling escape', () => {
  const root = path.resolve('/tmp/qazar-runs/abc');
  assert.equal(isPathInside(root, path.join(root, 'shots', 'x.png')), true);
  assert.equal(isPathInside(root, path.join(root, '..', 'other', 'x.png')), false);
  assert.equal(isPathInside(root, root), false);
});
