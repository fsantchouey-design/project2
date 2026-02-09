const mongoose = require('mongoose');

const SpecialistsCategorySchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  options: { type: [String], default: [] }
}, { _id: false });

const SpecialistsConfigSchema = new mongoose.Schema({
  imageUrl: { type: String, default: '' },
  imageAlt: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  videoUrl: { type: String, default: '' },
  videoPublicId: { type: String, default: '' },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  categories: { type: [SpecialistsCategorySchema], default: [] },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SpecialistsConfig', SpecialistsConfigSchema);

