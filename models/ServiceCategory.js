const mongoose = require('mongoose');

const ServiceCategorySchema = new mongoose.Schema({
  label:         { type: String, required: true, trim: true },
  icon:          { type: String, required: true, trim: true, default: 'wrench' },
  specialty:     { type: String, required: true, trim: true },
  subcategories: [{ type: String, trim: true }],
  order:         { type: Number, default: 0 },
  isActive:      { type: Boolean, default: true },
  createdAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('ServiceCategory', ServiceCategorySchema);
