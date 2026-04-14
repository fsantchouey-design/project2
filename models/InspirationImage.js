const mongoose = require('mongoose');

const InspirationImageSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: {
    type: String,
    required: true,
    enum: ['cuisine', 'salon', 'chambre', 'salle-de-bain', 'exterieur']
  },
  style: { type: String, trim: true, default: '' },
  imageUrl: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InspirationImage', InspirationImageSchema);
