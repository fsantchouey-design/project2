const express = require('express');
const router = express.Router();
const User = require('../models/User');
const StripeEvent = require('../models/StripeEvent');
const PricingConfig = require('../models/PricingConfig');

// Credits granted per subscription plan (monthly reset)
const PLAN_CREDITS = {
  essential: 250,
  creator:   700,
  studioPro: 1800
};

// Credits granted per one-time pack purchase
const PACK_CREDITS = {
  '100': 100, '250': 250, '500': 500,
  '1000': 1000, '2000': 2000, '4000': 4000
};

// Env var names for each plan's Stripe Price IDs
const PLAN_ENV_PRICES = {
  essential: { monthly: 'STRIPE_PRICE_ESSENTIAL_MONTHLY', annual: 'STRIPE_PRICE_ESSENTIAL_ANNUAL' },
  creator:   { monthly: 'STRIPE_PRICE_CREATOR_MONTHLY',   annual: 'STRIPE_PRICE_CREATOR_ANNUAL' },
  studioPro: { monthly: 'STRIPE_PRICE_STUDIO_MONTHLY',    annual: 'STRIPE_PRICE_STUDIO_ANNUAL' }
};

// Resolve a Stripe priceId → planKey by checking DB then env vars
async function priceIdToPlanKey(priceId) {
  if (!priceId) return null;
  const config = await PricingConfig.findOne({});
  if (config) {
    for (const key of ['essential', 'creator', 'studioPro']) {
      const plan = config[key];
      if (plan && (plan.stripePriceIdMonthly === priceId || plan.stripePriceIdAnnual === priceId)) {
        return key;
      }
    }
  }
  for (const [planKey, envKeys] of Object.entries(PLAN_ENV_PRICES)) {
    if (process.env[envKeys.monthly] === priceId || process.env[envKeys.annual] === priceId) {
      return planKey;
    }
  }
  return null;
}

// POST / — Stripe sends raw body; verify signature if STRIPE_WEBHOOK_SECRET is set
router.post('/', async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error('[Webhook] ❌ STRIPE_SECRET_KEY not set');
    return res.status(500).send('Stripe not configured');
  }

  const stripe = require('stripe')(stripeKey);
  let event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const sig = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // No secret configured — parse body directly (dev / first-run only)
      event = JSON.parse(req.body.toString());
      console.warn('[Webhook] ⚠️  STRIPE_WEBHOOK_SECRET not set — signature NOT verified');
    }
  } catch (err) {
    console.error('[Webhook] ❌ Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency — skip events already processed
  try {
    await StripeEvent.create({ stripeEventId: event.id });
  } catch (err) {
    if (err.code === 11000) {
      console.log(`[Webhook] ⏭  Event ${event.id} already processed, skipping`);
      return res.json({ received: true });
    }
    throw err;
  }

  console.log(`[Webhook] 📩 ${event.type} (${event.id})`);

  try {
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(event.data.object);
    } else if (event.type === 'invoice.payment_succeeded') {
      await handleInvoicePaymentSucceeded(event.data.object);
    }
  } catch (err) {
    // Return 200 so Stripe doesn't retry — logic errors are logged, not fatal
    console.error(`[Webhook] ❌ Handler error (${event.type}):`, err);
  }

  res.json({ received: true });
});

// ── checkout.session.completed ────────────────────────────────────────────────
async function handleCheckoutCompleted(session) {
  const userId    = session.metadata && session.metadata.userId;
  const planKey   = session.metadata && session.metadata.planKey;
  const billing   = session.metadata && session.metadata.billing;
  const packSize  = session.metadata && session.metadata.packSize;

  if (!userId) {
    console.error('[Webhook] ❌ checkout.session.completed — no userId in metadata');
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    console.error(`[Webhook] ❌ checkout.session.completed — user not found: ${userId}`);
    return;
  }

  if (!user.subscription) user.subscription = {};

  // Always save the Stripe customer ID when available
  if (session.customer) {
    user.subscription.stripeCustomerId = session.customer;
  }

  // ── Credit pack (one-time payment) ─────────────────────────────────────────
  if (session.mode === 'payment' && packSize) {
    const credits = PACK_CREDITS[String(packSize)];
    if (!credits) {
      console.error(`[Webhook] ❌ Unknown pack size: ${packSize}`);
      return;
    }
    const before = user.subscription.credits || 0;
    user.subscription.credits = before + credits;
    await user.save();
    console.log(`[Webhook] ✅ Pack ${packSize} → +${credits} crédits → user ${userId} (${before} → ${user.subscription.credits})`);
    return;
  }

  // ── Subscription (first activation) ────────────────────────────────────────
  if (session.mode === 'subscription' && planKey) {
    const credits = PLAN_CREDITS[planKey];
    if (!credits) {
      console.error(`[Webhook] ❌ Unknown planKey: ${planKey}`);
      return;
    }

    if (session.subscription) {
      user.subscription.stripeSubscriptionId = session.subscription;
    }

    const isAnnual = billing === 'annual';
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (isAnnual ? 366 : 31));

    user.subscription.type          = 'advanced';
    user.subscription.stripePlanKey = planKey;
    user.subscription.credits       = credits;
    user.subscription.creditsUsed   = 0;
    user.subscription.status        = 'active';
    user.subscription.startDate     = now;
    user.subscription.endDate       = endDate;
    user.isPremium                  = true;

    await user.save();
    console.log(`[Webhook] ✅ Subscription ${planKey} (${billing}) → ${credits} crédits → user ${userId}`);
  }
}

// ── invoice.payment_succeeded (renewals only) ──────────────────────────────────
async function handleInvoicePaymentSucceeded(invoice) {
  // billing_reason === 'subscription_create' is already handled by checkout.session.completed
  if (invoice.billing_reason === 'subscription_create') {
    console.log('[Webhook] ⏭  invoice.payment_succeeded billing_reason=subscription_create — handled by checkout.session.completed');
    return;
  }

  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscriptionId });
  if (!user) {
    console.error(`[Webhook] ❌ invoice.payment_succeeded — no user for subscriptionId: ${subscriptionId}`);
    return;
  }

  // Resolve planKey: prefer stored value, fall back to price ID lookup
  let planKey = user.subscription.stripePlanKey;
  if (!planKey) {
    const priceId = invoice.lines && invoice.lines.data && invoice.lines.data[0] &&
                    invoice.lines.data[0].price && invoice.lines.data[0].price.id;
    planKey = await priceIdToPlanKey(priceId);
  }

  const credits = PLAN_CREDITS[planKey];
  if (!credits) {
    console.error(`[Webhook] ❌ Cannot resolve credits for invoice ${invoice.id}, planKey: ${planKey}`);
    return;
  }

  const now = new Date();
  // Use Stripe's period_end if available, otherwise add 31 days
  const endDate = invoice.period_end
    ? new Date(invoice.period_end * 1000)
    : new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);

  user.subscription.credits     = credits;
  user.subscription.creditsUsed = 0;
  user.subscription.status      = 'active';
  user.subscription.startDate   = now;
  user.subscription.endDate     = endDate;

  await user.save();
  console.log(`[Webhook] ✅ Renewal ${planKey} → ${credits} crédits → user ${user._id} (invoice ${invoice.id})`);
}

module.exports = router;
