const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  title:   { type: String, default: '' },
  content: { type: String, default: '' },
  tags:    [{ type: String }],
  pinned:  { type: Boolean, default: false },
  color:   { type: String, default: 'default' }
}, { timestamps: true });

NoteSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model('Note', NoteSchema);
