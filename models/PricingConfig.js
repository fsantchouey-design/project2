const mongoose = require('mongoose');

const PricingFeatureSchema = new mongoose.Schema({
  text: { type: String, required: true },
  included: { type: Boolean, default: true },
  addon: { type: Boolean, default: false }
}, { _id: false });

const PricingPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subtitle: { type: String, default: '' },
  price: { type: Number, default: 0 },
  period: { type: String, default: '' },
  generations: { type: Number, default: 0 },
  description: { type: String, default: '' },
  features: { type: [PricingFeatureSchema], default: [] },
  bonus: { type: String, default: '' },
  cta: { type: String, default: '' },
  ctaLink: { type: String, default: '' },
  popular: { type: Boolean, default: false },
  badge: { type: String, default: '' }
}, { _id: false });

const ComparisonRowSchema = new mongoose.Schema({
  feature: { type: String, required: true },
  regular: { type: String, default: '' },
  advanced: { type: String, default: '' },
  premium: { type: String, default: '' }
}, { _id: false });

// ── Subscription plans (public pricing page: Essential / Creator / Studio Pro) ──

const SubFeatureSchema = new mongoose.Schema({
  text: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { _id: false });

const SubscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  priceMonthly: { type: Number, default: 0 },
  priceAnnual: { type: Number, default: 0 },
  priceAnnualMonthly: { type: Number, default: 0 },
  savingsAnnual: { type: Number, default: 0 },
  credits: { type: Number, default: 0 },
  badge: { type: String, default: '' },
  badgeStyle: { type: String, default: '' },
  features: { type: [SubFeatureSchema], default: [] },
  active: { type: Boolean, default: true },
  stripePriceIdMonthly: { type: String, default: '' },
  stripePriceIdAnnual: { type: String, default: '' },
  ctaText: { type: String, default: '' },
  ctaLink: { type: String, default: '' },
  displayOrder: { type: Number, default: 0 }
}, { _id: false });

const PricingConfigSchema = new mongoose.Schema({
  regular: { type: PricingPlanSchema, default: () => ({}) },
  advanced: { type: PricingPlanSchema, default: () => ({}) },
  premium: { type: PricingPlanSchema, default: () => ({}) },
  comparison: { type: [ComparisonRowSchema], default: [] },
  essential: { type: SubscriptionPlanSchema, default: () => ({}) },
  creator: { type: SubscriptionPlanSchema, default: () => ({}) },
  studioPro: { type: SubscriptionPlanSchema, default: () => ({}) },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PricingConfig', PricingConfigSchema);
