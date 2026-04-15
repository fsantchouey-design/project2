const mongoose = require('mongoose');

const QuoteRequestSchema = new mongoose.Schema({
  service:    { type: String, required: true },   // subcategory label
  specialty:  { type: String, required: true },   // contractor specialty key

  // Step 1
  postalCode: { type: String, required: true },

  // Step 2
  timing: {
    type: String,
    enum: ['asap', 'week', 'later', 'flexible'],
    required: true
  },
  description: { type: String, default: '' },
  photos:      [{ type: String }],  // file paths

  // Step 3
  firstName:        { type: String, required: true },
  lastName:         { type: String, required: true },
  address:          { type: String, default: '' },
  apartment:        { type: String, default: '' },
  city:             { type: String, default: '' },
  province:         { type: String, default: '' },
  contactPostalCode:{ type: String, default: '' },
  phone:            { type: String, required: true },
  altPhone:         { type: String, default: '' },
  email:            { type: String, required: true },

  status: {
    type: String,
    enum: ['new', 'contacted', 'closed'],
    default: 'new'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuoteRequest', QuoteRequestSchema);
