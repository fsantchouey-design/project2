const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { ensureAuthenticated, ensureProjectOwner } = require('../middleware/auth');
const Project = require('../models/Project');
const {
  generateDesign, beautifulRedesign, perfectRedesign, creativeRedesign,
  sketchToRender, precision, fillSpaces, decorStaging, furnitureRemoval,
  changeColorTextures, paintVisualizer, furnitureFinder, fullHD, skyColors,
  magicRedesign, videoGeneration, virtualStaging, textToDesign, furnitureCreator,
  designAdvisor, designTransfer, floorEditor, materialSwap, roomComposer,
  designCritique, createMaskImage, smartHome,
  getStyles, getRoomTypes, getAiTools, WEATHER_OPTIONS
} = require('../utils/homedesigns');
const { uploadProjectImages, deleteImage, getImageUrl, isCloudinaryConfigured } = require('../config/cloudinary');

// Use Cloudinary storage for uploads (or local fallback)
const upload = uploadProjectImages;

// Force dashboard layout for ALL routes in this router
router.use((req, res, next) => {
  res.locals.layout = 'layouts/dashboard';
  next();
});

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
      style: style || undefined,
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
      roomTypes: getRoomTypes(),
      aiTools: getAiTools(),
      weatherOptions: WEATHER_OPTIONS
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
      status,
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
      isDIY,
      visibility
    } = req.body;

    project.title = title;
    project.description = description;
    project.roomType = roomType;
    project.style = style || undefined;
    if (status) project.status = status;
    project.budget.min = budgetMin ? parseFloat(budgetMin) : undefined;
    project.budget.max = budgetMax ? parseFloat(budgetMax) : undefined;
    project.dimensions = {
      length: length ? parseFloat(length) : undefined,
      width: width ? parseFloat(width) : undefined,
      height: height ? parseFloat(height) : undefined
    };
    project.preferences = {
      colors: colors ? colors.split(',').map(c => c.trim()).filter(Boolean) : [],
      materials: materials ? materials.split(',').map(m => m.trim()).filter(Boolean) : [],
      mustHave: mustHave ? mustHave.split(',').map(m => m.trim()).filter(Boolean) : [],
      mustAvoid: mustAvoid ? mustAvoid.split(',').map(m => m.trim()).filter(Boolean) : []
    };
    project.priorities = {
      quality: priorityQuality ? parseInt(priorityQuality) : 3,
      price: priorityPrice ? parseInt(priorityPrice) : 3,
      speed: prioritySpeed ? parseInt(prioritySpeed) : 3
    };
    project.isDIY = isDIY === 'on';
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

    req.flash('success_msg', 'Projet mis à jour avec succès');
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
      imageUrl = `${process.env.APP_URL || 'https://craftycrib.com'}${imageUrl}`;
    }

    console.log('[Generate] Starting for project:', project._id, 'Image URL:', imageUrl.substring(0, 80));

    // Build a prompt from description and preferences
    const promptParts = [];
    if (project.description) promptParts.push(project.description);
    if (project.preferences) {
      if (project.preferences.colors && project.preferences.colors.length > 0) {
        promptParts.push('Colors: ' + project.preferences.colors.join(', '));
      }
      if (project.preferences.materials && project.preferences.materials.length > 0) {
        promptParts.push('Materials: ' + project.preferences.materials.join(', '));
      }
      if (project.preferences.mustHave && project.preferences.mustHave.length > 0) {
        promptParts.push('Must include: ' + project.preferences.mustHave.join(', '));
      }
      if (project.preferences.mustAvoid && project.preferences.mustAvoid.length > 0) {
        promptParts.push('Avoid: ' + project.preferences.mustAvoid.join(', '));
      }
    }

    const result = await generateDesign({
      imageUrl,
      roomType: project.roomType,
      style: project.style || 'modern',
      prompt: promptParts.length > 0 ? promptParts.join('. ') : undefined,
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

// Change Colors/Textures (requires mask from frontend)
router.post('/:id/change-colors', ensureAuthenticated, async (req, res) => {
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

    const { maskBase64, prompt, color, materials, materialsType, object } = req.body;

    if (!maskBase64) {
      return res.status(400).json({ success: false, error: 'Please paint the areas you want to change' });
    }

    // materials_type must be a valid sub-type for the chosen material (e.g. "Oak" for Wood)
    const MATERIAL_DEFAULTS = {
      'Wood': 'Oak', 'Stone': 'Marble', 'Metal': 'Steel', 'Glass': 'Clear',
      'Fabrics': 'Cotton', 'Ceramics and Porcelain': 'Glazed',
      'Plastics and Polymers': 'Acrylic', 'Paper and Cardboard': 'Wallpaper',
      'Natural Fibers': 'Jute', 'Composite Materials': 'Laminate'
    };
    let resolvedMaterialsType = materialsType;
    if (materials && !materialsType) {
      resolvedMaterialsType = MATERIAL_DEFAULTS[materials] || undefined;
    }

    project.status = 'generating';
    await project.save();

    let imageUrl = project.originalImages[0].url;
    if (imageUrl.startsWith('/')) {
      imageUrl = `${process.env.APP_URL || 'https://craftycrib.com'}${imageUrl}`;
    }

    console.log('[ChangeColors] Starting for project:', project._id, { color, materials, materialsType: resolvedMaterialsType, object });

    const result = await changeColorTextures({
      imageUrl,
      maskBase64,
      prompt: prompt || undefined,
      color: color || undefined,
      materials: materials || undefined,
      materialsType: resolvedMaterialsType || undefined,
      object: object || undefined,
      mode: 'Interior'
    });

    console.log('[ChangeColors] Result:', result.success ? 'SUCCESS' : 'FAILED', result.success ? '' : result.error);

    if (result.success) {
      project.designVariants.push({
        name: `Color Change${color ? ' - ' + color : ''}`,
        style: project.style,
        imageUrl: result.imageUrl,
        thumbnailUrl: result.thumbnailUrl,
        aiParameters: { type: 'color-change', prompt, color, materials, object }
      });

      project.status = 'completed';
      await project.save();

      res.json({
        success: true,
        design: project.designVariants[project.designVariants.length - 1]
      });
    } else {
      project.status = 'draft';
      await project.save();

      res.status(500).json({
        success: false,
        error: result.error || 'Failed to change colors'
      });
    }
  } catch (err) {
    console.error('[ChangeColors] Unexpected error:', err);
    res.status(500).json({ success: false, error: 'An unexpected error occurred: ' + err.message });
  }
});

// Unified AI Tool Handler
router.post('/:id/ai/:tool', ensureAuthenticated, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, user: req.user.id });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    if (!project.originalImages || project.originalImages.length === 0) {
      return res.status(400).json({ success: false, error: 'Please upload at least one image first' });
    }

    const tool = req.params.tool;
    const {
      maskBase64, prompt, style, designType, houseAngle, gardenType,
      aiIntervention, noDesign, keepStructural, strength,
      color, materials, materialsType, object, rgbColor,
      weather, countryCode, imageIndex, roomType: bodyRoomType
    } = req.body;

    // Select image (default to first, or user-selected)
    let imageUrl = project.originalImages[imageIndex || 0]?.url || project.originalImages[0].url;
    if (imageUrl.startsWith('/')) {
      imageUrl = `${process.env.APP_URL || 'https://craftycrib.com'}${imageUrl}`;
    }

    project.status = 'generating';
    await project.save();

    const baseOpts = {
      imageUrl,
      roomType: bodyRoomType || project.roomType,
      style: style || project.style || 'modern',
      prompt: prompt || undefined,
      designType: designType || 'Interior',
      houseAngle,
      gardenType,
      aiIntervention: aiIntervention || 'Mid',
      noDesign: parseInt(noDesign) || 1,
      keepStructural: keepStructural !== false
    };

    let result;
    let toolName;

    switch (tool) {
      case 'beautiful-redesign':
        toolName = 'Beautiful Redesign';
        result = await beautifulRedesign(baseOpts);
        break;
      case 'perfect-redesign':
        toolName = 'Perfect Redesign';
        result = await perfectRedesign(baseOpts);
        break;
      case 'creative-redesign':
        toolName = 'Creative Design';
        result = await creativeRedesign(baseOpts);
        break;
      case 'sketch-to-render':
        toolName = 'Sketch to Render';
        result = await sketchToRender(baseOpts);
        break;
      case 'precision':
        toolName = 'Precision';
        if (!maskBase64) return res.status(400).json({ success: false, error: 'Please paint the areas you want to redesign' });
        result = await precision({ ...baseOpts, maskBase64, strength: parseInt(strength) || 5 });
        break;
      case 'fill-spaces':
        toolName = 'Fill Spaces';
        if (!maskBase64) return res.status(400).json({ success: false, error: 'Please paint the areas you want to fill' });
        result = await fillSpaces({ ...baseOpts, maskBase64, strength: parseInt(strength) || 5 });
        break;
      case 'decor-staging':
        toolName = 'Decor Staging';
        result = await decorStaging(baseOpts);
        break;
      case 'furniture-removal':
        toolName = 'Furniture Removal';
        if (!maskBase64) return res.status(400).json({ success: false, error: 'Please paint the furniture you want to remove' });
        result = await furnitureRemoval({ imageUrl, maskBase64 });
        break;
      case 'color-textures':
        toolName = 'Color & Textures';
        if (!maskBase64) return res.status(400).json({ success: false, error: 'Please paint the areas you want to change' });
        const MATERIAL_DEFAULTS = {
          'Wood': 'Oak', 'Stone': 'Marble', 'Metal': 'Steel', 'Glass': 'Clear',
          'Fabrics': 'Cotton', 'Ceramics and Porcelain': 'Glazed',
          'Plastics and Polymers': 'Acrylic', 'Paper and Cardboard': 'Wallpaper',
          'Natural Fibers': 'Jute', 'Composite Materials': 'Laminate'
        };
        result = await changeColorTextures({
          imageUrl, maskBase64,
          prompt: prompt || undefined,
          color: color || undefined,
          materials: materials || undefined,
          materialsType: materialsType || (materials ? MATERIAL_DEFAULTS[materials] : undefined),
          object: object || undefined,
          mode: designType || 'Interior',
          noDesign: parseInt(noDesign) || 1
        });
        break;
      case 'paint-visualizer':
        toolName = 'Paint Visualizer';
        if (!maskBase64) return res.status(400).json({ success: false, error: 'Please paint the wall areas you want to repaint' });
        if (!rgbColor && !color) return res.status(400).json({ success: false, error: 'Please select a paint color' });
        result = await paintVisualizer({
          imageUrl, maskBase64,
          rgbColor: rgbColor || undefined,
          noDesign: parseInt(noDesign) || 1
        });
        break;
      case 'furniture-finder':
        toolName = 'Furniture Finder';
        result = await furnitureFinder({ imageUrl, countryCode: countryCode || undefined });
        break;
      case 'full-hd':
        toolName = 'Full HD';
        result = await fullHD({ imageUrl });
        break;
      case 'sky-colors':
        toolName = 'Sky Colors';
        result = await skyColors({ imageUrl, weather: weather || 'Clear Sky', noDesign: parseInt(noDesign) || 1 });
        break;
      case 'magic-redesign':
        toolName = 'Magic Redesign';
        result = await magicRedesign(baseOpts);
        break;
      case 'video-generation':
        toolName = 'Video Generation';
        result = await videoGeneration(baseOpts);
        break;
      case 'virtual-staging':
        toolName = 'Virtual Staging';
        result = await virtualStaging(baseOpts);
        break;
      case 'text-to-design':
        toolName = 'Text to Design';
        result = await textToDesign(baseOpts);
        break;
      case 'furniture-creator':
        toolName = 'Furniture Creator';
        result = await furnitureCreator({ imageUrl, style: style || project.style, prompt: prompt || undefined, noDesign: parseInt(noDesign) || 1 });
        break;
      case 'design-advisor':
        toolName = 'Design Advisor';
        result = await designAdvisor({ imageUrl, prompt: prompt || undefined });
        break;
      case 'design-transfer':
        toolName = 'Design Transfer';
        result = await designTransfer(baseOpts);
        break;
      case 'floor-editor':
        toolName = 'Floor Editor';
        if (!maskBase64) return res.status(400).json({ success: false, error: 'Please paint the floor areas you want to edit' });
        result = await floorEditor({
          imageUrl, maskBase64,
          prompt: prompt || undefined,
          style: style || project.style,
          materials: materials || undefined,
          materialsType: materialsType || undefined,
          color: color || undefined,
          designType: designType || 'Interior',
          noDesign: parseInt(noDesign) || 1
        });
        break;
      case 'material-swap':
        toolName = 'Material Swap';
        if (!maskBase64) return res.status(400).json({ success: false, error: 'Please paint the areas where you want to swap materials' });
        result = await materialSwap({
          imageUrl, maskBase64,
          prompt: prompt || undefined,
          materials: materials || undefined,
          materialsType: materialsType || undefined,
          color: color || undefined,
          designType: designType || 'Interior',
          noDesign: parseInt(noDesign) || 1
        });
        break;
      case 'room-composer':
        toolName = 'Room Composer';
        result = await roomComposer(baseOpts);
        break;
      case 'design-critique':
        toolName = 'Design Critique';
        result = await designCritique({ imageUrl, prompt: prompt || undefined });
        break;
      case 'create-mask-image':
        toolName = 'Create Mask Image';
        result = await createMaskImage({ imageUrl });
        break;
      case 'smart-home':
        toolName = 'Smart Home';
        result = await smartHome(baseOpts);
        break;
      default:
        project.status = 'draft';
        await project.save();
        return res.status(400).json({ success: false, error: 'Unknown AI tool: ' + tool });
    }

    console.log(`[AI:${tool}] Result:`, result.success ? 'SUCCESS' : 'FAILED');

    if (result.success) {
      // Furniture Finder returns product results, not images
      if (tool === 'furniture-finder') {
        project.status = 'completed';
        await project.save();
        return res.json({ success: true, resultArray: result.resultArray, tool: toolName });
      }

      // Text-only tools (design-advisor, design-critique)
      if (result.textResult) {
        project.status = 'completed';
        project.aiGenerationHistory.push({
          parameters: { tool, roomType: project.roomType },
          success: true
        });
        await project.save();
        return res.json({ success: true, textResult: result.textResult, tool: toolName });
      }

      // Video generation
      if (result.videoUrl) {
        project.designVariants.push({
          name: `${toolName}`,
          style: project.style,
          imageUrl: result.videoUrl,
          thumbnailUrl: result.imageUrl || result.videoUrl,
          aiParameters: {
            type: tool,
            toolName,
            prompt: prompt || undefined,
            designType: designType || 'Interior',
            style: style || project.style || undefined,
            roomType: bodyRoomType || project.roomType || undefined,
            isVideo: true
          }
        });
        project.status = 'completed';
        project.aiGenerationHistory.push({
          parameters: { tool, roomType: project.roomType },
          success: true
        });
        await project.save();
        return res.json({
          success: true,
          tool: toolName,
          videoUrl: result.videoUrl,
          designs: [{ name: toolName, imageUrl: result.videoUrl, isVideo: true }]
        });
      }

      // Save all generated images as variants
      const images = result.allImages || [result.imageUrl];
      images.forEach((imgUrl, i) => {
        project.designVariants.push({
          name: `${toolName}${images.length > 1 ? ' #' + (i + 1) : ''}`,
          style: project.style,
          imageUrl: imgUrl,
          thumbnailUrl: imgUrl,
          aiParameters: {
            type: tool,
            toolName,
            prompt: prompt || undefined,
            designType: designType || 'Interior',
            style: style || project.style || undefined,
            roomType: bodyRoomType || project.roomType || undefined,
            color: color || undefined,
            materials: materials || undefined,
            weather: weather || undefined,
            strength: strength ? parseInt(strength) : undefined,
            aiIntervention: aiIntervention || undefined
          }
        });
      });

      project.status = 'completed';
      project.aiGenerationHistory.push({
        parameters: { tool, roomType: project.roomType, style: project.style },
        success: true
      });
      await project.save();

      res.json({
        success: true,
        tool: toolName,
        designs: images.map((imgUrl, i) => ({
          name: `${toolName}${images.length > 1 ? ' #' + (i + 1) : ''}`,
          imageUrl: imgUrl
        }))
      });
    } else {
      project.status = 'draft';
      project.aiGenerationHistory.push({
        parameters: { tool },
        success: false,
        errorMessage: result.error
      });
      await project.save();
      res.status(500).json({ success: false, error: result.error || 'AI tool failed' });
    }
  } catch (err) {
    console.error(`[AI:${req.params.tool}] Error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a design variant (history entry)
router.delete('/:id/variants/:variantId', ensureAuthenticated, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, user: req.user.id });
    if (!project) return res.status(404).json({ success: false, error: 'Projet introuvable' });

    const before = project.designVariants.length;
    project.designVariants = project.designVariants.filter(
      v => v._id.toString() !== req.params.variantId
    );
    if (project.designVariants.length === before) {
      return res.status(404).json({ success: false, error: 'Variante introuvable' });
    }
    await project.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete variant error:', err);
    res.status(500).json({ success: false, error: err.message });
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

