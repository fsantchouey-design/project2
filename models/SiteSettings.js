const mongoose = require('mongoose');

const SiteSettingsSchema = new mongoose.Schema({
  socialLinks: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    tiktok: { type: String, default: '' }
  },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SiteSettings', SiteSettingsSchema);
