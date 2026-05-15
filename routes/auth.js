const express = require('express');
const router = express.Router();
const passport = require('passport');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { ensureGuest, ensureAuthenticated } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const { sendEmail: sendResendEmail } = require('../services/email');

const ADMIN_EMAIL = 'craftycrib.ca@gmail.com';

// Login Page
router.get('/login', ensureGuest, (req, res) => {
  res.render('pages/auth/login', {
    title: 'Login - CraftyCrib',
    layout: 'layouts/auth'
  });
});

// Login Handler
router.post('/login', ensureGuest, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash('error_msg', (info && info.message) ? info.message : 'Email ou mot de passe incorrect.');
      return res.redirect('/auth/login');
    }
    req.login(user, (loginErr) => {
      if (loginErr) { return next(loginErr); }
      // Admin: direct access to pro dashboard, no checks needed
      if (user.role === 'admin') {
        return res.redirect('/pro/dashboard');
      }
      if (user.proStatus === 'pending_approval') {
        return res.redirect('/pro/pending');
      }
      if (user.proStatus === 'rejected') {
        req.flash('error_msg', 'Votre demande pro a été refusée.');
        req.logout((logoutErr) => {
          if (logoutErr) { return next(logoutErr); }
          return res.redirect('/auth/login');
        });
        return;
      }
      if (user.role === 'professional') {
        return res.redirect('/pro/dashboard');
      }
      if (user.role === 'contractor') {
        return res.redirect('/contractors/setup');
      }
      return res.redirect('/dashboard');
    });
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
  const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL;

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

    // Admin email always gets admin role and approved status regardless of submitted role
    const assignedRole = isAdminEmail ? 'admin' : role;
    const assignedProStatus = isAdminEmail ? 'approved' : 'none';

    // Create user
    const user = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      role: assignedRole,
      proStatus: assignedProStatus,
      verificationToken,
      verificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      isVerified: true
    });

    await user.save();

    // Welcome email via Resend (non-blocking)
    try {
      await sendResendEmail({
        to: user.email,
        subject: 'Bienvenue sur CraftyCrib',
        html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .logo { font-size: 28px; font-weight: bold; background: linear-gradient(135deg, #00ff88, #00d4ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-align: center; display: block; margin-bottom: 32px; }
    .card { background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04)); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 40px; }
    h1 { color: #ffffff; font-size: 22px; margin: 0 0 16px; }
    p { color: #a0a0a0; line-height: 1.6; margin: 0 0 16px; }
    .button { display: inline-block; background: linear-gradient(135deg, #00ff88, #00d4ff); color: #000000; text-decoration: none; padding: 14px 36px; border-radius: 50px; font-weight: bold; font-size: 15px; }
    .footer { text-align: center; color: #555; font-size: 12px; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <span class="logo">CraftyCrib</span>
    <div class="card">
      <h1>Bienvenue, ${user.firstName} !</h1>
      <p>Votre compte CraftyCrib a été créé avec succès. Vous pouvez maintenant utiliser nos outils IA pour transformer vos espaces en designs professionnels.</p>
      <p>Pour commencer, créez votre premier projet et laissez l'IA faire le reste.</p>
      <center style="margin-top: 24px;">
        <a href="${process.env.APP_URL || 'https://craftycrib.ca'}/dashboard" class="button">Accéder à mon tableau de bord</a>
      </center>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} CraftyCrib. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>`
      });
    } catch (emailErr) {
      console.error('Welcome email failed:', emailErr);
    }

    // Auto-login after registration
    req.login(user, (err) => {
      if (err) {
        console.error('Auto-login error:', err);
        req.flash('success_msg', 'Account created successfully! Please log in.');
        return res.redirect('/auth/login');
      }
      req.flash('success_msg', `Welcome to CraftyCrib, ${user.firstName}! 🎉`);

      if (user.role === 'admin') return res.redirect('/pro/dashboard');
      if (user.role === 'contractor') return res.redirect('/contractors/setup');
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

    // Rate limit: silently succeed if a token was issued less than 5 minutes ago
    if (user.resetPasswordExpires && user.resetPasswordExpires > Date.now() + 25 * 60 * 1000) {
      req.flash('success_msg', 'If an account exists with that email, a reset link has been sent.');
      return res.redirect('/auth/forgot-password');
    }

    // Generate reset token — store SHA-256 hash in DB, send plain token in email
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
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
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
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
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
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

// Google OAuth — initiate
router.get('/google', ensureGuest, passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Google OAuth — callback
router.get('/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash('error_msg', 'Connexion Google échouée. Veuillez réessayer.');
      return res.redirect('/auth/login');
    }
    req.login(user, (loginErr) => {
      if (loginErr) { return next(loginErr); }
      req.flash('success_msg', 'Bienvenue, ' + user.firstName + ' !');
      // Admin: direct access to pro dashboard
      if (user.role === 'admin') {
        return res.redirect('/pro/dashboard');
      }
      if (user.proStatus === 'pending_approval') {
        return res.redirect('/pro/pending');
      }
      if (user.proStatus === 'rejected') {
        req.flash('error_msg', 'Votre demande pro a été refusée.');
        req.logout((logoutErr) => {
          if (logoutErr) { return next(logoutErr); }
          return res.redirect('/auth/login');
        });
        return;
      }
      if (user.role === 'professional') {
        return res.redirect('/pro/dashboard');
      }
      if (user.role === 'contractor') {
        return res.redirect('/contractors/setup');
      }
      return res.redirect('/dashboard');
    });
  })(req, res, next);
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

