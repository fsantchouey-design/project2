const express = require('express');
const router = express.Router();
const LandingAsset = require('../models/LandingAsset');
const SpecialistsConfig = require('../models/SpecialistsConfig');
const {
  uploadLandingImages,
  getLandingImageUrl,
  deleteImage,
  uploadVideo,
  deleteVideo,
  getVideoUrl,
  getVideoPublicId,
  isCloudinaryConfigured
} = require('../config/cloudinary');
const {
  getLandingDefaultByKey,
  mergeLandingAssetsForAdmin
} = require('../utils/landingAssets');
const { mergeSpecialistsConfig, defaultSpecialistsConfig } = require('../utils/specialistsConfig');
const path = require('path');
const PricingConfig = require('../models/PricingConfig');
const { mergePricingConfig, defaultPricingConfig } = require('../utils/pricingConfig');

router.get('/', (req, res) => {
  res.redirect('/admin/landing');
});

// Gallery Side Images - Dedicated page for side column images
router.get('/gallery-images', async (req, res) => {
  try {
    const assets = await LandingAsset.find({});
    const mergedAssets = mergeLandingAssetsForAdmin(assets);

    // Filter images for left and right columns
    const leftImages = mergedAssets.filter(asset => 
      ['galleryHouse2', 'galleryHouse3', 'galleryAfterHouse'].includes(asset.key)
    );
    
    const rightImages = mergedAssets.filter(asset => 
      ['galleryHouse4', 'galleryAfterLiving', 'galleryHouse1'].includes(asset.key)
    );

    res.render('pages/admin/gallery-images', {
      title: 'Gallery Side Images - Admin',
      layout: 'layouts/minimal',
      extraStyles: ['/css/dashboard.css'],
      activePage: 'admin-gallery-images',
      leftImages,
      rightImages
    });
  } catch (err) {
    console.error('Admin gallery images error:', err);
    req.flash('error_msg', 'Unable to load gallery images.');
    res.redirect('/admin/landing');
  }
});

// Landing Page Assets
router.get('/landing', async (req, res) => {
  try {
    const assets = await LandingAsset.find({});
    const mergedAssets = mergeLandingAssetsForAdmin(assets);

    res.render('pages/admin/landing', {
      title: 'Landing Assets - Admin',
      layout: 'layouts/minimal',
      extraStyles: ['/css/dashboard.css'],
      activePage: 'admin-landing',
      assets: mergedAssets
    });
  } catch (err) {
    console.error('Admin landing assets error:', err);
    req.flash('error_msg', 'Unable to load landing assets.');
    res.redirect('/dashboard');
  }
});

router.post('/landing/:key', uploadLandingImages.single('image'), async (req, res) => {
  try {
    const { key } = req.params;
    const defaults = getLandingDefaultByKey(key);

    if (!defaults) {
      req.flash('error_msg', 'Unknown landing asset.');
      return res.redirect('/admin/landing');
    }

    const alt = (req.body.alt || '').trim();
    let asset = await LandingAsset.findOne({ key });

    if (!asset) {
      asset = new LandingAsset({
        key,
        label: defaults.label,
        section: defaults.section,
        url: defaults.url,
        alt: defaults.alt
      });
    }

    asset.label = defaults.label;
    asset.section = defaults.section;

    if (alt) {
      asset.alt = alt;
    } else if (!asset.alt) {
      asset.alt = defaults.alt;
    }

    if (req.file) {
      if (asset.publicId) {
        await deleteImage(asset.publicId);
      }
      asset.url = getLandingImageUrl(req.file);
      asset.publicId = req.file.filename || req.file.public_id;
    }

    asset.updatedAt = new Date();
    await asset.save();

    req.flash('success_msg', 'Landing asset updated.');
    res.redirect('/admin/landing');
  } catch (err) {
    console.error('Update landing asset error:', err);
    req.flash('error_msg', 'Unable to update landing asset.');
    res.redirect('/admin/landing');
  }
});

// Specialists Section
router.get('/specialists', async (req, res) => {
  try {
    const storedConfig = await SpecialistsConfig.findOne({});
    const specialists = mergeSpecialistsConfig(storedConfig);

    res.render('pages/admin/specialists', {
      title: 'Specialists Section - Admin',
      layout: 'layouts/minimal',
      extraStyles: ['/css/dashboard.css'],
      specialists
    });
  } catch (err) {
    console.error('Admin specialists error:', err);
    req.flash('error_msg', 'Unable to load specialists section.');
    res.redirect('/dashboard');
  }
});

