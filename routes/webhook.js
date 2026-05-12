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
  essential: { monthly: 'STRIPE_PRICE_ESSENTIAL_MONTHLY', annual: 'STRIPE_PRICE_ESSENTIAL_YEARLY' },
  creator:   { monthly: 'STRIPE_PRICE_CREATOR_MONTHLY',   annual: 'STRIPE_PRICE_CREATOR_YEARLY' },
  studioPro: { monthly: 'STRIPE_PRICE_STUDIO_PRO_MONTHLY', annual: 'STRIPE_PRICE_STUDIO_PRO_YEARLY' }
};

async function priceIdToPlanKey(priceId) {
  if (!priceId) return null;
  const config = await PricingConfig.findOne({});
  if (config) {
    for (const key of ['essential', 'creator', 'studioPro']) {
      const plan = config[key];
      if (plan && (plan.stripePriceIdMonthly === priceId || plan.stripePriceIdAnnual === priceId)) {
        console.log(`[Webhook] priceId matched DB → planKey: ${key}`);
        return key;
      }
    }
  }
  for (const [planKey, envKeys] of Object.entries(PLAN_ENV_PRICES)) {
    const mv = process.env[envKeys.monthly];
    const av = process.env[envKeys.annual];
    console.log(`[Webhook]   ${envKeys.monthly}=${mv || '(not set)'} | ${envKeys.annual}=${av || '(not set)'}`);
    if (mv === priceId || av === priceId) {
      console.log(`[Webhook] priceId matched env var → planKey: ${planKey}`);
      return planKey;
    }
  }
  console.error(`[Webhook] ❌ priceId ${priceId} did not match any plan`);
  return null;
}

async function packSizeFromPriceId(priceId) {
  const MAP = {
    '100': 'STRIPE_PRICE_PACK_100', '250': 'STRIPE_PRICE_PACK_250',
    '500': 'STRIPE_PRICE_PACK_500', '1000': 'STRIPE_PRICE_PACK_1000',
    '2000': 'STRIPE_PRICE_PACK_2000', '4000': 'STRIPE_PRICE_PACK_4000'
  };
  for (const [size, envKey] of Object.entries(MAP)) {
    if (process.env[envKey] === priceId) return size;
  }
  return null;
}

// Plain middleware function — exported directly so app.post() in server.js works correctly.
// req.body is a raw Buffer set by express.raw() — do NOT JSON.parse or stringify it.
module.exports = async function stripeWebhook(req, res) {
  console.log('==============================');
  console.log('[Webhook] Stripe webhook raw body received');
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  // Use test secret first (test mode), fall back to live secret
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET;

  console.log(`[Webhook] STRIPE_SECRET_KEY set:          ${stripeKey ? 'yes' : '❌ NO'}`);
  console.log(`[Webhook] STRIPE_WEBHOOK_SECRET_TEST set: ${process.env.STRIPE_WEBHOOK_SECRET_TEST ? 'yes' : 'no'}`);
  console.log(`[Webhook] STRIPE_WEBHOOK_SECRET set:      ${process.env.STRIPE_WEBHOOK_SECRET ? 'yes' : 'no'}`);
  console.log(`[Webhook] secret used:                    ${process.env.STRIPE_WEBHOOK_SECRET_TEST ? 'STRIPE_WEBHOOK_SECRET_TEST' : process.env.STRIPE_WEBHOOK_SECRET ? 'STRIPE_WEBHOOK_SECRET' : '❌ NONE'}`);
  console.log(`[Webhook] body is Buffer: ${Buffer.isBuffer(req.body)}`);
  console.log(`[Webhook] body length:   ${req.body ? req.body.length : 0} bytes`);

  if (!stripeKey) {
    console.error('[Webhook] ❌ STRIPE_SECRET_KEY not configured');
    return res.status(500).send('Stripe not configured');
  }

  const stripe = require('stripe')(stripeKey);
  const sig = req.headers['stripe-signature'];

  console.log(`[Webhook] stripe-signature: ${sig ? sig.substring(0, 50) + '...' : '❌ MISSING'}`);

  let event;

  if (webhookSecret) {
    if (!sig) {
      console.error('[Webhook] ❌ stripe-signature header missing');
      return res.status(400).send('Missing stripe-signature header');
    }
    try {
      // req.body is the raw Buffer from express.raw() — passed directly, never JSON-parsed
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      console.log('[Webhook] ✅ Stripe signature verified');
    } catch (err) {
      console.error('[Webhook] ❌ Signature verification failed:', err.message);
      return res.status(400).send(`Webhook signature error: ${err.message}`);
    }
  } else {
    try {
      event = JSON.parse(req.body.toString());
      console.warn('[Webhook] ⚠️  STRIPE_WEBHOOK_SECRET not set — running unverified (dev only)');
    } catch (err) {
      console.error('[Webhook] ❌ Failed to parse body:', err.message);
      return res.status(400).send('Invalid body');
    }
  }

  console.log(`[Webhook] event.type: ${event.type}`);
  console.log(`[Webhook] event.id:   ${event.id}`);

  // Idempotency
  try {
    await StripeEvent.create({ stripeEventId: event.id });
  } catch (err) {
    if (err.code === 11000) {
      console.log(`[Webhook] ⏭  Event ${event.id} already processed`);
      return res.json({ received: true });
    }
    console.error('[Webhook] ⚠️  StripeEvent.create error:', err.message);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(stripe, event.data.object);
    } else if (event.type === 'invoice.payment_succeeded') {
      await handleInvoicePaymentSucceeded(event.data.object);
    } else {
      console.log(`[Webhook] event type "${event.type}" not handled`);
    }
  } catch (err) {
    console.error(`[Webhook] ❌ Handler error (${event.type}):`, err.message);
    // Un-mark the event so Stripe retries can reprocess it
    try {
      await StripeEvent.deleteOne({ stripeEventId: event.id });
      console.log(`[Webhook] ↩  Event ${event.id} un-marked — will be retried by Stripe`);
    } catch (delErr) {
      console.error('[Webhook] ⚠️  Could not un-mark event for retry:', delErr.message);
    }
  }

  console.log('==============================');
  res.json({ received: true });
};

