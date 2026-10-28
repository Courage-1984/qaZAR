import Stripe from 'stripe';
import { setTier, setTierByCustomer } from '../storage/db.js';
import { limitsFor } from '../quota/enforce.js';
import {
  buildAccountPayload,
  buildCheckoutSessionParams,
  planTierUpdate,
} from './stripeEvents.js';

function client() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function createCheckout(ownerId) {
  const session = await client().checkout.sessions.create(
    buildCheckoutSessionParams(ownerId),
  );
  return session.url;
}

export async function applyEvent(event) {
  const plan = planTierUpdate(event);
  if (!plan) return;
  if (plan.op === 'setTier') {
    await setTier(plan.ownerId, plan.tier, plan.customer);
    return;
  }
  await setTierByCustomer(plan.customer, plan.tier);
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
  res.json(buildAccountPayload(req.auth, limits));
}