router.post('/specialists/image', uploadLandingImages.single('image'), async (req, res) => {
  try {
    let config = await SpecialistsConfig.findOne({});
    if (!config) {
      config = new SpecialistsConfig(defaultSpecialistsConfig);
    }

    const alt = (req.body.alt || '').trim();
    if (alt) {
      config.imageAlt = alt;
    }

    if (req.file) {
      if (config.imagePublicId) {
        await deleteImage(config.imagePublicId);
      }
      config.imageUrl = getLandingImageUrl(req.file);
      config.imagePublicId = req.file.filename || req.file.public_id;
      config.mediaType = 'image';
    }

    config.updatedAt = new Date();
    await config.save();

    req.flash('success_msg', 'Specialists image updated.');
    res.redirect('/admin/specialists');
  } catch (err) {
    console.error('Update specialists image error:', err);
    req.flash('error_msg', 'Unable to update specialists image.');
    res.redirect('/admin/specialists');
  }
});

// Video upload for specialists section
router.post('/specialists/video', uploadVideo.single('video'), async (req, res) => {
  try {
    let config = await SpecialistsConfig.findOne({});
    if (!config) {
      config = new SpecialistsConfig(defaultSpecialistsConfig);
    }

    if (req.file) {
      // Delete old video if exists
      if (config.videoPublicId) {
        await deleteVideo(config.videoPublicId);
      }

      config.videoUrl = getVideoUrl(req.file);
      config.videoPublicId = getVideoPublicId(req.file);
      config.mediaType = 'video';
    }

    config.updatedAt = new Date();
    await config.save();

    req.flash('success_msg', 'Specialists video updated.');
    res.redirect('/admin/specialists');
  } catch (err) {
    console.error('Update specialists video error:', err);
    req.flash('error_msg', 'Unable to update specialists video.');
    res.redirect('/admin/specialists');
  }
});

// Delete video
router.post('/specialists/video/delete', async (req, res) => {
  try {
    const config = await SpecialistsConfig.findOne({});
    if (config && config.videoPublicId) {
      await deleteVideo(config.videoPublicId);

      config.videoUrl = '';
      config.videoPublicId = '';
      config.mediaType = 'image';
      config.updatedAt = new Date();
      await config.save();

      req.flash('success_msg', 'Specialists video removed. Image is now active.');
    }
    res.redirect('/admin/specialists');
  } catch (err) {
    console.error('Delete specialists video error:', err);
    req.flash('error_msg', 'Unable to delete video.');
    res.redirect('/admin/specialists');
  }
});

router.post('/specialists/options', async (req, res) => {
  try {
    const { categories } = req.body;
    const baseConfig = defaultSpecialistsConfig;
    let config = await SpecialistsConfig.findOne({});
    if (!config) {
      config = new SpecialistsConfig(baseConfig);
    }

    const updatedCategories = baseConfig.categories.map((category) => {
      const formCategory = categories?.[category.key] || {};
      const label = (formCategory.label || category.label).trim();
      const optionsText = (formCategory.options || '').toString();
      const options = optionsText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      return {
        key: category.key,
        label,
        options: options.length > 0 ? options : category.options
      };
    });

    config.categories = updatedCategories;
    config.updatedAt = new Date();
    await config.save();

    req.flash('success_msg', 'Specialists options updated.');
    res.redirect('/admin/specialists');
  } catch (err) {
    console.error('Update specialists options error:', err);
    req.flash('error_msg', 'Unable to update specialists options.');
    res.redirect('/admin/specialists');
  }
});

// ==========================================
// Gallery Video
// ==========================================
const GalleryVideo = require('../models/GalleryVideo');

router.get('/video', async (req, res) => {
  const gv = await GalleryVideo.findOne({});
  res.render('pages/admin/video', {
    title: 'Gallery Video - Admin',
    layout: 'layouts/minimal',
    extraStyles: ['/css/dashboard.css'],
    video: gv
  });
});

