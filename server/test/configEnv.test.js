import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConfigFields,
  dbDriverFromEnv,
  envCsvList,
  envFlagTrue,
  envNumber,
  tunnelEnabled,
} from '../configEnv.js';

test('envNumber envFlagTrue and envCsvList pin defaults', () => {
  assert.equal(envNumber(undefined, 8787), 8787);
  assert.equal(envNumber('12', 0), 12);
  assert.equal(envNumber('x', 3), 3);
  assert.equal(envFlagTrue('1'), true);
  assert.equal(envFlagTrue('0'), false);
  assert.deepEqual(envCsvList(' a, b ,,c '), ['a', 'b', 'c']);
});

test('tunnelEnabled and dbDriverFromEnv respect kill switches', () => {
  assert.equal(tunnelEnabled([], {}), true);
  assert.equal(tunnelEnabled(['--no-tunnel'], {}), false);
  assert.equal(tunnelEnabled([], { NO_TUNNEL: '1' }), false);
  assert.equal(tunnelEnabled([], { QAZAR_TUNNEL: '0' }), false);
  assert.equal(dbDriverFromEnv({}), 'sqlite');
  assert.equal(dbDriverFromEnv({ DATABASE_URL: 'postgres://x' }), 'postgres');
});

test('buildConfigFields maps PORT and ALLOW_PRIVATE', () => {
  const cfg = buildConfigFields({ PORT: '9000', ALLOW_PRIVATE: '1', PAGE_CONCURRENCY: '8' }, []);
  assert.equal(cfg.port, 9000);
  assert.equal(cfg.allowPrivate, true);
  assert.equal(cfg.pageConcurrency, 8);
  assert.equal(cfg.tunnel, true);
  assert.equal(cfg.maxShotHeight, 12000);
  assert.equal(cfg.diffThresholdPercent, 0.1);
});
