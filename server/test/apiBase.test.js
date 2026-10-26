import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeApiBase, usableApiBase } from '../../web/api.js';

const pages = { protocol: 'https:', hostname: 'courage-1984.github.io', origin: 'https://courage-1984.github.io' };
const local = { protocol: 'http:', hostname: 'localhost', origin: 'http://localhost:8787', port: '8787' };

test('normalize strips a pasted ?api= prefix and keeps the origin', () => {
  assert.equal(normalizeApiBase('?api=http://localhost:8787'), 'http://localhost:8787');
  assert.equal(normalizeApiBase('http://localhost:8787/'), 'http://localhost:8787');
  assert.equal(
    normalizeApiBase('https://courage-1984.github.io/qaZAR/?api=https%3A%2F%2Ftunnel.trycloudflare.com'),
    'https://tunnel.trycloudflare.com',
  );
});

test('github pages rejects localhost and accepts the public tunnel', () => {
  assert.equal(usableApiBase('?api=http://localhost:8787', pages), '');
  assert.equal(usableApiBase('http://127.0.0.1:8787', pages), '');
  assert.equal(usableApiBase('https://courage-1984.github.io', pages), '');
  assert.equal(usableApiBase('https://tunnel.trycloudflare.com', pages), 'https://tunnel.trycloudflare.com');
});

test('local http ui can still use localhost', () => {
  assert.equal(usableApiBase('http://localhost:8787', local), 'http://localhost:8787');
});

test('rejects non-http values', () => {
  assert.equal(normalizeApiBase('javascript:alert(1)'), '');
  assert.equal(normalizeApiBase('not a url'), '');
});