router.post('/video', uploadVideo.single('video'), async (req, res) => {
  try {
    let gv = await GalleryVideo.findOne({});
    if (!gv) gv = new GalleryVideo();

    if (req.file) {
      // Delete old video from Cloudinary if exists
      if (gv.publicId) {
        await deleteVideo(gv.publicId);
      }
      gv.url = getVideoUrl(req.file);
      gv.publicId = getVideoPublicId(req.file);
    }
    gv.updatedAt = new Date();
    await gv.save();

    req.flash('success_msg', 'Gallery video updated.');
    res.redirect('/admin/video');
  } catch (err) {
    console.error('Admin video upload error:', err);
    req.flash('error_msg', 'Unable to upload video.');
    res.redirect('/admin/video');
  }
});

router.post('/video/delete', async (req, res) => {
  try {
    const gv = await GalleryVideo.findOne({});
    if (gv && gv.publicId) {
      await deleteVideo(gv.publicId);
    }
    await GalleryVideo.deleteMany({});
    req.flash('success_msg', 'Gallery video removed. Image fallback will be used.');
    res.redirect('/admin/video');
  } catch (err) {
    console.error('Admin video delete error:', err);
    req.flash('error_msg', 'Unable to delete video.');
    res.redirect('/admin/video');
  }
});

// ==========================================
// Contact Messages
// ==========================================
const ContactMessage = require('../models/ContactMessage');

router.get('/messages', async (req, res) => {
  try {
    const messages = await ContactMessage.find({}).sort({ createdAt: -1 });
    res.render('pages/admin/messages', {
      title: 'Contact Messages - Admin',
      layout: 'layouts/minimal',
      extraStyles: ['/css/dashboard.css'],
      messages
    });
  } catch (err) {
    console.error('Admin messages error:', err);
    req.flash('error_msg', 'Unable to load messages.');
    res.redirect('/admin');
  }
});

router.post('/messages/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await ContactMessage.findByIdAndUpdate(req.params.id, { status });
    res.redirect('/admin/messages');
  } catch (err) {
    console.error('Admin message status error:', err);
    res.redirect('/admin/messages');
  }
});

router.post('/messages/:id/delete', async (req, res) => {
  try {
    await ContactMessage.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Message deleted.');
    res.redirect('/admin/messages');
  } catch (err) {
    console.error('Admin message delete error:', err);
    res.redirect('/admin/messages');
  }
});

// ==========================================
// Pricing Configuration
// ==========================================

router.get('/pricing', async (req, res) => {
  try {
    const storedConfig = await PricingConfig.findOne({});
    const pricing = mergePricingConfig(storedConfig);

    res.render('pages/admin/pricing', {
      title: 'Pricing Configuration - Admin',
      layout: 'layouts/minimal',
      extraStyles: ['/css/dashboard.css'],
      pricing
    });
  } catch (err) {
    console.error('Admin pricing error:', err);
    req.flash('error_msg', 'Unable to load pricing configuration.');
    res.redirect('/admin');
  }
});

router.post('/pricing/plans', async (req, res) => {
  try {
    const { plans, comparison } = req.body;
    let config = await PricingConfig.findOne({});
    if (!config) {
      config = new PricingConfig();
    }

    // Process each plan
    ['regular', 'advanced', 'premium'].forEach(key => {
      if (!plans || !plans[key]) return;
      const p = plans[key];

      // Parse features from textarea
      const featuresText = (p.features || '').toString();
      const features = featuresText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          const isAddon = line.startsWith('[addon]');
          const text = isAddon ? line.replace('[addon]', '').trim() : line;
          return { text, included: true, addon: isAddon };
        });

      config[key] = {
        name: (p.name || '').trim(),
        subtitle: (p.subtitle || '').trim(),
        price: parseFloat(p.price) || 0,
        period: (p.period || '').trim(),
        generations: parseInt(p.generations) || 0,
        description: (p.description || '').trim(),
        features: features.length > 0 ? features : defaultPricingConfig[key].features,
        bonus: (p.bonus || '').trim(),
        cta: (p.cta || '').trim(),
        ctaLink: (p.ctaLink || '').trim(),
        popular: p.popular === 'true',
        badge: (p.badge || '').trim()
      };
    });

    // Process comparison table
    if (comparison) {
      const comparisonRows = [];
      const keys = Object.keys(comparison).sort((a, b) => parseInt(a) - parseInt(b));
      keys.forEach(idx => {
        const row = comparison[idx];
        const feature = (row.feature || '').trim();
        if (feature) {
          comparisonRows.push({
            feature,
            regular: (row.regular || '').trim(),
            advanced: (row.advanced || '').trim(),
            premium: (row.premium || '').trim()
          });
        }
      });
      config.comparison = comparisonRows.length > 0 ? comparisonRows : defaultPricingConfig.comparison;
    }

    config.updatedAt = new Date();
    await config.save();

    req.flash('success_msg', 'Pricing configuration updated successfully.');
    res.redirect('/admin/pricing');
  } catch (err) {
    console.error('Admin pricing save error:', err);
    req.flash('error_msg', 'Unable to save pricing configuration.');
    res.redirect('/admin/pricing');
  }
});

