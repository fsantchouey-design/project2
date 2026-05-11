const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { ensureAuthenticated, ensureProfessional, ensureAdmin } = require('../middleware/auth');
const ProApplication = require('../models/ProApplication');
const User = require('../models/User');
const Note = require('../models/Note');
const QuoteRequest = require('../models/QuoteRequest');
const { sendRawEmail, transporter } = require('../utils/email');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads/pro-applications');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const fileFilter = function(req, file, cb) {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont acceptées.'), false);
  }
};
const upload = multer({ storage: storage, fileFilter: fileFilter });

// Default layout for pro dashboard routes
router.use(function(req, res, next) {
  // Only set pro-dashboard layout for dashboard routes; other routes set their own
  next();
});

// ─── PRO REGISTRATION PAGES ─────────────────────────────────────────────────

// GET /pro/register — portal landing
router.get('/register', function(req, res) {
  res.render('pages/pro/register', {
    title: 'Espace Professionnel — CraftyCrib',
    layout: 'layouts/auth'
  });
});

// GET /pro/login — redirect to /auth/login
router.get('/login', function(req, res) {
  res.redirect('/auth/login');
});

// GET /pro/signup — registration form
router.get('/signup', function(req, res) {
  res.render('pages/pro/signup', {
    title: 'Créer un compte professionnel — CraftyCrib',
    layout: 'layouts/auth',
    formData: {}
  });
});

