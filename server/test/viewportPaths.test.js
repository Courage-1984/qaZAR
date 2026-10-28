import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  asPosixRel,
  emptyViewportRecord,
  viewportCaptureOptions,
  viewportShotRels,
} from '../queue/viewportPaths.js';

test('viewportShotRels nests shot base and diff under slug', () => {
  const rels = viewportShotRels('home', 'mobile');
  assert.equal(rels.shot, path.join('shots', 'home', 'mobile.png'));
  assert.equal(rels.base, path.join('base', 'home', 'mobile.png'));
  assert.equal(rels.diff, path.join('diffs', 'home', 'mobile.png'));
  assert.equal(asPosixRel(path.join('shots', 'a', 'b.png')), 'shots/a/b.png');
});

test('viewportCaptureOptions pins desktop leads and public fast mode', () => {
  assert.deepEqual(
    viewportCaptureOptions({ input: { deterministic: true, publicCaller: true } }, { name: 'desktop' }),
    { collectLeads: true, deterministic: true, fast: true },
  );
  assert.deepEqual(
    viewportCaptureOptions({ input: {} }, { name: 'mobile' }),
    { collectLeads: false, deterministic: false, fast: false },
  );
  assert.equal(emptyViewportRecord().status, 'pending');
  assert.deepEqual(emptyViewportRecord().violations, []);
});
