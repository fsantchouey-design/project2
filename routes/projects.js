const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { ensureAuthenticated, ensureProjectOwner } = require('../middleware/auth');
const Project = require('../models/Project');
const { generateDesign, getStyles, getRoomTypes } = require('../utils/homedesigns');
const { uploadProjectImages, deleteImage, getImageUrl, isCloudinaryConfigured } = require('../config/cloudinary');

// Use Cloudinary storage for uploads (or local fallback)
const upload = uploadProjectImages;

// List all projects
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const projects = await Project.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.render('pages/projects/index', {
      title: 'My Projects - CraftyCrib',
      layout: 'layouts/dashboard',
      activePage: 'projects',
      projects
    });
  } catch (err) {
    console.error('Projects list error:', err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/dashboard');
  }
});

// New Project Form
router.get('/new', ensureAuthenticated, (req, res) => {
  res.render('pages/projects/new', {
    title: 'New Project - CraftyCrib',
    layout: 'layouts/dashboard',
    activePage: 'new-project',
    styles: getStyles(),
    roomTypes: getRoomTypes()
  });
});

// Create Project
router.post('/', ensureAuthenticated, upload.array('images', 5), async (req, res) => {
  try {
    const {
      title,
      description,
      roomType,
      style,
      budgetMin,
      budgetMax,
      length,
      width,
      height,
      colors,
      materials,
      mustHave,
      mustAvoid,
      priorityQuality,
      priorityPrice,
      prioritySpeed,
      isDIY
    } = req.body;

    // Generate share token
    const shareToken = crypto.randomBytes(16).toString('hex');

    // Process uploaded images (works with both Cloudinary and local storage)
    const originalImages = req.files ? req.files.map(file => ({
      url: getImageUrl(file),
      publicId: file.filename || file.public_id,
      uploadedAt: new Date()
    })) : [];

    const project = new Project({
      user: req.user.id,
      title,
      description,
      roomType,
      style,
      budget: {
        min: budgetMin ? parseFloat(budgetMin) : undefined,
        max: budgetMax ? parseFloat(budgetMax) : undefined
      },
      dimensions: {
        length: length ? parseFloat(length) : undefined,
        width: width ? parseFloat(width) : undefined,
        height: height ? parseFloat(height) : undefined
      },
      originalImages,
      preferences: {
        colors: colors ? colors.split(',').map(c => c.trim()) : [],
        materials: materials ? materials.split(',').map(m => m.trim()) : [],
        mustHave: mustHave ? mustHave.split(',').map(m => m.trim()) : [],
        mustAvoid: mustAvoid ? mustAvoid.split(',').map(m => m.trim()) : []
      },
      priorities: {
        quality: priorityQuality ? parseInt(priorityQuality) : 3,
        price: priorityPrice ? parseInt(priorityPrice) : 3,
        speed: prioritySpeed ? parseInt(prioritySpeed) : 3
      },
      isDIY: isDIY === 'on',
      shareToken,
      status: 'draft'
    });

    await project.save();

    req.flash('success_msg', 'Project created successfully!');
    res.redirect(`/projects/${project._id}`);
  } catch (err) {
    console.error('Create project error:', err);
    req.flash('error_msg', 'An error occurred creating the project');
    res.redirect('/projects/new');
  }
});

// View Project
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('contractorRequests.contractor');

    if (!project) {
      req.flash('error_msg', 'Project not found');
      return res.redirect('/projects');
    }

    res.render('pages/projects/view', {
      title: `${project.title} - CraftyCrib`,
      layout: 'layouts/dashboard',
      activePage: 'projects',
      project,
      styles: getStyles(),
      roomTypes: getRoomTypes()
    });
  } catch (err) {
    console.error('View project error:', err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/projects');
  }
});

// Edit Project Form
router.get('/:id/edit', ensureAuthenticated, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!project) {
      req.flash('error_msg', 'Project not found');
      return res.redirect('/projects');
    }

    res.render('pages/projects/edit', {
      title: `Edit ${project.title} - CraftyCrib`,
      layout: 'layouts/dashboard',
      activePage: 'projects',
      project,
      styles: getStyles(),
      roomTypes: getRoomTypes()
    });
  } catch (err) {
    console.error('Edit project error:', err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/projects');
  }
});

// Update Project
router.put('/:id', ensureAuthenticated, upload.array('images', 5), async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!project) {
      req.flash('error_msg', 'Project not found');
      return res.redirect('/projects');
    }

    const {
      title,
      description,
      roomType,
      style,
      budgetMin,
      budgetMax,
      visibility
    } = req.body;

    project.title = title;
    project.description = description;
    project.roomType = roomType;
    project.style = style;
    project.budget.min = budgetMin ? parseFloat(budgetMin) : undefined;
    project.budget.max = budgetMax ? parseFloat(budgetMax) : undefined;
    project.visibility = visibility;

    // Add new images if uploaded (works with both Cloudinary and local storage)
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        project.originalImages.push({
          url: getImageUrl(file),
          publicId: file.filename || file.public_id,
          uploadedAt: new Date()
        });
      });
    }

    await project.save();

    req.flash('success_msg', 'Project updated successfully');
    res.redirect(`/projects/${project._id}`);
  } catch (err) {
    console.error('Update project error:', err);
    req.flash('error_msg', 'An error occurred');
    res.redirect(`/projects/${req.params.id}/edit`);
  }
});

