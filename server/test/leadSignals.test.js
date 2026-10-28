import test from 'node:test';
import assert from 'node:assert/strict';
import { isJunkEmail, phoneDigits, scoreLeadHeat } from '../crawler/leadSignals.js';

test('isJunkEmail rejects noreply and asset-like addresses', () => {
  assert.equal(isJunkEmail('ada@shop.com'), false);
  assert.equal(isJunkEmail('noreply@shop.com'), true);
  assert.equal(isJunkEmail('not-an-email'), true);
  assert.equal(isJunkEmail('x@cdn.example.png'), true);
});

test('phoneDigits keeps E.164-ish values and drops junk', () => {
  assert.equal(phoneDigits('tel:+1 (555) 123-4567'), '+15551234567');
  assert.equal(phoneDigits('5551234567'), '5551234567');
  assert.equal(phoneDigits('call us'), '');
  assert.equal(phoneDigits('0000000'), '');
  assert.equal(phoneDigits('1111111'), '');
});

test('scoreLeadHeat sums signals and caps at 100', () => {
  assert.equal(scoreLeadHeat({}), 0);
  assert.equal(scoreLeadHeat({
    emails: ['a'], phones: ['1'], bookingLinks: ['b'], hasLeadForm: true, hasContact: true, hasPricing: true,
  }), 100);
  assert.equal(scoreLeadHeat({ emails: ['a', 'b'], phones: ['1'] }), 50);
});
