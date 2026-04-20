const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Project = require('../models/Project');
const Contractor = require('../models/Contractor');
const { Message, Conversation } = require('../models/Message');
const { getAiTools } = require('../utils/homedesigns');

// Force dashboard layout for ALL routes in this router
router.use((req, res, next) => {
  res.locals.layout = 'layouts/dashboard';
  next();
});

// Dashboard Home - Route based on role
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    if (req.user.role === 'contractor') {
      // Contractor Dashboard
      const contractor = await Contractor.findOne({ user: req.user.id });
      
      const availableProjects = await Project.find({
        visibility: 'contractors',
        status: { $in: ['completed', 'pending'] }
      })
        .populate('user', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10);
      
      const stats = {
        profileViews: contractor?.stats?.profileViews || 0,
        projectsReceived: contractor?.stats?.projectsReceived || 0,
        projectsAccepted: contractor?.stats?.projectsAccepted || 0,
        avgRating: contractor?.rating?.average || 0
      };

      res.render('pages/dashboard/contractor', {
        title: 'Contractor Dashboard - CraftyCrib',
        layout: 'layouts/dashboard',
        activePage: 'dashboard',
        contractor,
        availableProjects,
        stats
      });
    } else {
      // Client Dashboard
      const projects = await Project.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .limit(5);
      
      const allProjects = await Project.find({ user: req.user.id });
      const totalVariants = allProjects.reduce((acc, p) => acc + (p.designVariants?.length || 0), 0);
      
      const stats = {
        totalProjects: allProjects.length,
        completedDesigns: allProjects.filter(p => p.status === 'completed').length,
        inProgress: allProjects.filter(p => ['generating', 'in-progress', 'pending'].includes(p.status)).length,
        totalVariants
      };
      
      // Recent activity (mock for now)
      const recentActivity = [
        { type: 'design', message: 'Your AI design is ready to view', time: '2 hours ago' },
        { type: 'message', message: 'New message from contractor', time: '5 hours ago' },
        { type: 'project', message: 'Project "Living Room" was updated', time: '1 day ago' }
      ];

      res.render('pages/dashboard/client', {
        title: 'My Dashboard - CraftyCrib',
        metaDescription: 'Manage your AI-powered interior design projects and connect with contractors.',
        layout: 'layouts/dashboard',
        activePage: 'dashboard',
        projects,
        stats,
        recentActivity
      });
    }
  } catch (err) {
    console.error('Dashboard error:', err);
    req.flash('error_msg', 'An error occurred loading the dashboard');
    res.redirect('/');
  }
});

// Profile Settings
router.get('/settings', ensureAuthenticated, (req, res) => {
  res.render('pages/dashboard/settings', {
    title: 'Account Settings - CraftyCrib',
    layout: 'layouts/dashboard',
    activePage: 'settings',
    pageTitle: 'Settings'
  });
});

// Update Profile
router.post('/settings', ensureAuthenticated, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    
    await req.user.updateOne({
      firstName,
      lastName,
      phone
    });

    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/dashboard/settings');
  } catch (err) {
    console.error('Update profile error:', err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/dashboard/settings');
  }
});

// Messages
router.get('/messages', ensureAuthenticated, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id
    })
      .populate('participants', 'firstName lastName avatar')
      .populate('project', 'title')
      .sort({ updatedAt: -1 });

    res.render('pages/dashboard/messages', {
      title: 'Messages - CraftyCrib',
      layout: 'layouts/dashboard',
      activePage: 'messages',
      pageTitle: 'Messages',
      conversations
    });
  } catch (err) {
    console.error('Messages error:', err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/dashboard');
  }
});

// Single Conversation
router.get('/messages/:id', ensureAuthenticated, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user.id
    }).populate('participants', 'firstName lastName avatar');

    if (!conversation) {
      req.flash('error_msg', 'Conversation not found');
      return res.redirect('/dashboard/messages');
    }

    const messages = await Message.find({ conversation: conversation._id })
      .populate('sender', 'firstName lastName avatar')
      .sort({ createdAt: 1 });

    res.render('pages/dashboard/conversation', {
      title: 'Conversation - CraftyCrib',
      layout: 'layouts/dashboard',
      activePage: 'messages',
      conversation,
      messages
    });
  } catch (err) {
    console.error('Conversation error:', err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/dashboard/messages');
  }
});

// Send Message
router.post('/messages/:id', ensureAuthenticated, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const message = new Message({
      conversation: conversation._id,
      sender: req.user.id,
      content: req.body.content
    });

    await message.save();

    // Update conversation
    conversation.lastMessage = {
      content: req.body.content,
      sender: req.user.id,
      createdAt: new Date()
    };
    await conversation.save();

    res.redirect(`/dashboard/messages/${conversation._id}`);
  } catch (err) {
    console.error('Send message error:', err);
    req.flash('error_msg', 'Failed to send message');
    res.redirect(`/dashboard/messages/${req.params.id}`);
  }
});

// Notifications
router.get('/notifications', ensureAuthenticated, (req, res) => {
  res.render('pages/dashboard/notifications', {
    title: 'Notifications - CraftyCrib',
    layout: 'layouts/dashboard',
    activePage: 'notifications',
    pageTitle: 'Notifications'
  });
});

// AI Tools page
router.get('/ai-tools', ensureAuthenticated, async (req, res) => {
  try {
    const projects = await Project.find({ user: req.user.id })
      .select('_id title roomType status')
      .sort({ updatedAt: -1 });

    res.render('pages/ai-tools', {
      title: 'Outils IA — CraftyCrib',
      metaDescription: 'Découvrez les 26 outils IA de CraftyCrib pour transformer vos espaces.',
      layout: 'layouts/dashboard',
      activePage: 'ai-tools',
      aiTools: getAiTools(),
      projects
    });
  } catch (err) {
    console.error('AI tools page error:', err);
    req.flash('error_msg', 'Une erreur est survenue');
    res.redirect('/dashboard');
  }
});

module.exports = router;

