const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  googleId: {
    type: String,
    sparse: true
  },
  password: {
    type: String,
    required: false,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['client', 'contractor', 'admin', 'professional'],
    default: 'client'
  },
  proStatus: {
    type: String,
    enum: ['none', 'pending_approval', 'approved', 'rejected'],
    default: 'none'
  },
  avatar: {
    type: String,
    default: '/images/default-avatar.png'
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'France' }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  // Subscription System
  subscription: {
    type: {
      type: String,
      enum: ['free', 'partner', 'advanced', 'credits'],
      default: 'free'
    },
    // Partner subscription - free with contractor contract
    partnerContractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract'
    },
    // Advanced subscription
    plan: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    },
    startDate: Date,
    endDate: Date,
    // Credits system
    credits: {
      type: Number,
      default: 3 // Free users get 3 credits
    },
    creditsUsed: {
      type: Number,
      default: 0
    },
    // Stripe/Payment
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    stripePlanKey: { type: String, enum: ['essential', 'creator', 'studioPro', null], default: null },
    // Status
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'pending'],
      default: 'active'
    }
  },
  // Pro dashboard subscription (professional users only)
  proSubscription: {
    plan: {
      type: String,
      enum: ['none', 'pro', 'premium', 'elite'],
      default: 'none'
    },
    stripeSubscriptionId: String,
    stripeCustomerId: String,
    currentPeriodEnd: Date
  },
  // Legacy field for backwards compatibility
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumExpires: Date,
  preferences: {
    styles: [String],
    budget: {
      min: Number,
      max: Number
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    }
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving (skip if no password — Google OAuth users)
userSchema.pre('save', async function(next) {
  if (!this.password || !this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);

