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

const PricingConfigSchema = new mongoose.Schema({
  regular: { type: PricingPlanSchema, default: () => ({}) },
  advanced: { type: PricingPlanSchema, default: () => ({}) },
  premium: { type: PricingPlanSchema, default: () => ({}) },
  comparison: { type: [ComparisonRowSchema], default: [] },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PricingConfig', PricingConfigSchema);