// POST /pro/signup — handle registration
router.post('/signup', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'photos', maxCount: 10 }
]), async function(req, res) {
  var body = req.body;
  var required = ['firstName', 'lastName', 'companyName', 'email', 'phone',
    'address', 'city', 'postalCode', 'country', 'description',
    'yearsExperience', 'serviceAreas', 'password'];

  var missingFields = [];
  required.forEach(function(field) {
    if (!body[field] || body[field].toString().trim() === '') {
      missingFields.push(field);
    }
  });

  // categories check
  if (!body.categories || (Array.isArray(body.categories) && body.categories.length === 0)) {
    missingFields.push('categories');
  }

  if (missingFields.length > 0) {
    return res.render('pages/pro/signup', {
      title: 'Créer un compte professionnel — CraftyCrib',
      layout: 'layouts/auth',
      error_msg: 'Veuillez remplir tous les champs obligatoires.',
      formData: body
    });
  }

  if (body.password !== body.confirmPassword) {
    return res.render('pages/pro/signup', {
      title: 'Créer un compte professionnel — CraftyCrib',
      layout: 'layouts/auth',
      error_msg: 'Les mots de passe ne correspondent pas.',
      formData: body
    });
  }

  if (body.password.length < 6) {
    return res.render('pages/pro/signup', {
      title: 'Créer un compte professionnel — CraftyCrib',
      layout: 'layouts/auth',
      error_msg: 'Le mot de passe doit contenir au moins 6 caractères.',
      formData: body
    });
  }

  try {
    var existingUser = await User.findOne({ email: body.email.toLowerCase() });
    if (existingUser) {
      return res.render('pages/pro/signup', {
        title: 'Créer un compte professionnel — CraftyCrib',
        layout: 'layouts/auth',
        error_msg: 'Cette adresse e-mail est déjà utilisée.',
        formData: body
      });
    }

    // Create user
    var user = new User({
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: body.email.toLowerCase().trim(),
      password: body.password,
      role: 'professional',
      proStatus: 'pending_approval',
      isVerified: true
    });
    await user.save();

    // Handle file uploads
    var logoPath = '';
    if (req.files && req.files['logo'] && req.files['logo'][0]) {
      logoPath = '/uploads/pro-applications/' + req.files['logo'][0].filename;
    }
    var photoPaths = [];
    if (req.files && req.files['photos']) {
      req.files['photos'].forEach(function(f) {
        photoPaths.push('/uploads/pro-applications/' + f.filename);
      });
    }

    // Generate approval token
    var approvalToken = crypto.randomBytes(32).toString('hex');

    // Create ProApplication
    var categories = body.categories
      ? (Array.isArray(body.categories) ? body.categories : [body.categories])
      : [];

    var app = new ProApplication({
      user: user._id,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      companyName: body.companyName.trim(),
      email: body.email.toLowerCase().trim(),
      phone: body.phone.trim(),
      address: body.address.trim(),
      city: body.city.trim(),
      postalCode: body.postalCode.trim(),
      country: body.country.trim(),
      categories: categories,
      description: body.description.trim(),
      yearsExperience: body.yearsExperience.trim(),
      serviceAreas: body.serviceAreas.trim(),
      businessNumber: (body.businessNumber || '').trim(),
      website: (body.website || '').trim(),
      socialInstagram: (body.socialInstagram || '').trim(),
      socialFacebook: (body.socialFacebook || '').trim(),
      logo: logoPath,
      photos: photoPaths,
      approvalToken: approvalToken,
      status: 'pending'
    });
    await app.save();

    // Send admin notification email
    var emailTemplates = require('../utils/email');
    // Build the email inline since we need access to the template
    var appUrl = process.env.APP_URL || 'http://localhost:3000';
    var subject = '[CraftyCrib] Nouvelle demande pro — ' + (app.companyName || (app.firstName + ' ' + app.lastName));
    var categoriesHtml = categories.length
      ? categories.map(function(c) { return '<span style="display:inline-block;background:rgba(0,255,136,0.15);color:#00ff88;border:1px solid rgba(0,255,136,0.3);border-radius:20px;padding:3px 10px;font-size:12px;margin:2px 3px;">' + c + '</span>'; }).join('')
      : '—';
    var html = '<!DOCTYPE html><html><head><style>' +
      'body{font-family:"Segoe UI",Arial,sans-serif;background:#0a0a0f;color:#ffffff;margin:0;padding:0;}' +
      '.container{max-width:640px;margin:0 auto;padding:40px 20px;}' +
      '.logo{font-size:28px;font-weight:bold;color:#00ff88;margin-bottom:24px;display:block;text-align:center;}' +
      '.card{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:36px;}' +
      'h1{color:#ffffff;font-size:22px;margin:0 0 24px;}' +
      '.section-title{color:#00ff88;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:24px 0 10px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px;}' +
      '.field{display:flex;gap:12px;margin-bottom:10px;}' +
      '.field-label{color:#888;font-size:13px;min-width:160px;flex-shrink:0;}' +
      '.field-value{color:#e0e0e0;font-size:13px;word-break:break-all;}' +
      '.action-row{text-align:center;margin-top:32px;}' +
      '.btn-approve{display:inline-block;background:#00ff88;color:#000;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:bold;font-size:14px;margin:0 8px;}' +
      '.btn-reject{display:inline-block;background:#ff4444;color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:bold;font-size:14px;margin:0 8px;}' +
      '.footer{text-align:center;color:#555;font-size:12px;margin-top:32px;}' +
      '</style></head><body>' +
      '<div class="container">' +
      '<span class="logo">CraftyCrib Admin</span>' +
      '<div class="card">' +
      '<h1>Nouvelle demande professionnelle</h1>' +
      '<div class="section-title">Identite</div>' +
      '<div class="field"><span class="field-label">Prenom</span><span class="field-value">' + (app.firstName || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Nom</span><span class="field-value">' + (app.lastName || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Entreprise</span><span class="field-value">' + (app.companyName || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Email</span><span class="field-value">' + (app.email || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Telephone</span><span class="field-value">' + (app.phone || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Numero entreprise</span><span class="field-value">' + (app.businessNumber || '—') + '</span></div>' +
      '<div class="section-title">Adresse</div>' +
      '<div class="field"><span class="field-label">Adresse</span><span class="field-value">' + (app.address || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Ville</span><span class="field-value">' + (app.city || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Code postal</span><span class="field-value">' + (app.postalCode || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Pays</span><span class="field-value">' + (app.country || '—') + '</span></div>' +
      '<div class="section-title">Metier</div>' +
      '<div class="field"><span class="field-label">Categories</span><span class="field-value">' + categoriesHtml + '</span></div>' +
      '<div class="field"><span class="field-label">Experience</span><span class="field-value">' + (app.yearsExperience || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Zones de service</span><span class="field-value">' + (app.serviceAreas || '—') + '</span></div>' +
      '<div class="section-title">Presentation</div>' +
      '<div class="field"><span class="field-label">Description</span><span class="field-value">' + (app.description || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Site web</span><span class="field-value">' + (app.website || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Instagram</span><span class="field-value">' + (app.socialInstagram || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Facebook</span><span class="field-value">' + (app.socialFacebook || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Logo</span><span class="field-value">' + (app.logo ? 'Oui' : 'Non') + '</span></div>' +
      '<div class="field"><span class="field-label">Photos</span><span class="field-value">' + (app.photos && app.photos.length ? app.photos.length + ' photo(s)' : 'Aucune') + '</span></div>' +
      '<div class="section-title">Actions rapides</div>' +
      '<div class="action-row">' +
      '<a href="' + appUrl + '/pro/admin/applications/' + app._id + '/approve/' + app.approvalToken + '" class="btn-approve">Approuver</a>' +
      '<a href="' + appUrl + '/pro/admin/applications/' + app._id + '/reject/' + app.approvalToken + '" class="btn-reject">Rejeter</a>' +
      '</div>' +
      '</div>' +
      '<div class="footer"><p>CraftyCrib &copy; ' + new Date().getFullYear() + '</p></div>' +
      '</div></body></html>';

    await sendRawEmail('craftycrib.ca@gmail.com', subject, html);

    // Auto-login
    req.login(user, function(err) {
      if (err) {
        console.error('Auto-login error:', err);
        return res.redirect('/pro/pending');
      }
      return res.redirect('/pro/pending');
    });
  } catch (err) {
    console.error('Pro signup error:', err);
    return res.render('pages/pro/signup', {
      title: 'Créer un compte professionnel — CraftyCrib',
      layout: 'layouts/auth',
      error_msg: 'Une erreur est survenue. Veuillez réessayer.',
      formData: body
    });
  }
});

// GET /pro/pending — awaiting approval page
router.get('/pending', ensureAuthenticated, function(req, res) {
  res.render('pages/pro/pending', {
    title: 'Demande en cours — CraftyCrib',
    layout: 'layouts/auth'
  });
});

// ─── ADMIN APPLICATION MANAGEMENT ───────────────────────────────────────────

// GET /pro/admin/applications — list all applications
router.get('/admin/applications', ensureAdmin, async function(req, res) {
  try {
    var statusFilter = req.query.status || 'all';
    var query = {};
    if (statusFilter !== 'all') {
      query.status = statusFilter;
    }
    var applications = await ProApplication.find(query).sort({ createdAt: -1 });
    res.render('pages/admin/pro-requests', {
      title: 'Demandes professionnelles — Admin',
      layout: 'layouts/main',
      applications: applications,
      statusFilter: statusFilter
    });
  } catch (err) {
    console.error('Pro admin list error:', err);
    req.flash('error_msg', 'Erreur lors du chargement des demandes.');
    res.redirect('/dashboard');
  }
});

// GET /pro/admin/applications/:id/approve/:token — approve via email link
router.get('/admin/applications/:id/approve/:token', ensureAdmin, async function(req, res) {
  try {
    var app = await ProApplication.findOne({ _id: req.params.id, approvalToken: req.params.token });
    if (!app) {
      req.flash('error_msg', 'Demande introuvable ou lien invalide.');
      return res.redirect('/pro/admin/applications');
    }
    app.status = 'approved';
    await app.save();
    if (app.user) {
      await User.findByIdAndUpdate(app.user, { proStatus: 'approved' });
    }
    req.flash('success_msg', 'Demande approuvée avec succès.');
    res.redirect('/pro/admin/applications');
  } catch (err) {
    console.error('Approve error:', err);
    req.flash('error_msg', 'Erreur lors de l\'approbation.');
    res.redirect('/pro/admin/applications');
  }
});

// POST /pro/admin/applications/:id/approve/:token — approve via form
router.post('/admin/applications/:id/approve/:token', ensureAdmin, async function(req, res) {
  try {
    var app = await ProApplication.findOne({ _id: req.params.id, approvalToken: req.params.token });
    if (!app) {
      req.flash('error_msg', 'Demande introuvable ou lien invalide.');
      return res.redirect('/pro/admin/applications');
    }
    app.status = 'approved';
    await app.save();
    if (app.user) {
      await User.findByIdAndUpdate(app.user, { proStatus: 'approved' });
    }
    req.flash('success_msg', 'Demande approuvée avec succès.');
    res.redirect('/pro/admin/applications');
  } catch (err) {
    console.error('Approve error:', err);
    req.flash('error_msg', 'Erreur lors de l\'approbation.');
    res.redirect('/pro/admin/applications');
  }
});

// GET /pro/admin/applications/:id/reject/:token — reject via email link
router.get('/admin/applications/:id/reject/:token', ensureAdmin, async function(req, res) {
  try {
    var app = await ProApplication.findOne({ _id: req.params.id, approvalToken: req.params.token });
    if (!app) {
      req.flash('error_msg', 'Demande introuvable ou lien invalide.');
      return res.redirect('/pro/admin/applications');
    }
    app.status = 'rejected';
    await app.save();
    if (app.user) {
      await User.findByIdAndUpdate(app.user, { proStatus: 'rejected' });
    }
    req.flash('success_msg', 'Demande rejetée.');
    res.redirect('/pro/admin/applications');
  } catch (err) {
    console.error('Reject error:', err);
    req.flash('error_msg', 'Erreur lors du rejet.');
    res.redirect('/pro/admin/applications');
  }
});

// POST /pro/admin/applications/:id/reject/:token — reject via form
router.post('/admin/applications/:id/reject/:token', ensureAdmin, async function(req, res) {
  try {
    var app = await ProApplication.findOne({ _id: req.params.id, approvalToken: req.params.token });
    if (!app) {
      req.flash('error_msg', 'Demande introuvable ou lien invalide.');
      return res.redirect('/pro/admin/applications');
    }
    app.status = 'rejected';
    await app.save();
    if (app.user) {
      await User.findByIdAndUpdate(app.user, { proStatus: 'rejected' });
    }
    req.flash('success_msg', 'Demande rejetée.');
    res.redirect('/pro/admin/applications');
  } catch (err) {
    console.error('Reject error:', err);
    req.flash('error_msg', 'Erreur lors du rejet.');
    res.redirect('/pro/admin/applications');
  }
});

// ─── PRO DASHBOARD (approved professionals only) ─────────────────────────────

router.get('/dashboard', ensureProfessional, async function(req, res) {
  try {
    var proNotes = await Note.find({ user: req.user.id, source: 'pro' }).sort({ pinned: -1, updatedAt: -1 });
    var quoteRequests = await QuoteRequest.find({}).sort({ createdAt: -1 });
    res.render('pages/pro/dashboard', {
      title: 'Pro Dashboard — CraftyCrib',
      layout: 'layouts/pro-dashboard',
      activePage: 'dashboard',
      proNotes: proNotes,
      quoteRequests: quoteRequests
    });
  } catch (err) {
    console.error('Pro dashboard error:', err);
    res.render('pages/pro/dashboard', {
      title: 'Pro Dashboard — CraftyCrib',
      layout: 'layouts/pro-dashboard',
      activePage: 'dashboard',
      proNotes: [],
      quoteRequests: []
    });
  }
});

// ─── EXISTING PRO API ROUTES ─────────────────────────────────────────────────

router.put('/leads/:id/lead-status', ensureAuthenticated, async function(req, res) {
  try {
    var proLeadStatus = req.body.proLeadStatus;
    var allowed = ['new_lead', 'contacted', 'won', 'lost', 'archived'];
    if (!allowed.includes(proLeadStatus)) return res.status(400).json({ error: 'Statut invalide' });
    var quote = await QuoteRequest.findByIdAndUpdate(
      req.params.id,
      { proLeadStatus: proLeadStatus },
      { new: true }
    );
    if (!quote) return res.status(404).json({ error: 'Lead introuvable' });
    res.json({ success: true, proLeadStatus: quote.proLeadStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/quotes/:id/status', ensureAuthenticated, async function(req, res) {
  try {
    var status = req.body.status;
    var allowed = ['new', 'contacted', 'accepted', 'refused', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
    var quote = await QuoteRequest.findByIdAndUpdate(
      req.params.id,
      { status: status, statusUpdatedAt: new Date() },
      { new: true }
    );
    if (!quote) return res.status(404).json({ error: 'Demande introuvable' });
    res.json({ success: true, status: quote.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notes', ensureAuthenticated, async function(req, res) {
  try {
    var note = new Note({
      user:    req.user.id,
      source:  'pro',
      title:   req.body.title   || '',
      content: req.body.content || '',
      tags:    req.body.tags    || [],
      pinned:  false
    });
    await note.save();
    res.json({ success: true, note: note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/notes/:id', ensureAuthenticated, async function(req, res) {
  try {
    var note = await Note.findOne({ _id: req.params.id, user: req.user.id, source: 'pro' });
    if (!note) return res.status(404).json({ error: 'Note introuvable' });
    if (req.body.title   !== undefined) note.title   = req.body.title;
    if (req.body.content !== undefined) note.content = req.body.content;
    if (req.body.tags    !== undefined) note.tags    = req.body.tags;
    if (req.body.pinned  !== undefined) note.pinned  = req.body.pinned;
    await note.save();
    res.json({ success: true, note: note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/notes/:id', ensureAuthenticated, async function(req, res) {
  try {
    await Note.deleteOne({ _id: req.params.id, user: req.user.id, source: 'pro' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
