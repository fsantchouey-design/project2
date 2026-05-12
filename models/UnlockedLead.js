const mongoose = require('mongoose');

const UnlockedLeadSchema = new mongoose.Schema({
  proUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leadId:    { type: mongoose.Schema.Types.ObjectId, ref: 'QuoteRequest', required: true },
  stripeSessionId: String,
  unlockedAt: { type: Date, default: Date.now }
});

UnlockedLeadSchema.index({ proUserId: 1, leadId: 1 }, { unique: true });

module.exports = mongoose.model('UnlockedLead', UnlockedLeadSchema);
