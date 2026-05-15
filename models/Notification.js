const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:           { type: String, default: 'review_request' },
  message:        { type: String, required: true },
  contractorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor', required: true },
  contractorName: { type: String, default: '' },
  contractorSlug: { type: String, default: '' },
  quoteRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuoteRequest', required: true },
  status:         { type: String, enum: ['pending', 'published'], default: 'pending' },
  createdAt:      { type: Date, default: Date.now }
});

NotificationSchema.index({ userId: 1, quoteRequestId: 1 }, { unique: true });

module.exports = mongoose.model('Notification', NotificationSchema);
