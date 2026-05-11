const express = require('express');
const router = express.Router();
const User = require('../models/User');
const StripeEvent = require('../models/StripeEvent');
const PricingConfig = require('../models/PricingConfig');

const PLAN_CREDITS = {
  essential: 250,
  creator:   700,
  studioPro: 1800
};

const PACK_CREDITS = {
  '100': 100, '250': 250, '500': 500,
  '1000': 1000, '2000': 2000, '4000': 4000
};

const PLAN_ENV_PRICES = {
  essential: { monthly: 'STRIPE_PRICE_ESSENTIAL_MONTHLY', annual: 'STRIPE_PRICE_ESSENTIAL_ANNUAL' },
  creator:   { monthly: 'STRIPE_PRICE_CREATOR_MONTHLY',   annual: 'STRIPE_PRICE_CREATOR_ANNUAL' },
  studioPro: { monthly: 'STRIPE_PRICE_STUDIO_MONTHLY',    annual: 'STRIPE_PRICE_STUDIO_ANNUAL' }
};

// Resolve priceId → planKey: DB first, then env vars
async function priceIdToPlanKey(priceId) {
  if (!priceId) return null;

  console.log('[Webhook] priceIdToPlanKey — looking up priceId:', priceId);

  const config = await PricingConfig.findOne({});
  if (config) {
    for (const key of ['essential', 'creator', 'studioPro']) {
      const plan = config[key];
      if (plan && (plan.stripePriceIdMonthly === priceId || plan.stripePriceIdAnnual === priceId)) {
        console.log(`[Webhook] priceId matched DB config → planKey: ${key}`);
        return key;
      }
    }
  }

  // Log all env vars being checked for debug visibility in Render
  for (const [planKey, envKeys] of Object.entries(PLAN_ENV_PRICES)) {
    const monthlyVal = process.env[envKeys.monthly];
    const annualVal  = process.env[envKeys.annual];
    console.log(`[Webhook]   env ${envKeys.monthly}=${monthlyVal || '(not set)'} | ${envKeys.annual}=${annualVal || '(not set)'}`);
    if (monthlyVal === priceId || annualVal === priceId) {
      console.log(`[Webhook] priceId matched env var → planKey: ${planKey}`);
      return planKey;
    }
  }

  console.error(`[Webhook] ❌ priceId ${priceId} did not match any plan in DB or env vars`);
  return null;
}

// Main webhook handler — handles both /api/stripe-webhook and /api/stripe/webhook
router.post('/', async (req, res) => {
  console.log('==============================');
  console.log('[Webhook] WEBHOOK RECEIVED');
  console.log('[Webhook] headers stripe-signature:', req.headers['stripe-signature'] ? 'present' : 'MISSING');

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
      console.log('[Webhook] ✅ Signature verified');
    } else {
      event = JSON.parse(req.body.toString());
      console.warn('[Webhook] ⚠️  STRIPE_WEBHOOK_SECRET not set — signature NOT verified');
    }
  } catch (err) {
    console.error('[Webhook] ❌ Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Webhook] event.type: ${event.type}`);
  console.log(`[Webhook] event.id:   ${event.id}`);

  // Idempotency — skip already-processed events
  try {
    await StripeEvent.create({ stripeEventId: event.id });
  } catch (err) {
    if (err.code === 11000) {
      console.log(`[Webhook] ⏭  Event ${event.id} already processed, skipping`);
      return res.json({ received: true });
    }
    // Non-duplicate error — log but continue processing (don't block credit delivery)
    console.error('[Webhook] ⚠️  StripeEvent.create error (non-duplicate):', err.message);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(stripe, event.data.object);
    } else if (event.type === 'invoice.payment_succeeded') {
      await handleInvoicePaymentSucceeded(event.data.object);
    } else {
      console.log(`[Webhook] Event type ${event.type} not handled — ignoring`);
    }
  } catch (err) {
    console.error(`[Webhook] ❌ Handler error (${event.type}):`, err);
  }

  console.log('==============================');
  res.json({ received: true });
});

