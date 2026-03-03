const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Project = require('../models/Project');
const Contractor = require('../models/Contractor');
const { generateDesign, getStyles, getRoomTypes, checkCredits } = require('../utils/homedesigns');

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

    const result = await generateDesign({
      imageUrl,
      roomType: project.roomType,
      style: style || project.style || 'modern',
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

