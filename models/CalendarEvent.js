const mongoose = require('mongoose');

const CalendarEventSchema = new mongoose.Schema({
  proUserId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  date:        { type: Date, required: true },
  startTime:   { type: String, default: '' },
  endTime:     { type: String, default: '' },
  color:       { type: String, default: 'green', enum: ['green', 'cyan', 'purple', 'amber'] },
  createdAt:   { type: Date, default: Date.now }
});

CalendarEventSchema.index({ proUserId: 1, date: 1 });

module.exports = mongoose.model('CalendarEvent', CalendarEventSchema);
