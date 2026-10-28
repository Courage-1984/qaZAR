import test from 'node:test';
import assert from 'node:assert/strict';
import { originAllowed } from '../util/originAllowed.js';

test('originAllowed accepts empty, localhost, github pages, and logi-ink', () => {
  assert.equal(originAllowed(''), true);
  assert.equal(originAllowed(undefined), true);
  assert.equal(originAllowed('http://localhost:5173'), true);
  assert.equal(originAllowed('http://127.0.0.1:8787'), true);
  assert.equal(originAllowed('https://courage-1984.github.io'), true);
  assert.equal(originAllowed('https://logi-ink.co.za'), true);
  assert.equal(originAllowed('https://www.logi-ink.co.za'), true);
});

test('originAllowed rejects junk and unknown hosts unless allowlisted', () => {
  assert.equal(originAllowed('not-a-url'), false);
  assert.equal(originAllowed('https://evil.example'), false);
  assert.equal(originAllowed('https://evil.example', ['https://evil.example']), true);
});