async function handleCheckoutCompleted(stripe, session) {
  console.log('[Webhook] --- checkout.session.completed ---');
  console.log('[Webhook] session.id:                ', session.id);
  console.log('[Webhook] session.mode:              ', session.mode);
  console.log('[Webhook] session.customer:          ', session.customer || '(none)');
  console.log('[Webhook] session.subscription:      ', session.subscription || '(none)');
  console.log('[Webhook] session.client_reference_id:', session.client_reference_id || '(none)');
  console.log('[Webhook] session.metadata:          ', JSON.stringify(session.metadata));

  const userId   = (session.metadata && session.metadata.userId) || session.client_reference_id;
  const planKey  = session.metadata && session.metadata.planKey;
  const billing  = session.metadata && session.metadata.billing;
  const packSize = session.metadata && session.metadata.packSize;

  console.log('[Webhook] userId:   ', userId   || '❌ MISSING');
  console.log('[Webhook] planKey:  ', planKey  || '(none)');
  console.log('[Webhook] packSize: ', packSize || '(none)');

  if (!userId) {
    console.error('[Webhook] ❌ No userId in metadata or client_reference_id');
    return;
  }

  // Get the actual priceId by expanding line_items
  let priceId = null;
  try {
    const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] });
    priceId = full.line_items &&
              full.line_items.data &&
              full.line_items.data[0] &&
              full.line_items.data[0].price &&
              full.line_items.data[0].price.id;
    console.log('[Webhook] priceId from line_items:', priceId || '(none)');
  } catch (err) {
    console.error('[Webhook] ⚠️  Could not expand line_items:', err.message);
  }

  // ── Pro subscription plan (professional dashboard) ───────────────────────────
  const proType = session.metadata && session.metadata.proType;
  if (proType && ['pro', 'premium', 'elite'].includes(proType)) {
    const update = { 'proSubscription.plan': proType };
    if (session.customer)     update['proSubscription.stripeCustomerId']    = session.customer;
    if (session.subscription) update['proSubscription.stripeSubscriptionId'] = session.subscription;

    const updated = await User.findByIdAndUpdate(userId, { $set: update }, { new: true });
    if (!updated) { console.error(`[Webhook] ❌ User not found: ${userId}`); return; }
    console.log(`[Webhook] ✅ Pro plan → "${proType}" for user ${userId}`);
    return;
  }
  if (proType === 'lead') {
    console.log(`[Webhook] ✅ Lead purchase (one-time) for user ${userId} — no plan change`);
    return;
  }

  // ── Credit pack ─────────────────────────────────────────────────────────────
  if (session.mode === 'payment') {
    const size    = packSize || (priceId ? await packSizeFromPriceId(priceId) : null);
    const credits = size ? PACK_CREDITS[String(size)] : null;

    console.log('[Webhook] pack size:   ', size    || '❌ UNKNOWN');
    console.log('[Webhook] creditsToAdd:', credits || '❌ UNKNOWN');

    if (!credits) {
      console.error(`[Webhook] ❌ Cannot resolve credits — packSize:${packSize} priceId:${priceId}`);
      return;
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $inc: { 'subscription.credits': credits } },
      { new: true }
    );
    if (!updated) { console.error(`[Webhook] ❌ User not found: ${userId}`); return; }

    console.log(`[Webhook] ✅ Pack +${credits} crédits → user ${userId} | balance: ${updated.subscription.credits}`);
    console.log('[Webhook] database updated successfully');
    return;
  }

  // ── Subscription ─────────────────────────────────────────────────────────────
  if (session.mode === 'subscription') {
    let resolvedPlanKey = planKey;
    if (!resolvedPlanKey && priceId) resolvedPlanKey = await priceIdToPlanKey(priceId);

    console.log('[Webhook] planKey resolved:', resolvedPlanKey || '❌ UNKNOWN');

    const credits = resolvedPlanKey ? PLAN_CREDITS[resolvedPlanKey] : null;
    console.log('[Webhook] creditsToAdd:    ', credits != null ? credits : '❌ UNKNOWN');

    if (credits == null) {
      console.error(`[Webhook] ❌ Cannot resolve credits — planKey:${resolvedPlanKey} priceId:${priceId}`);
      return;
    }

    const isAnnual = billing === 'annual';
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (isAnnual ? 366 : 31));

    const update = {
      'subscription.type':              'advanced',
      'subscription.stripePlanKey':     resolvedPlanKey,
      'subscription.credits':           credits,
      'subscription.creditsUsed':       0,
      'subscription.status':            'active',
      'subscription.startDate':         now,
      'subscription.endDate':           endDate,
      'isPremium':                      true
    };
    if (session.customer)     update['subscription.stripeCustomerId']    = session.customer;
    if (session.subscription) update['subscription.stripeSubscriptionId'] = session.subscription;

    const updated = await User.findByIdAndUpdate(userId, { $set: update }, { new: true });
    if (!updated) { console.error(`[Webhook] ❌ User not found: ${userId}`); return; }

    console.log(`[Webhook] ✅ Subscription ${resolvedPlanKey} (${billing}) → ${credits} crédits → user ${userId}`);
    console.log(`[Webhook]    subscription.credits: ${updated.subscription.credits}`);
    console.log(`[Webhook]    subscription.status:  ${updated.subscription.status}`);
    console.log('[Webhook] database updated successfully');
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  console.log('[Webhook] --- invoice.payment_succeeded ---');
  console.log('[Webhook] billing_reason:', invoice.billing_reason);
  console.log('[Webhook] subscription:  ', invoice.subscription || '(none)');

  if (invoice.billing_reason === 'subscription_create') {
    console.log('[Webhook] ⏭  subscription_create — handled by checkout.session.completed');
    return;
  }

  const subscriptionId = invoice.subscription;
  if (!subscriptionId) { console.error('[Webhook] ❌ No subscription ID on invoice'); return; }

  const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscriptionId });
  if (!user) { console.error(`[Webhook] ❌ No user for subscriptionId: ${subscriptionId}`); return; }

  console.log(`[Webhook] user found: ${user._id}`);

  const priceId = invoice.lines && invoice.lines.data &&
                  invoice.lines.data[0] && invoice.lines.data[0].price &&
                  invoice.lines.data[0].price.id;

  let planKey = user.subscription.stripePlanKey;
  if (!planKey && priceId) planKey = await priceIdToPlanKey(priceId);

  console.log('[Webhook] planKey:', planKey || '❌ UNKNOWN');

  const credits = PLAN_CREDITS[planKey];
  if (!credits) { console.error(`[Webhook] ❌ Cannot resolve credits — planKey:${planKey}`); return; }

  console.log('[Webhook] creditsToAdd:', credits);

  const now = new Date();
  const endDate = invoice.period_end
    ? new Date(invoice.period_end * 1000)
    : new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);

  const updated = await User.findByIdAndUpdate(
    user._id,
    { $set: { 'subscription.credits': credits, 'subscription.creditsUsed': 0,
               'subscription.status': 'active', 'subscription.startDate': now,
               'subscription.endDate': endDate } },
    { new: true }
  );

  console.log(`[Webhook] ✅ Renewal ${planKey} → ${credits} crédits → user ${user._id}`);
  console.log(`[Webhook]    subscription.credits: ${updated.subscription.credits}`);
  console.log('[Webhook] database updated successfully');
}
