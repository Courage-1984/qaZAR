import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authViaLogiInk,
  logiInkKeyMatches,
  logiInkOwnerEmail,
  requirePartnerOrOperatorOnPost,
} from '../auth/logiInkAuth.js';

test('logiInkKeyMatches is strict and empty-safe', () => {
  const env = { LOGI_INK_API_SECRET: 'partner-secret-value' };
  assert.equal(logiInkKeyMatches('partner-secret-value', env), true);
  assert.equal(logiInkKeyMatches('wrong', env), false);
  assert.equal(logiInkKeyMatches('', env), false);
  assert.equal(logiInkKeyMatches('partner-secret-value', {}), false);
});

test('logiInkOwnerEmail prefers LOGI_INK_OWNER_EMAIL then AGENCY_INBOX', () => {
  assert.equal(
    logiInkOwnerEmail({ LOGI_INK_OWNER_EMAIL: 'dennis@logi-ink.co.za', AGENCY_INBOX: 'other@x' }),
    'dennis@logi-ink.co.za',
  );
  assert.equal(logiInkOwnerEmail({ AGENCY_INBOX: 'agency@x' }), 'agency@x');
  assert.equal(logiInkOwnerEmail({}), '');
});

test('authViaLogiInk marks public partner ownership', () => {
  const auth = authViaLogiInk({ LOGI_INK_OWNER_ID: 'logi-ink' });
  assert.equal(auth.via, 'key');
  assert.equal(auth.ownerId, 'logi-ink');
  assert.equal(auth.publicCaller, true);
  assert.equal(auth.source, 'logi-ink');
});

function postReq(auth, origin) {
  return {
    method: 'POST',
    auth,
    get: (name) => (name === 'origin' ? origin : ''),
  };
}

test('requirePartnerOrOperatorOnPost allows GitHub Pages and blocks other anonymous POSTs', () => {
  const prev = process.env.LOGI_INK_API_SECRET;
  process.env.LOGI_INK_API_SECRET = 'set-for-gate';
  try {
    let status = 0;
    const res = { status: (n) => ({ json: () => { status = n; } }) };
    const nextOk = () => { status = 200; };
    requirePartnerOrOperatorOnPost(postReq({ via: 'pages' }, ''), res, nextOk);
    assert.equal(status, 401);
    status = 0;
    requirePartnerOrOperatorOnPost(postReq({ via: 'pages' }, 'https://evil.example'), res, nextOk);
    assert.equal(status, 401);
    status = 0;
    requirePartnerOrOperatorOnPost(
      postReq({ via: 'pages' }, 'https://courage-1984.github.io'),
      res,
      nextOk,
    );
    assert.equal(status, 200);
    status = 0;
    requirePartnerOrOperatorOnPost(postReq({ via: 'key' }, ''), res, nextOk);
    assert.equal(status, 200);
    status = 0;
    requirePartnerOrOperatorOnPost({ method: 'GET', auth: { via: 'pages' }, get: () => '' }, res, nextOk);
    assert.equal(status, 200);
  } finally {
    if (prev === undefined) delete process.env.LOGI_INK_API_SECRET;
    else process.env.LOGI_INK_API_SECRET = prev;
  }
});
