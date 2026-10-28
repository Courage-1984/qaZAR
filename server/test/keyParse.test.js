import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authViaCookie,
  authViaKey,
  authViaPages,
  parseApiKeyEntry,
  parseApiKeysList,
  readBearerToken,
  readNamedCookie,
} from '../auth/keyParse.js';

test('parseApiKeyEntry requires keyId.secret.owner and keeps dotted secrets', () => {
  assert.equal(parseApiKeyEntry('a.b'), null);
  assert.deepEqual(parseApiKeyEntry('kid.sec.owner'), {
    keyId: 'kid', secret: 'sec', ownerId: 'owner',
  });
  assert.deepEqual(parseApiKeyEntry('kid.sec.ret.owner'), {
    keyId: 'kid', secret: 'sec.ret', ownerId: 'owner',
  });
  assert.deepEqual(parseApiKeysList(' a.b.c , bad , d.e.f '), [
    { keyId: 'a', secret: 'b', ownerId: 'c' },
    { keyId: 'd', secret: 'e', ownerId: 'f' },
  ]);
});

test('readNamedCookie and readBearerToken tolerate junk', () => {
  assert.equal(readNamedCookie('qazar_session=abc; other=1', 'qazar_session'), 'abc');
  assert.equal(readNamedCookie('qazar_session=%2Ftok', 'qazar_session'), '/tok');
  assert.equal(readNamedCookie('', 'qazar_session'), '');
  assert.equal(readBearerToken('Bearer xyz'), 'xyz');
  assert.equal(readBearerToken('Basic xyz'), '');
});

test('authVia helpers pin pages and partner publicCaller', () => {
  assert.equal(authViaKey({ keyId: 'k', ownerId: 'partner' }).publicCaller, true);
  assert.equal(authViaKey({ keyId: 'k', ownerId: 'operator' }).publicCaller, false);
  assert.equal(authViaCookie().via, 'cookie');
  assert.equal(authViaPages().keyId, 'pages');
});
