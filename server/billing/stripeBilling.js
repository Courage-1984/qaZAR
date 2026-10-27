import Stripe from 'stripe';
import { setTier, setTierByCustomer } from '../storage/db.js';
import { limitsFor } from '../quota/enforce.js';

function client() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function createCheckout(ownerId) {
  const session = await client().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: process.env.STRIPE_SUCCESS_URL || 'https://logi-ink.co.za/contact?paid=1',
    cancel_url: process.env.STRIPE_CANCEL_URL || 'https://logi-ink.co.za/contact',
    client_reference_id: ownerId,
    metadata: { ownerId },
  });
  return session.url;
}

export async function applyEvent(event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const ownerId = session.client_reference_id || session.metadata?.ownerId;
    if (ownerId) await setTier(ownerId, 'pro', session.customer || null);
  }
  if (event.type === 'customer.subscription.deleted') {
    const customer = event.data.object.customer;
    if (customer) await setTierByCustomer(customer, 'free');
  }
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object;
    const customer = sub.customer;
    if (!customer) return;
    const paid = ['active', 'trialing'].includes(sub.status);
    await setTierByCustomer(customer, paid ? 'pro' : 'free');
  }
  if (event.type === 'invoice.payment_failed') {
    const customer = event.data.object.customer;
    if (customer) await setTierByCustomer(customer, 'free');
  }
}

export async function webhookHandler(req, res) {
  try {
    const event = client().webhooks.constructEvent(
      req.body,
      req.get('stripe-signature'),
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    await applyEvent(event);
    res.json({ received: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

export async function checkoutHandler(req, res) {
  if (req.auth?.via !== 'key') return res.status(401).json({ error: 'Unauthorized' });
  try {
    res.json({ url: await createCheckout(req.auth.ownerId) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

/** Current tier + quotas for a bearer key (Logi-Ink account screen). */
export async function accountHandler(req, res) {
  if (req.auth?.via !== 'key') return res.status(401).json({ error: 'Unauthorized' });
  const limits = await limitsFor(req.auth);
  res.json({
    ownerId: req.auth.ownerId,
    tier: limits.tier || 'operator',
    pageCap: limits.pageCap,
    inflight: limits.inflight === Infinity ? null : limits.inflight,
    baselineDays: limits.baselineDays,
    checkout: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
  });
}
