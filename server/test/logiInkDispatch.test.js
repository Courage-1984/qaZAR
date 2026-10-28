import test from 'node:test';
import assert from 'node:assert/strict';
import { attachAuth } from '../auth/apiKey.js';

function mockReq(headers = {}) {
  return {
    headers,
    get(name) {
      const key = String(name).toLowerCase();
      if (key === 'x-api-key') return headers['x-api-key'];
      if (key === 'authorization') return headers.authorization;
      if (key === 'cookie') return headers.cookie;
      return undefined;
    },
  };
}

test('attachAuth accepts matching Logi-Ink x-api-key', async () => {
  const prev = process.env.LOGI_INK_API_SECRET;
  process.env.LOGI_INK_API_SECRET = 'logi-dispatch-secret';
  try {
    const req = mockReq({ 'x-api-key': 'logi-dispatch-secret' });
    let next = false;
    await new Promise((resolve) => {
      attachAuth(req, { status: () => ({ json: resolve }) }, () => {
        next = true;
        resolve();
      });
    });
    assert.equal(next, true);
    assert.equal(req.auth.source, 'logi-ink');
    assert.equal(req.auth.via, 'key');
    assert.equal(req.auth.ownerId, 'logi-ink');
  } finally {
    if (prev === undefined) delete process.env.LOGI_INK_API_SECRET;
    else process.env.LOGI_INK_API_SECRET = prev;
  }
});

test('attachAuth rejects bad Logi-Ink x-api-key', async () => {
  const prev = process.env.LOGI_INK_API_SECRET;
  process.env.LOGI_INK_API_SECRET = 'logi-dispatch-secret';
  try {
    const req = mockReq({ 'x-api-key': 'nope' });
    let code = 0;
    await new Promise((resolve) => {
      attachAuth(req, {
        status(n) {
          code = n;
          return { json: () => resolve() };
        },
      }, () => resolve());
    });
    assert.equal(code, 401);
  } finally {
    if (prev === undefined) delete process.env.LOGI_INK_API_SECRET;
    else process.env.LOGI_INK_API_SECRET = prev;
  }
});