// ── checkout.session.completed ─────────────────────────────────────────────────
async function handleCheckoutCompleted(stripe, session) {
  console.log('[Webhook] --- checkout.session.completed ---');
  console.log('[Webhook] session.id:                ', session.id);
  console.log('[Webhook] session.mode:              ', session.mode);
  console.log('[Webhook] session.customer:          ', session.customer || '(none)');
  console.log('[Webhook] session.subscription:      ', session.subscription || '(none)');
  console.log('[Webhook] session.client_reference_id:', session.client_reference_id || '(none)');
  console.log('[Webhook] session.metadata:          ', JSON.stringify(session.metadata));

  // Resolve userId — prefer metadata, fall back to client_reference_id
  const userId = (session.metadata && session.metadata.userId) || session.client_reference_id;
  const planKey  = session.metadata && session.metadata.planKey;
  const billing  = session.metadata && session.metadata.billing;
  const packSize = session.metadata && session.metadata.packSize;

  console.log('[Webhook] userId resolved:  ', userId  || '❌ MISSING');
  console.log('[Webhook] planKey:          ', planKey  || '(none)');
  console.log('[Webhook] billing:          ', billing  || '(none)');
  console.log('[Webhook] packSize:         ', packSize || '(none)');

  if (!userId) {
    console.error('[Webhook] ❌ Cannot fulfill — no userId in metadata or client_reference_id');
    return;
  }

  // Expand line_items to get the actual priceId purchased
  let priceId = null;
  try {
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items']
    });
    priceId = fullSession.line_items &&
              fullSession.line_items.data &&
              fullSession.line_items.data[0] &&
              fullSession.line_items.data[0].price &&
              fullSession.line_items.data[0].price.id;
    console.log('[Webhook] priceId from line_items:', priceId || '(none)');
  } catch (err) {
    console.error('[Webhook] ⚠️  Could not expand line_items:', err.message);
  }

  // ── Credit pack (one-time payment) ──────────────────────────────────────────
  if (session.mode === 'payment') {
    const size = packSize || (priceId ? await packSizeFromPriceId(priceId) : null);
    const credits = size ? PACK_CREDITS[String(size)] : null;

    console.log('[Webhook] pack size resolved:', size || '❌ UNKNOWN');
    console.log('[Webhook] creditsToAdd:      ', credits || '❌ UNKNOWN');

    if (!credits) {
      console.error(`[Webhook] ❌ Cannot resolve credits for pack — packSize: ${packSize}, priceId: ${priceId}`);
      return;
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $inc: { 'subscription.credits': credits } },
      { new: true }
    );

    if (!updated) {
      console.error(`[Webhook] ❌ User not found in DB: ${userId}`);
      return;
    }

    console.log(`[Webhook] ✅ Pack +${credits} crédits → user ${userId} | new balance: ${updated.subscription.credits}`);
    return;
  }

  // ── Subscription plan ────────────────────────────────────────────────────────
  if (session.mode === 'subscription') {
    // Resolve planKey: metadata first, then priceId lookup
    let resolvedPlanKey = planKey;
    if (!resolvedPlanKey && priceId) {
      resolvedPlanKey = await priceIdToPlanKey(priceId);
    }

    console.log('[Webhook] planKey resolved: ', resolvedPlanKey || '❌ UNKNOWN');

    const credits = resolvedPlanKey ? PLAN_CREDITS[resolvedPlanKey] : null;
    console.log('[Webhook] creditsToAdd:     ', credits != null ? credits : '❌ UNKNOWN');

    if (!credits) {
      console.error(`[Webhook] ❌ Cannot resolve credits — planKey: ${resolvedPlanKey}, priceId: ${priceId}`);
      return;
    }

    const isAnnual = billing === 'annual';
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (isAnnual ? 366 : 31));

    const updateFields = {
      'subscription.type':                 'advanced',
      'subscription.stripePlanKey':        resolvedPlanKey,
      'subscription.credits':              credits,
      'subscription.creditsUsed':          0,
      'subscription.status':               'active',
      'subscription.startDate':            now,
      'subscription.endDate':              endDate,
      'isPremium':                         true
    };
    if (session.customer) {
      updateFields['subscription.stripeCustomerId'] = session.customer;
    }
    if (session.subscription) {
      updateFields['subscription.stripeSubscriptionId'] = session.subscription;
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    );

    if (!updated) {
      console.error(`[Webhook] ❌ User not found in DB: ${userId}`);
      return;
    }

    console.log(`[Webhook] ✅ Subscription ${resolvedPlanKey} (${billing}) → ${credits} crédits → user ${userId}`);
    console.log(`[Webhook]    subscription.type:    ${updated.subscription.type}`);
    console.log(`[Webhook]    subscription.credits: ${updated.subscription.credits}`);
    console.log(`[Webhook]    subscription.status:  ${updated.subscription.status}`);
    console.log(`[Webhook]    endDate:              ${updated.subscription.endDate}`);
  }
}

