// Authentication Middleware

// Ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  // For AJAX/fetch requests, return JSON instead of redirect
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'))) {
    return res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
  }

  req.flash('error_msg', 'Please log in to access this page');
  res.redirect('/auth/login');
};

// Ensure user is NOT authenticated (for login/register pages)
const ensureGuest = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/dashboard');
};

// Ensure user is a client
const ensureClient = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'client') {
    return next();
  }
  req.flash('error_msg', 'Access denied. Client account required.');
  res.redirect('/dashboard');
};

// Ensure user is a contractor
const ensureContractor = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'contractor') {
    return next();
  }
  req.flash('error_msg', 'Access denied. Contractor account required.');
  res.redirect('/dashboard');
};

// Ensure user is an admin
const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  req.flash('error_msg', 'Access denied. Admin privileges required.');
  res.redirect('/dashboard');
};

// Ensure user has premium subscription
const ensurePremium = (req, res, next) => {
  if (req.isAuthenticated() && req.user.isPremium) {
    return next();
  }
  req.flash('error_msg', 'This feature requires a premium subscription.');
  res.redirect('/pricing');
};

// Check project ownership
const ensureProjectOwner = async (req, res, next) => {
  try {
    const Project = require('../models/Project');
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      req.flash('error_msg', 'Project not found');
      return res.redirect('/dashboard');
    }
    
    if (project.user.toString() !== req.user.id && req.user.role !== 'admin') {
      req.flash('error_msg', 'Access denied. You do not own this project.');
      return res.redirect('/dashboard');
    }
    
    req.project = project;
    next();
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
};

module.exports = {
  ensureAuthenticated,
  ensureGuest,
  ensureClient,
  ensureContractor,
  ensureAdmin,
  ensurePremium,
  ensureProjectOwner
};

