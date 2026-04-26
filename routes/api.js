const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Project = require('../models/Project');
const Contractor = require('../models/Contractor');
const {
  generateDesign, beautifulRedesign, perfectRedesign, creativeRedesign,
  sketchToRender, precision, fillSpaces, decorStaging, furnitureRemoval,
  changeColorTextures, paintVisualizer, furnitureFinder, fullHD, skyColors,
  magicRedesign, videoGeneration, virtualStaging, textToDesign, furnitureCreator,
  designAdvisor, designTransfer, floorEditor, materialSwap, roomComposer,
  designCritique, createMaskImage, smartHome,
  getStyles, getRoomTypes, checkCredits
} = require('../utils/homedesigns');
const { uploadProjectImages, getImageUrl } = require('../config/cloudinary');

// API Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get Design Styles
router.get('/styles', (req, res) => {
  res.json(getStyles());
});

// Get Room Types
router.get('/room-types', (req, res) => {
  res.json(getRoomTypes());
});

// Check AI Credits
router.get('/credits', ensureAuthenticated, async (req, res) => {
  const credits = await checkCredits();
  res.json(credits);
});

const aiToolHandlers = {
  perfect_redesign: {
    name: 'Perfect Redesign',
    run: (options) => perfectRedesign(options)
  },
  beautiful_redesign: {
    name: 'Beautiful Redesign',
    run: (options) => beautifulRedesign(options)
  },
  magic_redesign: {
    name: 'Magic Redesign',
    run: (options) => magicRedesign(options)
  },
  video_generation: {
    name: 'Video Generation',
    run: (options) => videoGeneration(options)
  },
  creative_redesign: {
    name: 'Creative Redesign',
    run: (options) => creativeRedesign(options)
  },
  sketch_to_render: {
    name: 'Sketch To Render',
    run: (options) => sketchToRender(options)
  },
  virtual_staging: {
    name: 'Virtual Staging',
    run: (options) => virtualStaging(options)
  },
  precision: {
    name: 'Precision',
    requiresMask: true,
    run: (options) => precision(options)
  },
  fill_spaces: {
    name: 'Fill Spaces',
    requiresMask: true,
    run: (options) => fillSpaces(options)
  },
  decor_staging: {
    name: 'Decor Staging',
    run: (options) => decorStaging(options)
  },
  furniture_removal: {
    name: 'Furniture Removal',
    requiresMask: true,
    run: ({ imageUrl, maskBase64 }) => furnitureRemoval({ imageUrl, maskBase64 })
  },
  change_color_textures: {
    name: 'Change Color Textures',
    requiresMask: true,
    run: (options) => changeColorTextures({
      imageUrl: options.imageUrl,
      maskBase64: options.maskBase64,
      prompt: options.prompt,
      mode: options.designType,
      noDesign: options.noDesign
    })
  },
  furniture_finder: {
    name: 'Furniture Finder',
    run: ({ imageUrl }) => furnitureFinder({ imageUrl })
  },
  full_hd: {
    name: 'Full HD',
    run: ({ imageUrl }) => fullHD({ imageUrl })
  },
  text_to_design: {
    name: 'Text To Design',
    run: (options) => textToDesign(options)
  },
  furniture_creator: {
    name: 'Furniture Creator',
    run: (options) => furnitureCreator(options)
  },
  design_advisor: {
    name: 'Design Advisor',
    run: ({ imageUrl, prompt }) => designAdvisor({ imageUrl, prompt })
  },
  sky_colors: {
    name: 'Sky Colors',
    run: ({ imageUrl, noDesign }) => skyColors({ imageUrl, weather: 'Clear Sky', noDesign })
  },
  design_transfer: {
    name: 'Design Transfer',
    run: (options) => designTransfer(options)
  },
  floor_editor: {
    name: 'Floor Editor',
    requiresMask: true,
    run: (options) => floorEditor(options)
  },
  paint_visualizer: {
    name: 'Paint Visualizer',
    requiresMask: true,
    run: (options) => paintVisualizer(options)
  },
  material_swap: {
    name: 'Material Swap',
    requiresMask: true,
    run: (options) => materialSwap(options)
  },
  room_composer: {
    name: 'Room Composer',
    run: (options) => roomComposer(options)
  },
  design_critique: {
    name: 'Design Critique',
    run: ({ imageUrl, prompt }) => designCritique({ imageUrl, prompt })
  },
  create_maskimage: {
    name: 'Create Mask Image',
    run: ({ imageUrl }) => createMaskImage({ imageUrl })
  },
  smart_home: {
    name: 'Smart Home',
    run: (options) => smartHome(options)
  }
};

const toAbsoluteImageUrl = (imageUrl) => {
  if (!imageUrl || !imageUrl.startsWith('/')) return imageUrl;
  return `${process.env.APP_URL || 'https://craftycrib.com'}${imageUrl}`;
};