// Delete Project
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    await Project.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    req.flash('success_msg', 'Project deleted successfully');
    res.redirect('/projects');
  } catch (err) {
    console.error('Delete project error:', err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/projects');
  }
});

// Upload Images to Existing Project
router.post('/:id/upload', ensureAuthenticated, upload.array('images', 5), async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    // Add new images (works with both Cloudinary and local storage)
    req.files.forEach(file => {
      project.originalImages.push({
        url: getImageUrl(file),
        publicId: file.filename || file.public_id,
        uploadedAt: new Date()
      });
    });

    await project.save();

    res.json({
      success: true,
      images: project.originalImages,
      message: `${req.files.length} image(s) uploaded successfully`
    });
  } catch (err) {
    console.error('Upload images error:', err);
    res.status(500).json({ error: 'An error occurred uploading images' });
  }
});

// Delete Image from Project
router.delete('/:id/images/:imageId', ensureAuthenticated, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const image = project.originalImages.id(req.params.imageId);
    if (image && image.publicId) {
      // Delete from Cloudinary
      await deleteImage(image.publicId);
    }

    // Remove from project
    project.originalImages.pull(req.params.imageId);
    await project.save();

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (err) {
    console.error('Delete image error:', err);
    res.status(500).json({ error: 'An error occurred deleting image' });
  }
});

// Generate AI Design
router.post('/:id/generate', ensureAuthenticated, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (!project.originalImages || project.originalImages.length === 0) {
      return res.status(400).json({ success: false, error: 'Please upload at least one image first' });
    }

    project.status = 'generating';
    await project.save();

    let imageUrl = project.originalImages[0].url;
    
    if (imageUrl.startsWith('/')) {
      imageUrl = `${process.env.APP_URL || 'http://localhost:3000'}${imageUrl}`;
    }

    console.log('[Generate] Starting for project:', project._id, 'Image URL:', imageUrl.substring(0, 80));

    const result = await generateDesign({
      imageUrl,
      roomType: project.roomType,
      style: project.style || 'modern',
      quality: req.user.isPremium ? 'hd' : 'standard'
    });

    console.log('[Generate] Result:', result.success ? 'SUCCESS' : 'FAILED', result.success ? '' : result.error);

    if (result.success) {
      project.designVariants.push({
        name: `${project.style || 'Modern'} Design`,
        style: project.style,
        imageUrl: result.imageUrl,
        thumbnailUrl: result.thumbnailUrl,
        aiParameters: {
          roomType: project.roomType,
          style: project.style
        }
      });

      project.status = 'completed';
      project.aiGenerationHistory.push({
        parameters: { roomType: project.roomType, style: project.style },
        success: true
      });

      await project.save();

      res.json({
        success: true,
        design: project.designVariants[project.designVariants.length - 1]
      });
    } else {
      project.status = 'draft';
      project.aiGenerationHistory.push({
        parameters: { roomType: project.roomType, style: project.style },
        success: false,
        errorMessage: result.error
      });
      await project.save();

      res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate design'
      });
    }
  } catch (err) {
    console.error('[Generate] Unexpected error:', err);
    res.status(500).json({ success: false, error: 'An unexpected error occurred: ' + err.message });
  }
});

// Share Project (Public View)
router.get('/share/:token', async (req, res) => {
  try {
    const project = await Project.findOne({ shareToken: req.params.token })
      .populate('user', 'firstName lastName');

    if (!project) {
      return res.status(404).render('pages/404', {
        title: 'Project Not Found'
      });
    }

    res.render('pages/projects/shared', {
      title: `${project.title} - CraftyCrib`,
      layout: 'layouts/minimal',
      project
    });
  } catch (err) {
    console.error('Share project error:', err);
    res.status(500).render('pages/error', {
      title: 'Error'
    });
  }
});

// Publish Project to Public Gallery
router.post('/:id/publish', ensureAuthenticated, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if project has designs to publish
    if (!project.designVariants || project.designVariants.length === 0) {
      return res.status(400).json({ 
        error: 'Generate at least one AI design before publishing' 
      });
    }

    // Generate a public slug if not exists
    if (!project.publicSlug) {
      const slugify = require('slugify');
      const baseSlug = slugify(project.title, { lower: true, strict: true });
      project.publicSlug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    // Set featured image if not set
    if (!project.featuredImage && project.designVariants.length > 0) {
      project.featuredImage = project.designVariants[0].imageUrl;
    }

    project.isPublished = true;
    project.publishedAt = new Date();
    project.visibility = 'public';

    await project.save();

    res.json({
      success: true,
      message: 'Project published to gallery!',
      galleryUrl: `/gallery/${project.publicSlug}`
    });
  } catch (err) {
    console.error('Publish project error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Unpublish Project from Gallery
router.post('/:id/unpublish', ensureAuthenticated, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    project.isPublished = false;
    project.visibility = 'private';

    await project.save();

    res.json({
      success: true,
      message: 'Project removed from gallery'
    });
  } catch (err) {
    console.error('Unpublish project error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Set Featured Image
router.post('/:id/set-featured', ensureAuthenticated, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    project.featuredImage = imageUrl;
    await project.save();

    res.json({
      success: true,
      message: 'Featured image updated'
    });
  } catch (err) {
    console.error('Set featured image error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

module.exports = router;

