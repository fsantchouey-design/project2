const express = require('express');
const router = express.Router();
const passport = require('passport');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { ensureGuest, ensureAuthenticated } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

// Login Page
router.get('/login', ensureGuest, (req, res) => {
  res.render('pages/auth/login', {
    title: 'Login - CraftyCrib',
    layout: 'layouts/auth'
  });
});

// Login Handler
router.post('/login', ensureGuest, (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/auth/login',
    failureFlash: true
  })(req, res, next);
});

// Register Page
router.get('/register', ensureGuest, (req, res) => {
  res.render('pages/auth/register', {
    title: 'Create Account - CraftyCrib',
    layout: 'layouts/auth'
  });
});

// Register Handler
router.post('/register', ensureGuest, [
  body('firstName').trim().notEmpty().withMessage('Le prénom est requis.'),
  body('lastName').trim().notEmpty().withMessage('Le nom est requis.'),
  body('email').isEmail().normalizeEmail().withMessage('Veuillez entrer une adresse e-mail valide.'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères.'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Les mots de passe ne correspondent pas.');
    }
    return true;
  }),
  body('role').isIn(['client', 'contractor']).withMessage('Veuillez sélectionner un rôle valide.')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('pages/auth/register', {
      title: 'Create Account - CraftyCrib',
      layout: 'layouts/auth',
      errors: errors.array(),
      formData: req.body
    });
  }

  const { firstName, lastName, email, password, role } = req.body;

  try {
    // Check if email is already taken
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.render('pages/auth/register', {
        title: 'Create Account - CraftyCrib',
        layout: 'layouts/auth',
        errors: [{ msg: 'Cette adresse e-mail est déjà associée à un compte. Veuillez vous connecter ou utiliser une autre adresse.', param: 'email' }],
        formData: req.body
      });
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      role,
      verificationToken,
      verificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      isVerified: true // Set to true for now, change to false for email verification
    });

    await user.save();

    // Auto-login after registration
    req.login(user, (err) => {
      if (err) {
        console.error('Auto-login error:', err);
        req.flash('success_msg', 'Account created successfully! Please log in.');
        return res.redirect('/auth/login');
      }
      req.flash('success_msg', `Welcome to CraftyCrib, ${user.firstName}! 🎉`);
      
      // Redirect contractors to setup, clients to dashboard
      if (user.role === 'contractor') {
        return res.redirect('/contractors/setup');
      }
      res.redirect('/dashboard');
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.render('pages/auth/register', {
      title: 'Create Account - CraftyCrib',
      layout: 'layouts/auth',
      errors: [{ msg: 'An error occurred. Please try again.' }],
      formData: req.body
    });
  }
});

// Email Verification
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
      verificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      req.flash('error_msg', 'Invalid or expired verification link');
      return res.redirect('/auth/login');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    req.flash('success_msg', 'Email verified successfully! You can now log in.');
    res.redirect('/auth/login');
  } catch (err) {
    console.error('Verification error:', err);
    req.flash('error_msg', 'An error occurred during verification');
    res.redirect('/auth/login');
  }
});

// Forgot Password Page
router.get('/forgot-password', ensureGuest, (req, res) => {
  res.render('pages/auth/forgot-password', {
    title: 'Forgot Password - CraftyCrib',
    layout: 'layouts/auth'
  });
});

// Forgot Password Handler
router.post('/forgot-password', ensureGuest, [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('pages/auth/forgot-password', {
      title: 'Forgot Password - CraftyCrib',
      layout: 'layouts/auth',
      errors: errors.array()
    });
  }

  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });

    if (!user) {
      // Don't reveal if email exists
      req.flash('success_msg', 'If an account exists with that email, a reset link has been sent.');
      return res.redirect('/auth/forgot-password');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.APP_URL}/auth/reset-password/${resetToken}`;
    await sendEmail(user.email, 'resetPassword', [user.firstName, resetUrl]);

    req.flash('success_msg', 'If an account exists with that email, a reset link has been sent.');
    res.redirect('/auth/forgot-password');
  } catch (err) {
    console.error('Forgot password error:', err);
    req.flash('error_msg', 'An error occurred. Please try again.');
    res.redirect('/auth/forgot-password');
  }
});

// Reset Password Page
router.get('/reset-password/:token', ensureGuest, async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      req.flash('error_msg', 'Invalid or expired reset link');
      return res.redirect('/auth/forgot-password');
    }

    res.render('pages/auth/reset-password', {
      title: 'Reset Password - CraftyCrib',
      layout: 'layouts/auth',
      token: req.params.token
    });
  } catch (err) {
    console.error('Reset password page error:', err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/auth/forgot-password');
  }
});

// Reset Password Handler
router.post('/reset-password/:token', ensureGuest, [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('pages/auth/reset-password', {
      title: 'Reset Password - CraftyCrib',
      layout: 'layouts/auth',
      token: req.params.token,
      errors: errors.array()
    });
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      req.flash('error_msg', 'Invalid or expired reset link');
      return res.redirect('/auth/forgot-password');
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    req.flash('success_msg', 'Password reset successfully! You can now log in.');
    res.redirect('/auth/login');
  } catch (err) {
    console.error('Reset password error:', err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/auth/forgot-password');
  }
});

// Logout
router.get('/logout', ensureAuthenticated, (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash('success_msg', 'You have been logged out');
    res.redirect('/auth/login');
  });
});

module.exports = router;