// Dynamic HomeDesignsAI proxy for the new project studio.
// TODO: Configure HOMEDESIGNS_API_TOKEN in the server environment before production use.
router.post('/v2/:tool', ensureAuthenticated, uploadProjectImages.single('image'), async (req, res) => {
  try {
    const tool = aiToolHandlers[req.params.tool];
    if (!tool) {
      return res.status(404).json({ success: false, error: 'Unknown AI tool endpoint.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload an image before generating.' });
    }

    if (tool.requiresMask && !req.body.maskBase64) {
      return res.status(400).json({
        success: false,
        error: `${tool.name} requires a mask. Mask drawing will be added to this studio in a later step.`
      });
    }

    const imageUrl = toAbsoluteImageUrl(getImageUrl(req.file));
    const options = {
      imageUrl,
      maskBase64: req.body.maskBase64,
      roomType: req.body.roomType || 'living-room',
      style: req.body.style || 'modern',
      prompt: req.body.prompt || undefined,
      designType: req.body.designType || 'Interior',
      aiIntervention: req.body.aiIntervention || 'Mid',
      noDesign: parseInt(req.body.noDesign, 10) || 1,
      keepStructural: req.body.keepStructural !== 'false'
    };

    const result = await tool.run(options);

    if (!result || !result.success) {
      return res.status(500).json({
        success: false,
        error: result?.error || 'AI generation failed.'
      });
    }

    const images = result.allImages || (result.imageUrl ? [result.imageUrl] : []);

    return res.json({
      success: true,
      tool: tool.name,
      endpoint: `/api/v2/${req.params.tool}`,
      imageUrl: result.imageUrl,
      videoUrl: result.videoUrl,
      textResult: result.textResult,
      resultArray: result.resultArray,
      designs: images.map((url, index) => ({
        name: `${tool.name}${images.length > 1 ? ` #${index + 1}` : ''}`,
        imageUrl: url
      }))
    });
  } catch (err) {
    console.error('[API v2 studio] error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

// Generate Design (AJAX)
router.post('/generate', ensureAuthenticated, async (req, res) => {
  try {
    const { projectId, style } = req.body;

    const project = await Project.findOne({
      _id: projectId,
      user: req.user.id
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.originalImages || project.originalImages.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    project.status = 'generating';
    await project.save();

    let imageUrl = project.originalImages[0].url;
    // If it's a local URL, construct full URL (for AI API to access)
    if (imageUrl.startsWith('/')) {
      imageUrl = `${process.env.APP_URL || 'https://craftycrib.com'}${imageUrl}`;
    }

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
      style: style || project.style || 'modern',
      prompt: promptParts.length > 0 ? promptParts.join('. ') : undefined,
      quality: req.user.isPremium ? 'hd' : 'standard'
    });

    if (result.success) {
      project.designVariants.push({
        name: `${style || project.style || 'Modern'} Design`,
        style: style || project.style,
        imageUrl: result.imageUrl,
        thumbnailUrl: result.thumbnailUrl,
        aiParameters: result
      });

      project.status = 'completed';
      await project.save();

      res.json({
        success: true,
        variant: project.designVariants[project.designVariants.length - 1]
      });
    } else {
      project.status = 'pending';
      await project.save();

      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (err) {
    console.error('API Generate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Project Data
router.get('/projects/:id', ensureAuthenticated, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (err) {
    console.error('API Get project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Project Status/Visibility
router.patch('/projects/:id/status', ensureAuthenticated, async (req, res) => {
  try {
    const { status, visibility } = req.body;
    const update = {};
    if (status) update.status = status;
    if (visibility) update.visibility = visibility;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      update,
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ success: true, project });
  } catch (err) {
    console.error('API Update status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search Contractors
router.get('/contractors/search', async (req, res) => {
  try {
    const { q, specialty, city, limit = 10 } = req.query;

    let query = { isActive: true };

    if (q) {
      query.$or = [
        { companyName: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    if (specialty) {
      query.specialties = specialty;
    }

    if (city) {
      query['serviceArea.cities'] = { $regex: city, $options: 'i' };
    }

    const contractors = await Contractor.find(query)
      .populate('user', 'firstName lastName')
      .select('companyName slug specialties rating serviceArea')
      .limit(parseInt(limit));

    res.json(contractors);
  } catch (err) {
    console.error('API Search contractors error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard Stats (for client)
router.get('/stats', ensureAuthenticated, async (req, res) => {
  try {
    const stats = {
      totalProjects: await Project.countDocuments({ user: req.user.id }),
      completedDesigns: await Project.countDocuments({ user: req.user.id, status: 'completed' }),
      inProgress: await Project.countDocuments({ user: req.user.id, status: { $in: ['generating', 'in-progress'] } }),
      totalVariants: 0
    };

    const projects = await Project.find({ user: req.user.id });
    stats.totalVariants = projects.reduce((acc, p) => acc + (p.designVariants?.length || 0), 0);

    res.json(stats);
  } catch (err) {
    console.error('API Stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
