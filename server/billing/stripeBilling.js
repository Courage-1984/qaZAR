import Stripe from 'stripe';
import { setTier, setTierByCustomer } from '../storage/sqliteDb.js';

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

export function applyEvent(event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const ownerId = session.client_reference_id || session.metadata?.ownerId;
    if (ownerId) setTier(ownerId, 'pro', session.customer || null);
  }
  if (event.type === 'customer.subscription.deleted') {
    const customer = event.data.object.customer;
    if (customer) setTierByCustomer(customer, 'free');
  }
}

export function webhookHandler(req, res) {
  try {
    const event = client().webhooks.constructEvent(
      req.body,
      req.get('stripe-signature'),
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    applyEvent(event);
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
