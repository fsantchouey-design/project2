const mongoose = require('mongoose');
const slugify = require('slugify');

const designVariantSchema = new mongoose.Schema({
  name: String,
  description: String,
  budgetLevel: {
    type: String,
    enum: ['economy', 'standard', 'premium', 'luxury']
  },
  style: String,
  imageUrl: String,
  thumbnailUrl: String,
  generatedAt: { type: Date, default: Date.now },
  aiParameters: Object,
  isSelected: { type: Boolean, default: false }
});

const materialSchema = new mongoose.Schema({
  name: String,
  category: String,
  quantity: Number,
  unit: String,
  estimatedPrice: Number,
  supplier: String,
  supplierUrl: String,
  imageUrl: String
});

const projectSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
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
  roomType: {
    type: String,
    enum: ['living-room', 'bedroom', 'kitchen', 'bathroom', 'dining-room', 'office', 'outdoor', 'kids-room', 'basement', 'garage', 'other'],
    required: true
  },
  style: {
    type: String,
    enum: ['modern', 'contemporary', 'minimalist', 'industrial', 'scandinavian', 'traditional', 'rustic', 'bohemian', 'coastal', 'mid-century', 'farmhouse', 'art-deco', 'japanese', 'mediterranean', 'other']
  },
  budget: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'EUR' }
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: { type: String, default: 'm' }
  },
  originalImages: [{
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  designVariants: [designVariantSchema],
  selectedDesign: {
    type: mongoose.Schema.Types.ObjectId
  },
  materials: [materialSchema],
  estimatedCost: {
    materials: Number,
    labor: Number,
    total: Number
  },
  priorities: {
    quality: { type: Number, min: 1, max: 5, default: 3 },
    price: { type: Number, min: 1, max: 5, default: 3 },
    speed: { type: Number, min: 1, max: 5, default: 3 }
  },
  preferences: {
    colors: [String],
    materials: [String],
    mustHave: [String],
    mustAvoid: [String]
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'generating', 'completed', 'in-progress', 'contracted', 'archived'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['private', 'contractors', 'public'],
    default: 'private'
  },
  // Public gallery fields
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  publicSlug: {
    type: String,
    unique: true,
    sparse: true
  },
  likes: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  tags: [String],
  featuredImage: String, // Main image for gallery display
  shareToken: String,
  isDIY: {
    type: Boolean,
    default: false
  },
  contractorRequests: [{
    contractor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    message: String,
    quotation: Number,
    requestedAt: { type: Date, default: Date.now }
  }],
  selectedContractor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contractor'
  },
  aiGenerationHistory: [{
    timestamp: { type: Date, default: Date.now },
    parameters: Object,
    success: Boolean,
    errorMessage: String
  }],
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate slug before saving
projectSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now().toString(36);
  }
  next();
});

// Virtual for share URL
projectSchema.virtual('shareUrl').get(function() {
  return `/projects/share/${this.shareToken}`;
});

module.exports = mongoose.model('Project', projectSchema);

