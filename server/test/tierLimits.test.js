import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../config.js';
import { isOperator } from '../quota/enforce.js';
import { operatorLimits, partnerTierLimits } from '../quota/tierLimits.js';

test('isOperator treats missing auth, pages, and operator key as operator', () => {
  assert.equal(isOperator(null), true);
  assert.equal(isOperator({ via: 'pages', ownerId: 'operator' }), true);
  assert.equal(isOperator({ via: 'cookie', ownerId: 'operator' }), true);
  assert.equal(isOperator({ via: 'key', ownerId: 'operator' }), true);
  assert.equal(isOperator({ via: 'key', ownerId: 'logi-ink' }), false);
});

test('operatorLimits are uncapped with null baselineDays', () => {
  const limits = operatorLimits();
  assert.equal(limits.limited, false);
  assert.equal(limits.pageCap, config.maxPagesCap);
  assert.equal(limits.inflight, Infinity);
  assert.equal(limits.baselineDays, null);
});

test('partnerTierLimits pins free and pro quotas', () => {
  const free = partnerTierLimits('free');
  assert.deepEqual(free, {
    limited: true,
    tier: 'free',
    pageCap: config.publicMaxPages,
    inflight: 1,
    baselineDays: 14,
  });
  const pro = partnerTierLimits('pro');
  assert.deepEqual(pro, {
    limited: true,
    tier: 'pro',
    pageCap: 50,
    inflight: 3,
    baselineDays: 365,
  });
  assert.deepEqual(partnerTierLimits('unknown'), free);
});