// ==========================================
// Site Settings (Social Links)
// ==========================================
const SiteSettings = require('../models/SiteSettings');

router.get('/settings', async (req, res) => {
  try {
    const settings = await SiteSettings.findOne({});
    res.render('pages/admin/settings', {
      title: 'Site Settings - Admin',
      layout: 'layouts/minimal',
      extraStyles: ['/css/dashboard.css'],
      socialLinks: settings ? settings.socialLinks : { facebook: '', instagram: '', tiktok: '' }
    });
  } catch (err) {
    console.error('Admin settings error:', err);
    req.flash('error_msg', 'Unable to load site settings.');
    res.redirect('/admin');
  }
});

router.post('/settings/social', async (req, res) => {
  try {
    const { facebook, instagram, tiktok } = req.body;
    let settings = await SiteSettings.findOne({});
    if (!settings) {
      settings = new SiteSettings();
    }
    settings.socialLinks = {
      facebook: (facebook || '').trim(),
      instagram: (instagram || '').trim(),
      tiktok: (tiktok || '').trim()
    };
    settings.updatedAt = new Date();
    await settings.save();

    req.flash('success_msg', 'Social media links updated successfully.');
    res.redirect('/admin/settings');
  } catch (err) {
    console.error('Admin social links save error:', err);
    req.flash('error_msg', 'Unable to save social media links.');
    res.redirect('/admin/settings');
  }
});

// ==========================================
// Inspiration Images
// ==========================================
const InspirationImage = require('../models/InspirationImage');

const INSPIRATION_CATEGORIES = [
  { value: 'cuisine', label: 'Cuisine' },
  { value: 'salon', label: 'Salon' },
  { value: 'chambre', label: 'Chambre' },
  { value: 'salle-de-bain', label: 'Salle de bain' },
  { value: 'exterieur', label: 'Extérieur' }
];

router.get('/inspirations', async (req, res) => {
  try {
    const images = await InspirationImage.find({}).sort({ createdAt: -1 });
    res.render('pages/admin/inspirations', {
      title: 'Inspirations - Admin',
      layout: 'layouts/minimal',
      extraStyles: ['/css/dashboard.css'],
      activePage: 'admin-inspirations',
      images,
      categories: INSPIRATION_CATEGORIES
    });
  } catch (err) {
    console.error('Admin inspirations error:', err);
    req.flash('error_msg', 'Unable to load inspirations.');
    res.redirect('/admin');
  }
});

router.post('/inspirations', async (req, res) => {
  try {
    const { title, category, style, imageUrl } = req.body;
    if (!title || !category || !imageUrl) {
      req.flash('error_msg', 'Titre, catégorie et URL sont requis.');
      return res.redirect('/admin/inspirations');
    }
    await InspirationImage.create({ title: title.trim(), category, style: (style || '').trim(), imageUrl: imageUrl.trim() });
    req.flash('success_msg', 'Image d\'inspiration ajoutée.');
    res.redirect('/admin/inspirations');
  } catch (err) {
    console.error('Admin inspirations create error:', err);
    req.flash('error_msg', 'Impossible d\'ajouter l\'image.');
    res.redirect('/admin/inspirations');
  }
});

router.post('/inspirations/:id/delete', async (req, res) => {
  try {
    await InspirationImage.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Image supprimée.');
    res.redirect('/admin/inspirations');
  } catch (err) {
    console.error('Admin inspirations delete error:', err);
    req.flash('error_msg', 'Impossible de supprimer l\'image.');
    res.redirect('/admin/inspirations');
  }
});

// ==========================================
// Service Categories (Entrepreneurs page)
// ==========================================
const ServiceCategory = require('../models/ServiceCategory');

