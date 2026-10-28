import test from 'node:test';
import assert from 'node:assert/strict';
import { createOwnerId, ownerScopeFromAuth } from '../http/authScope.js';

test('ownerScopeFromAuth scopes only via=key', () => {
  assert.equal(ownerScopeFromAuth({ via: 'key', ownerId: 'a' }), 'a');
  assert.equal(ownerScopeFromAuth({ via: 'pages', ownerId: 'a' }), null);
  assert.equal(ownerScopeFromAuth(null), null);
});

test('createOwnerId defaults to operator', () => {
  assert.equal(createOwnerId({ ownerId: 'x' }), 'x');
  assert.equal(createOwnerId(null), 'operator');
});
