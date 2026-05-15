const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  project:        { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  quoteRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuoteRequest' },
  rating:         { type: Number, min: 1, max: 5, required: true },
  title:          String,
  comment:        String,
  response:       String,
  isVerified:     { type: Boolean, default: false },
  createdAt:      { type: Date, default: Date.now }
});

const portfolioItemSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  images: [String],
  beforeImage: String,
  afterImage: String,
  completedAt: Date,
  budget: Number
});

const contractorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  specialties: [{
    type: String,
    enum: ['kitchen', 'bathroom', 'living-room', 'bedroom', 'outdoor', 'flooring', 'painting', 'electrical', 'plumbing', 'general']
  }],
  experience: {
    years: Number,
    projectsCompleted: { type: Number, default: 0 }
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'France' }
  },
  serviceArea: {
    cities: [String],
    radius: Number, // in km
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  certifications: [{
    name: String,
    issuer: String,
    documentUrl: String,
    issuedAt: Date,
    expiresAt: Date,
    isVerified: { type: Boolean, default: false }
  }],
  insurance: {
    provider: String,
    policyNumber: String,
    documentUrl: String,
    expiresAt: Date,
    isVerified: { type: Boolean, default: false }
  },
  portfolio: [portfolioItemSchema],
  reviews: [reviewSchema],
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  availability: {
    status: {
      type: String,
      enum: ['available', 'busy', 'unavailable'],
      default: 'available'
    },
    nextAvailable: Date,
    workingDays: [{ type: Number, min: 0, max: 6 }] // 0 = Sunday
  },
  pricing: {
    hourlyRate: Number,
    minimumProject: Number,
    currency: { type: String, default: 'EUR' }
  },
  preferences: {
    minBudget: Number,
    maxBudget: Number,
    projectTypes: [String],
    autoDecline: [String] // Categories to auto-decline
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumExpires: Date,
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  stats: {
    profileViews: { type: Number, default: 0 },
    projectsReceived: { type: Number, default: 0 },
    projectsAccepted: { type: Number, default: 0 },
    responseRate: { type: Number, default: 0 }
  },
  lastLeadSeen:   { type: Date, default: null },
  lastReviewSeen: { type: Date, default: null },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate average rating when reviews change
contractorSchema.methods.updateRating = function() {
  if (this.reviews.length === 0) {
    this.rating.average = 0;
    this.rating.count = 0;
  } else {
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.rating.average = Math.round((sum / this.reviews.length) * 10) / 10;
    this.rating.count = this.reviews.length;
  }
};

module.exports = mongoose.model('Contractor', contractorSchema);