// ── invoice.payment_succeeded (renewals only) ──────────────────────────────────
async function handleInvoicePaymentSucceeded(invoice) {
  console.log('[Webhook] --- invoice.payment_succeeded ---');
  console.log('[Webhook] invoice.id:            ', invoice.id);
  console.log('[Webhook] invoice.billing_reason:', invoice.billing_reason);
  console.log('[Webhook] invoice.subscription:  ', invoice.subscription || '(none)');

  // Already handled by checkout.session.completed
  if (invoice.billing_reason === 'subscription_create') {
    console.log('[Webhook] ⏭  billing_reason=subscription_create — handled by checkout.session.completed');
    return;
  }

  const subscriptionId = invoice.subscription;
  if (!subscriptionId) {
    console.error('[Webhook] ❌ No subscription ID on invoice');
    return;
  }

  const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscriptionId });
  if (!user) {
    console.error(`[Webhook] ❌ No user found for stripeSubscriptionId: ${subscriptionId}`);
    return;
  }

  console.log(`[Webhook] user found: ${user._id}`);

  const priceId = invoice.lines &&
                  invoice.lines.data &&
                  invoice.lines.data[0] &&
                  invoice.lines.data[0].price &&
                  invoice.lines.data[0].price.id;

  console.log('[Webhook] priceId from invoice lines:', priceId || '(none)');

  let planKey = user.subscription.stripePlanKey;
  if (!planKey && priceId) {
    planKey = await priceIdToPlanKey(priceId);
  }

  console.log('[Webhook] planKey resolved:', planKey || '❌ UNKNOWN');

  const credits = PLAN_CREDITS[planKey];
  if (!credits) {
    console.error(`[Webhook] ❌ Cannot resolve credits — planKey: ${planKey}, priceId: ${priceId}`);
    return;
  }

  console.log('[Webhook] creditsToAdd:', credits);

  const now = new Date();
  const endDate = invoice.period_end
    ? new Date(invoice.period_end * 1000)
    : new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);

  const updated = await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        'subscription.credits':     credits,
        'subscription.creditsUsed': 0,
        'subscription.status':      'active',
        'subscription.startDate':   now,
        'subscription.endDate':     endDate
      }
    },
    { new: true }
  );

  console.log(`[Webhook] ✅ Renewal ${planKey} → ${credits} crédits → user ${user._id} (invoice ${invoice.id})`);
  console.log(`[Webhook]    new subscription.credits: ${updated.subscription.credits}`);
}

// Resolve pack size from priceId via env vars
async function packSizeFromPriceId(priceId) {
  const PACK_ENV = {
    '100':  'STRIPE_PRICE_PACK_100',
    '250':  'STRIPE_PRICE_PACK_250',
    '500':  'STRIPE_PRICE_PACK_500',
    '1000': 'STRIPE_PRICE_PACK_1000',
    '2000': 'STRIPE_PRICE_PACK_2000',
    '4000': 'STRIPE_PRICE_PACK_4000'
  };
  for (const [size, envKey] of Object.entries(PACK_ENV)) {
    if (process.env[envKey] === priceId) return size;
  }
  return null;
}

module.exports = router;