const SPECIALTY_OPTIONS = [
  { value: 'painting',    label: 'Peinture' },
  { value: 'kitchen',     label: 'Cuisine' },
  { value: 'bathroom',    label: 'Salle de bain' },
  { value: 'flooring',    label: 'Planchers' },
  { value: 'electrical',  label: 'Électricité' },
  { value: 'plumbing',    label: 'Plomberie' },
  { value: 'outdoor',     label: 'Extérieur' },
  { value: 'living-room', label: 'Salon' },
  { value: 'bedroom',     label: 'Chambre' },
  { value: 'general',     label: 'Général' }
];

router.get('/services', async (req, res) => {
  try {
    const categories = await ServiceCategory.find({}).sort({ order: 1 });
    res.render('pages/admin/services', {
      title: 'Services Entrepreneurs - Admin',
      layout: 'layouts/minimal',
      extraStyles: ['/css/dashboard.css'],
      activePage: 'admin-services',
      categories,
      specialtyOptions: SPECIALTY_OPTIONS
    });
  } catch (err) {
    console.error('Admin services error:', err);
    req.flash('error_msg', 'Impossible de charger les services.');
    res.redirect('/admin');
  }
});

// Create category
router.post('/services', async (req, res) => {
  try {
    const { label, icon, specialty, order } = req.body;
    if (!label || !specialty) {
      req.flash('error_msg', 'Nom et spécialité sont requis.');
      return res.redirect('/admin/services');
    }
    const maxOrder = await ServiceCategory.findOne().sort({ order: -1 });
    await ServiceCategory.create({
      label: label.trim(),
      icon: (icon || 'wrench').trim(),
      specialty: specialty.trim(),
      order: order ? parseInt(order) : (maxOrder ? maxOrder.order + 1 : 1)
    });
    req.flash('success_msg', 'Catégorie ajoutée.');
    res.redirect('/admin/services');
  } catch (err) {
    console.error('Admin services create error:', err);
    req.flash('error_msg', 'Impossible d\'ajouter la catégorie.');
    res.redirect('/admin/services');
  }
});

// Update category (label, icon, specialty, order, isActive)
router.post('/services/:id/update', async (req, res) => {
  try {
    const { label, icon, specialty, order, isActive } = req.body;
    await ServiceCategory.findByIdAndUpdate(req.params.id, {
      label: (label || '').trim(),
      icon: (icon || 'wrench').trim(),
      specialty: (specialty || 'general').trim(),
      order: order ? parseInt(order) : 0,
      isActive: isActive === 'true' || isActive === '1' || isActive === 'on'
    });
    req.flash('success_msg', 'Catégorie mise à jour.');
    res.redirect('/admin/services');
  } catch (err) {
    console.error('Admin services update error:', err);
    req.flash('error_msg', 'Impossible de mettre à jour.');
    res.redirect('/admin/services');
  }
});

// Delete category
router.post('/services/:id/delete', async (req, res) => {
  try {
    await ServiceCategory.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Catégorie supprimée.');
    res.redirect('/admin/services');
  } catch (err) {
    console.error('Admin services delete error:', err);
    req.flash('error_msg', 'Impossible de supprimer.');
    res.redirect('/admin/services');
  }
});

// Add subcategory
router.post('/services/:id/subcategory/add', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      req.flash('error_msg', 'Nom de sous-catégorie requis.');
      return res.redirect('/admin/services');
    }
    await ServiceCategory.findByIdAndUpdate(req.params.id, {
      $push: { subcategories: name.trim() }
    });
    req.flash('success_msg', 'Sous-catégorie ajoutée.');
    res.redirect('/admin/services');
  } catch (err) {
    console.error('Admin subcategory add error:', err);
    req.flash('error_msg', 'Impossible d\'ajouter.');
    res.redirect('/admin/services');
  }
});

// Remove subcategory
router.post('/services/:id/subcategory/remove', async (req, res) => {
  try {
    const { name } = req.body;
    await ServiceCategory.findByIdAndUpdate(req.params.id, {
      $pull: { subcategories: name }
    });
    req.flash('success_msg', 'Sous-catégorie supprimée.');
    res.redirect('/admin/services');
  } catch (err) {
    console.error('Admin subcategory remove error:', err);
    req.flash('error_msg', 'Impossible de supprimer.');
    res.redirect('/admin/services');
  }
});

module.exports = router;

