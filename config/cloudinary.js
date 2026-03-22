const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Check if Cloudinary is configured
const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                                process.env.CLOUDINARY_API_KEY && 
                                process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary configured');
} else {
  console.log('⚠️ Cloudinary not configured - using local storage');
}

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Local disk storage fallback
const localProjectStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/projects');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const localContractorStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/contractors');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const localLandingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/landing');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Cloudinary storage
const cloudinaryProjectStorage = isCloudinaryConfigured ? new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'craftycrib/projects',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1920, height: 1080, crop: 'limit', quality: 'auto' }]
  }
}) : null;

const cloudinaryContractorStorage = isCloudinaryConfigured ? new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'craftycrib/contractors',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 800, crop: 'limit', quality: 'auto' }]
  }
}) : null;

const cloudinaryLandingStorage = isCloudinaryConfigured ? new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'craftycrib/landing',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 2000, height: 1200, crop: 'limit', quality: 'auto' }]
  }
}) : null;

const cloudinaryAvatarStorage = isCloudinaryConfigured ? new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'craftycrib/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }]
  }
}) : null;

// Cloudinary video storage
const cloudinaryVideoStorage = isCloudinaryConfigured ? new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'craftycrib/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'webm', 'mov', 'avi'],
  }
}) : null;

// Local video storage fallback
const localVideoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDir('public/uploads/landing');
    cb(null, 'public/uploads/landing');
  },
  filename: (req, file, cb) => {
    cb(null, 'gallery-video-' + Date.now() + path.extname(file.originalname));
  }
});

// Video file filter
const videoFilter = (req, file, cb) => {
  const ok = /mp4|webm|mov|avi/.test(path.extname(file.originalname).toLowerCase());
  cb(ok ? null : new Error('Video files only (MP4, WebM, MOV, AVI)'), ok);
};

// Video upload instance
const uploadVideo = multer({
  storage: isCloudinaryConfigured ? cloudinaryVideoStorage : localVideoStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: videoFilter
});

// Helper to get video URL
const getVideoUrl = (file) => {
  if (isCloudinaryConfigured && file.path) {
    return file.path;
  }
  return '/uploads/landing/' + file.filename;
};

// Helper to get video public ID from Cloudinary URL
const getVideoPublicId = (file) => {
  if (isCloudinaryConfigured && file.filename) {
    return file.filename;
  }
  return file.filename;
};

// Helper to delete video from Cloudinary
const deleteVideo = async (publicId) => {
  if (!isCloudinaryConfigured || !publicId) return true;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    return true;
  } catch (error) {
    console.error('Cloudinary video delete error:', error);
    return false;
  }
};

// File filter
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only image files are allowed (JPG, PNG, WebP)'));
};

// Multer upload instances - use Cloudinary if configured, otherwise local storage
const uploadProjectImages = multer({ 
  storage: isCloudinaryConfigured ? cloudinaryProjectStorage : localProjectStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: imageFilter
});

const uploadContractorImages = multer({
  storage: isCloudinaryConfigured ? cloudinaryContractorStorage : localContractorStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: imageFilter
});

if (!isCloudinaryConfigured) {
  ensureDir('public/uploads/landing');
}

const uploadLandingImages = multer({
  storage: isCloudinaryConfigured ? cloudinaryLandingStorage : localLandingStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: imageFilter
});

const uploadAvatar = multer({ 
  storage: isCloudinaryConfigured ? cloudinaryAvatarStorage : localProjectStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter
});

// Helper to get the correct URL from uploaded file
const getImageUrl = (file) => {
  if (isCloudinaryConfigured && file.path) {
    // Cloudinary returns full URL in file.path
    return file.path;
  }
  // Local storage - return relative path
  return `/uploads/projects/${file.filename}`;
};

const getContractorImageUrl = (file) => {
  if (isCloudinaryConfigured && file.path) {
    return file.path;
  }
  return `/uploads/contractors/${file.filename}`;
};

const getLandingImageUrl = (file) => {
  if (isCloudinaryConfigured && file.path) {
    return file.path;
  }
  return `/uploads/landing/${file.filename}`;
};

// Helper to delete image from Cloudinary
const deleteImage = async (publicId) => {
  if (!isCloudinaryConfigured) {
    // For local storage, deletion should be handled differently
    return true;
  }
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadProjectImages,
  uploadContractorImages,
  uploadLandingImages,
  uploadAvatar,
  uploadVideo,
  deleteImage,
  deleteVideo,
  getImageUrl,
  getContractorImageUrl,
  getLandingImageUrl,
  getVideoUrl,
  getVideoPublicId
};
