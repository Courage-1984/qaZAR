/** True when Checkout can be offered (secret + price configured). */
export function checkoutEnabled(env = process.env) {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_ID);
}

/** Account JSON for a bearer key (Logi-Ink account screen). */
export function buildAccountPayload(auth, limits, env = process.env) {
  return {
    ownerId: auth.ownerId,
    tier: limits.tier || 'operator',
    pageCap: limits.pageCap,
    inflight: limits.inflight === Infinity ? null : limits.inflight,
    baselineDays: limits.baselineDays,
    checkout: checkoutEnabled(env),
  };
}

export function ownerIdFromSession(session) {
  return session?.client_reference_id || session?.metadata?.ownerId || null;
}

export function subscriptionPaid(status) {
  return status === 'active' || status === 'trialing';
}

/**
 * Pure Stripe event → tier mutation plan (no I/O).
 * Returns null when the event is ignored or incomplete.
 */
export function planTierUpdate(event) {
  const type = event?.type;
  const obj = event?.data?.object;
  if (!type || !obj) return null;

  if (type === 'checkout.session.completed') {
    const ownerId = ownerIdFromSession(obj);
    if (!ownerId) return null;
    return { op: 'setTier', ownerId, tier: 'pro', customer: obj.customer || null };
  }
  if (type === 'customer.subscription.deleted') {
    if (!obj.customer) return null;
    return { op: 'setTierByCustomer', customer: obj.customer, tier: 'free' };
  }
  if (type === 'customer.subscription.updated') {
    if (!obj.customer) return null;
    return {
      op: 'setTierByCustomer',
      customer: obj.customer,
      tier: subscriptionPaid(obj.status) ? 'pro' : 'free',
    };
  }
  if (type === 'invoice.payment_failed') {
    if (!obj.customer) return null;
    return { op: 'setTierByCustomer', customer: obj.customer, tier: 'free' };
  }
  return null;
}

export function buildCheckoutSessionParams(ownerId, env = process.env) {
  return {
    mode: 'subscription',
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: env.STRIPE_SUCCESS_URL || 'https://logi-ink.co.za/contact?paid=1',
    cancel_url: env.STRIPE_CANCEL_URL || 'https://logi-ink.co.za/contact',
    client_reference_id: ownerId,
    metadata: { ownerId },
  };
}
