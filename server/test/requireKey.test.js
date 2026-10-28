import test from 'node:test';
import assert from 'node:assert/strict';
import { requireKeyAuth } from '../auth/requireKey.js';

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

test('requireKeyAuth accepts via=key and rejects pages/cookie', () => {
  const ok = mockRes();
  assert.equal(requireKeyAuth({ auth: { via: 'key', ownerId: 'p' } }, ok), true);
  assert.equal(ok.statusCode, 200);

  const pages = mockRes();
  assert.equal(requireKeyAuth({ auth: { via: 'pages' } }, pages), false);
  assert.equal(pages.statusCode, 401);
  assert.deepEqual(pages.body, { error: 'Unauthorized' });

  const cookie = mockRes();
  assert.equal(requireKeyAuth({ auth: { via: 'cookie' } }, cookie), false);
  assert.equal(cookie.statusCode, 401);
});
