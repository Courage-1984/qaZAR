import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateV4 } from '../routes/privateV4.js';

test('isPrivateV4 covers RFC1918 CGNAT loopback and link-local', () => {
  assert.equal(isPrivateV4(10, 0), true);
  assert.equal(isPrivateV4(172, 16), true);
  assert.equal(isPrivateV4(172, 32), false);
  assert.equal(isPrivateV4(192, 168), true);
  assert.equal(isPrivateV4(100, 64), true);
  assert.equal(isPrivateV4(8, 8), false);
});
