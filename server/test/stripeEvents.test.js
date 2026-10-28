import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAccountPayload,
  buildCheckoutSessionParams,
  checkoutEnabled,
  ownerIdFromSession,
  planTierUpdate,
  subscriptionPaid,
} from '../billing/stripeEvents.js';

test('checkoutEnabled requires secret and price', () => {
  assert.equal(checkoutEnabled({}), false);
  assert.equal(checkoutEnabled({ STRIPE_SECRET_KEY: 'sk' }), false);
  assert.equal(checkoutEnabled({ STRIPE_SECRET_KEY: 'sk', STRIPE_PRICE_ID: 'price_1' }), true);
});

test('buildAccountPayload maps Infinity inflight to null and default tier', () => {
  const body = buildAccountPayload(
    { ownerId: 'op' },
    { pageCap: 200, inflight: Infinity, baselineDays: null },
    {},
  );
  assert.deepEqual(body, {
    ownerId: 'op',
    tier: 'operator',
    pageCap: 200,
    inflight: null,
    baselineDays: null,
    checkout: false,
  });
});

test('ownerIdFromSession prefers client_reference_id', () => {
  assert.equal(ownerIdFromSession({ client_reference_id: 'a', metadata: { ownerId: 'b' } }), 'a');
  assert.equal(ownerIdFromSession({ metadata: { ownerId: 'b' } }), 'b');
  assert.equal(ownerIdFromSession({}), null);
});

test('planTierUpdate covers checkout, cancel, update, and failed invoice', () => {
  assert.deepEqual(planTierUpdate({
    type: 'checkout.session.completed',
    data: { object: { client_reference_id: 'logi-ink', customer: 'cus_1' } },
  }), { op: 'setTier', ownerId: 'logi-ink', tier: 'pro', customer: 'cus_1' });

  assert.deepEqual(planTierUpdate({
    type: 'customer.subscription.deleted',
    data: { object: { customer: 'cus_1' } },
  }), { op: 'setTierByCustomer', customer: 'cus_1', tier: 'free' });

  assert.equal(subscriptionPaid('active'), true);
  assert.equal(subscriptionPaid('past_due'), false);
  assert.deepEqual(planTierUpdate({
    type: 'customer.subscription.updated',
    data: { object: { customer: 'cus_1', status: 'active' } },
  }), { op: 'setTierByCustomer', customer: 'cus_1', tier: 'pro' });
  assert.deepEqual(planTierUpdate({
    type: 'customer.subscription.updated',
    data: { object: { customer: 'cus_1', status: 'unpaid' } },
  }), { op: 'setTierByCustomer', customer: 'cus_1', tier: 'free' });

  assert.deepEqual(planTierUpdate({
    type: 'invoice.payment_failed',
    data: { object: { customer: 'cus_2' } },
  }), { op: 'setTierByCustomer', customer: 'cus_2', tier: 'free' });

  assert.equal(planTierUpdate({ type: 'ping', data: { object: {} } }), null);
  assert.equal(planTierUpdate({
    type: 'checkout.session.completed',
    data: { object: {} },
  }), null);
});

test('buildCheckoutSessionParams uses defaults and owner metadata', () => {
  const params = buildCheckoutSessionParams('logi-ink', { STRIPE_PRICE_ID: 'price_x' });
  assert.equal(params.mode, 'subscription');
  assert.equal(params.client_reference_id, 'logi-ink');
  assert.deepEqual(params.metadata, { ownerId: 'logi-ink' });
  assert.equal(params.line_items[0].price, 'price_x');
  assert.match(params.success_url, /paid=1/);
});
