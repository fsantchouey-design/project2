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
const UnlockedLead = require('../models/UnlockedLead');
const Contractor = require('../models/Contractor');
const CalendarEvent = require('../models/CalendarEvent');
const { sendRawEmail, transporter } = require('../utils/email');
const { sendEmail: sendResendEmail, sendAdminEmail } = require('../services/email');

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
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Seules les images et les PDF sont acceptés.'), false);
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

// GET /pro/signup — registration form (admin bypasses this)
router.get('/signup', function(req, res) {
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return res.redirect('/pro/dashboard');
  }
  res.render('pages/pro/signup', {
    title: 'Créer un compte professionnel — CraftyCrib',
    layout: 'layouts/auth',
    formData: {}
  });
});

// POST /pro/signup — handle registration
router.post('/signup', upload.fields([
  { name: 'attestationRevenuQuebec', maxCount: 1 },
  { name: 'rcInsuranceCert', maxCount: 1 },
  { name: 'cnesstAttestation', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
  { name: 'photos', maxCount: 10 }
]), async function(req, res) {
  var body = req.body;
  var required = ['firstName', 'lastName', 'jobTitle', 'email', 'phone',
    'companyName', 'address', 'city', 'postalCode', 'country',
    'rbqLicenseNumber', 'rbqCategories', 'tpsNumber', 'tvqNumber',
    'liabilityInsurance', 'coverageAmount', 'cnesstFileNumber',
    'serviceAreas', 'yearsExperience', 'password'];

  var missingFields = [];
  required.forEach(function(field) {
    if (!body[field] || body[field].toString().trim() === '') {
      missingFields.push(field);
    }
  });

  // serviceTypes check
  if (!body.serviceTypes || (Array.isArray(body.serviceTypes) && body.serviceTypes.length === 0)) {
    missingFields.push('serviceTypes');
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
    function getFilePath(fieldName) {
      if (req.files && req.files[fieldName] && req.files[fieldName][0]) {
        return '/uploads/pro-applications/' + req.files[fieldName][0].filename;
      }
      return '';
    }
    var logoPath = getFilePath('logo');
    var photoPaths = [];
    if (req.files && req.files['photos']) {
      req.files['photos'].forEach(function(f) {
        photoPaths.push('/uploads/pro-applications/' + f.filename);
      });
    }

    // Generate approval token
    var approvalToken = crypto.randomBytes(32).toString('hex');

    // Create ProApplication
    var serviceTypes = body.serviceTypes
      ? (Array.isArray(body.serviceTypes) ? body.serviceTypes : [body.serviceTypes])
      : [];

    var app = new ProApplication({
      user: user._id,
      // Step 1
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      jobTitle: body.jobTitle.trim(),
      email: body.email.toLowerCase().trim(),
      phone: body.phone.trim(),
      // Step 2
      companyName: body.companyName.trim(),
      nEQ: (body.nEQ || '').trim(),
      address: body.address.trim(),
      city: body.city.trim(),
      postalCode: body.postalCode.trim(),
      country: body.country.trim(),
      website: (body.website || '').trim(),
      // Step 3
      rbqLicenseNumber: body.rbqLicenseNumber.trim(),
      rbqCategories: body.rbqCategories.trim(),
      tpsNumber: body.tpsNumber.trim(),
      tvqNumber: body.tvqNumber.trim(),
      attestationRevenuQuebec: getFilePath('attestationRevenuQuebec'),
      // Step 4
      liabilityInsurance: body.liabilityInsurance.trim(),
      coverageAmount: body.coverageAmount.trim(),
      rcInsuranceCert: getFilePath('rcInsuranceCert'),
      cnesstFileNumber: body.cnesstFileNumber.trim(),
      cnesstAttestation: getFilePath('cnesstAttestation'),
      // Step 5
      serviceTypes: serviceTypes,
      serviceAreas: body.serviceAreas.trim(),
      yearsExperience: body.yearsExperience.trim(),
      // Legacy
      logo: logoPath,
      photos: photoPaths,
      approvalToken: approvalToken,
      status: 'pending'
    });
    await app.save();

    // Send admin notification email
    var appUrl = process.env.APP_URL || 'http://localhost:3000';
    var subject = '[CraftyCrib] Nouvelle demande pro — ' + (app.companyName || (app.firstName + ' ' + app.lastName));
    var svcHtml = serviceTypes.length
      ? serviceTypes.map(function(s) { return '<span style="display:inline-block;background:rgba(0,255,136,0.15);color:#00ff88;border:1px solid rgba(0,255,136,0.3);border-radius:20px;padding:3px 10px;font-size:12px;margin:2px 3px;">' + s + '</span>'; }).join('')
      : '—';
    var html = '<!DOCTYPE html><html><head><style>' +
      'body{font-family:"Segoe UI",Arial,sans-serif;background:#0a0a0f;color:#ffffff;margin:0;padding:0;}' +
      '.container{max-width:640px;margin:0 auto;padding:40px 20px;}' +
      '.logo{font-size:28px;font-weight:bold;color:#00ff88;margin-bottom:24px;display:block;text-align:center;}' +
      '.card{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:36px;}' +
      'h1{color:#ffffff;font-size:22px;margin:0 0 24px;}' +
      '.st{color:#00ff88;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:24px 0 10px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px;}' +
      '.f{display:flex;gap:12px;margin-bottom:10px;}' +
      '.fl{color:#888;font-size:13px;min-width:160px;flex-shrink:0;}' +
      '.fv{color:#e0e0e0;font-size:13px;word-break:break-all;}' +
      '.action-row{text-align:center;margin-top:32px;}' +
      '.btn-a{display:inline-block;background:#00ff88;color:#000;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:bold;font-size:14px;margin:0 8px;}' +
      '.btn-r{display:inline-block;background:#ff4444;color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:bold;font-size:14px;margin:0 8px;}' +
      '.footer{text-align:center;color:#555;font-size:12px;margin-top:32px;}' +
      '</style></head><body>' +
      '<div class="container"><span class="logo">CraftyCrib Admin</span><div class="card">' +
      '<h1>Nouvelle demande professionnelle</h1>' +
      '<div class="st">Representant</div>' +
      '<div class="f"><span class="fl">Prenom</span><span class="fv">' + (app.firstName || '—') + '</span></div>' +
      '<div class="f"><span class="fl">Nom</span><span class="fv">' + (app.lastName || '—') + '</span></div>' +
      '<div class="f"><span class="fl">Titre</span><span class="fv">' + (app.jobTitle || '—') + '</span></div>' +
      '<div class="f"><span class="fl">Email</span><span class="fv">' + (app.email || '—') + '</span></div>' +
      '<div class="f"><span class="fl">Telephone</span><span class="fv">' + (app.phone || '—') + '</span></div>' +
      '<div class="st">Entreprise</div>' +
      '<div class="f"><span class="fl">Nom</span><span class="fv">' + (app.companyName || '—') + '</span></div>' +
      '<div class="f"><span class="fl">NEQ</span><span class="fv">' + (app.nEQ || '—') + '</span></div>' +
      '<div class="f"><span class="fl">Adresse</span><span class="fv">' + (app.address || '—') + ', ' + (app.city || '') + ' ' + (app.postalCode || '') + '</span></div>' +
      '<div class="f"><span class="fl">Site web</span><span class="fv">' + (app.website || '—') + '</span></div>' +
      '<div class="st">Licences et fiscal</div>' +
      '<div class="f"><span class="fl">Licence RBQ</span><span class="fv">' + (app.rbqLicenseNumber || '—') + '</span></div>' +
      '<div class="f"><span class="fl">Categories RBQ</span><span class="fv">' + (app.rbqCategories || '—') + '</span></div>' +
      '<div class="f"><span class="fl">TPS</span><span class="fv">' + (app.tpsNumber || '—') + '</span></div>' +
      '<div class="f"><span class="fl">TVQ</span><span class="fv">' + (app.tvqNumber || '—') + '</span></div>' +
      '<div class="f"><span class="fl">Attestation RQ</span><span class="fv">' + (app.attestationRevenuQuebec ? 'Oui (fichier joint)' : 'Non') + '</span></div>' +
      '<div class="st">Assurances et CNESST</div>' +
      '<div class="f"><span class="fl">Assureur / Police</span><span class="fv">' + (app.liabilityInsurance || '—') + '</span></div>' +
      '<div class="f"><span class="fl">Couverture</span><span class="fv">' + (app.coverageAmount || '—') + '</span></div>' +
      '<div class="f"><span class="fl">Cert. RC</span><span class="fv">' + (app.rcInsuranceCert ? 'Oui (fichier joint)' : 'Non') + '</span></div>' +
      '<div class="f"><span class="fl">Dossier CNESST</span><span class="fv">' + (app.cnesstFileNumber || '—') + '</span></div>' +
      '<div class="f"><span class="fl">Attestation CNESST</span><span class="fv">' + (app.cnesstAttestation ? 'Oui (fichier joint)' : 'Non') + '</span></div>' +
      '<div class="st">Profil</div>' +
      '<div class="f"><span class="fl">Services</span><span class="fv">' + svcHtml + '</span></div>' +
      '<div class="f"><span class="fl">Zones</span><span class="fv">' + (app.serviceAreas || '—') + '</span></div>' +
      '<div class="f"><span class="fl">Experience</span><span class="fv">' + (app.yearsExperience || '—') + '</span></div>' +
      '<div class="action-row">' +
      '<a href="' + appUrl + '/pro/admin/applications/' + app._id + '/approve/' + app.approvalToken + '" class="btn-a">Approuver</a>' +
      '<a href="' + appUrl + '/pro/admin/applications/' + app._id + '/reject/' + app.approvalToken + '" class="btn-r">Rejeter</a>' +
      '</div></div>' +
      '<div class="footer"><p>CraftyCrib &copy; ' + new Date().getFullYear() + '</p></div>' +
      '</div></body></html>';

    await sendRawEmail('craftycrib.ca@gmail.com', subject, html);

    // Admin notification via Resend (non-blocking)
    try {
      await sendAdminEmail({
        subject: `[CraftyCrib] Nouvelle demande pro — ${app.companyName || (app.firstName + ' ' + app.lastName)}`,
        title: 'Nouvelle inscription professionnelle',
        rows: [
          ['Nom', `${app.firstName} ${app.lastName}`],
          ['Entreprise', app.companyName],
          ['Email', app.email],
          ['Téléphone', app.phone],
          ['Ville', app.city],
          ['Date', new Date().toLocaleString('fr-CA')]
        ]
      });
    } catch (e) { console.error('[Admin] Pro signup email failed:', e.message); }

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
  var emptyAnalytics = {
    leadsThisMonth: 0, leadsLastMonth: 0, leadsThisYear: 0,
    monthlyTrend: 0, conversionRate: 0,
    topZones: [], maxZoneCount: 1,
    topCategories: [], maxCatCount: 1,
    monthlyLeads: [], hasCertifiedBadge: false
  };
  try {
    var proNotes = await Note.find({ user: req.user.id, source: 'pro' }).sort({ pinned: -1, updatedAt: -1 });
    var allLeads = await QuoteRequest.find({}).sort({ createdAt: -1 });

    // ── Analytics ──
    var now = new Date();
    var startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    var startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var startOfYear = new Date(now.getFullYear(), 0, 1);

    var leadsThisMonth = allLeads.filter(function(q) { return q.createdAt >= startOfMonth; }).length;
    var leadsLastMonth = allLeads.filter(function(q) { return q.createdAt >= startOfLastMonth && q.createdAt < startOfMonth; }).length;
    var leadsThisYear = allLeads.filter(function(q) { return q.createdAt >= startOfYear; }).length;
    var monthlyTrend = leadsLastMonth > 0 ? Math.round((leadsThisMonth - leadsLastMonth) / leadsLastMonth * 100) : 0;

    var wonLeads = allLeads.filter(function(q) { return q.proLeadStatus === 'won'; }).length;
    var conversionRate = allLeads.length > 0 ? Math.round(wonLeads / allLeads.length * 100) : 0;

    // Top zones (all time)
    var zoneCounts = {};
    allLeads.forEach(function(q) {
      if (q.city) { zoneCounts[q.city] = (zoneCounts[q.city] || 0) + 1; }
    });
    var topZones = Object.keys(zoneCounts).map(function(k) { return { name: k, count: zoneCounts[k] }; });
    topZones.sort(function(a, b) { return b.count - a.count; });
    topZones = topZones.slice(0, 5);
    var maxZoneCount = topZones.length > 0 ? topZones[0].count : 1;

    // Top categories this month
    var catCounts = {};
    allLeads.filter(function(q) { return q.createdAt >= startOfMonth; }).forEach(function(q) {
      var cat = q.specialty || q.service || 'Autre';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    var topCategories = Object.keys(catCounts).map(function(k) { return { name: k, count: catCounts[k] }; });
    topCategories.sort(function(a, b) { return b.count - a.count; });
    topCategories = topCategories.slice(0, 6);
    var maxCatCount = topCategories.length > 0 ? topCategories[0].count : 1;

    // Monthly leads — last 6 months
    var monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    var monthlyLeads = [];
    for (var i = 5; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var dNext = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      var cnt = allLeads.filter(function(q) { return q.createdAt >= d && q.createdAt < dNext; }).length;
      monthlyLeads.push({ label: monthNames[d.getMonth()], count: cnt });
    }

    var hasCertifiedBadge = req.user.role === 'admin' || (req.user.subscription && req.user.subscription.type === 'advanced');

    var hasMonthlySubscription = ['pro', 'premium', 'elite'].includes(
      req.user.proSubscription && req.user.proSubscription.plan
    );

    // Leads for "Demandes" section: only unclaimed leads (available to all pros)
    var availableLeads = allLeads.filter(function(q) { return !q.claimedByProUserId; });

    // Leads for "Leads" section: claimed exclusively by this pro
    var myLeads = allLeads.filter(function(q) {
      return q.claimedByProUserId && q.claimedByProUserId.toString() === req.user.id.toString();
    });

    var proContractor = await Contractor.findOne({ user: req.user._id })
      .populate('reviews.user', 'firstName lastName')
      .lean();

    res.render('pages/pro/dashboard', {
      title: 'Pro Dashboard — CraftyCrib',
      layout: 'layouts/pro-dashboard',
      activePage: 'dashboard',
      proNotes: proNotes,
      availableLeads: availableLeads,
      myLeads: myLeads,
      hasMonthlySubscription: hasMonthlySubscription,
      proContractor: proContractor || null,
      analytics: {
        leadsThisMonth: leadsThisMonth,
        leadsLastMonth: leadsLastMonth,
        leadsThisYear: leadsThisYear,
        monthlyTrend: monthlyTrend,
        conversionRate: conversionRate,
        topZones: topZones,
        maxZoneCount: maxZoneCount,
        topCategories: topCategories,
        maxCatCount: maxCatCount,
        monthlyLeads: monthlyLeads,
        hasCertifiedBadge: hasCertifiedBadge
      }
    });
  } catch (err) {
    console.error('Pro dashboard error:', err);
    res.render('pages/pro/dashboard', {
      title: 'Pro Dashboard — CraftyCrib',
      layout: 'layouts/pro-dashboard',
      activePage: 'dashboard',
      proNotes: [],
      availableLeads: [],
      myLeads: [],
      hasMonthlySubscription: false,
      analytics: emptyAnalytics
    });
  }
});

// ─── EXISTING PRO API ROUTES ─────────────────────────────────────────────────

router.put('/leads/:id/lead-status', ensureAuthenticated, async function(req, res) {
  try {
    var proLeadStatus = req.body.proLeadStatus;
    var allowed = ['new_lead', 'done', 'archived'];
    if (!allowed.includes(proLeadStatus)) return res.status(400).json({ error: 'Statut invalide' });
    var quote = await QuoteRequest.findByIdAndUpdate(
      req.params.id,
      { proLeadStatus: proLeadStatus },
      { new: true }
    );
    if (!quote) return res.status(404).json({ error: 'Lead introuvable' });

    // When marked done, invite the client to leave a review
    if (proLeadStatus === 'done' && quote.email) {
      try {
        var contractor = await Contractor.findOne({ user: req.user._id }).select('companyName slug').lean();
        if (contractor && contractor.slug) {
          var reviewUrl = (process.env.APP_URL || 'https://craftycrib.ca') + '/dashboard/notifications';
          await sendResendEmail({
            to: quote.email,
            subject: 'Votre avis compte — CraftyCrib',
            html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:sans-serif;">
<div style="max-width:520px;margin:40px auto;background:#1e293b;border-radius:12px;padding:36px 32px;color:#e2e8f0;">
<h2 style="margin:0 0 8px;font-size:1.2rem;color:#f8fafc;">Votre projet est terminé !</h2>
<p style="color:#94a3b8;font-size:0.9rem;margin:0 0 20px;">Bonjour ${quote.firstName},</p>
<p style="color:#cbd5e1;font-size:0.9rem;margin:0 0 24px;">
  <strong style="color:#f8fafc;">${contractor.companyName}</strong> a marqué votre demande comme terminée.
  Prenez un moment pour laisser un avis — cela aide d'autres clients à choisir les meilleurs professionnels.
</p>
<a href="${reviewUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:0.9rem;font-weight:600;">Laisser un avis</a>
<p style="color:#475569;font-size:0.78rem;margin:28px 0 0;">CraftyCrib — Connectez-vous avec les meilleurs professionnels</p>
</div></body></html>`
          }).catch(function(e){ console.error('[Lead done] Review email failed:', e.message); });
          // Create in-app notification for the client (if they have an account)
          try {
            var User = require('../models/User');
            var Notification = require('../models/Notification');
            var clientUser = await User.findOne({ email: quote.email }).select('_id').lean();
            if (clientUser) {
              await Notification.updateOne(
                { userId: clientUser._id, quoteRequestId: quote._id },
                { $setOnInsert: {
                    userId: clientUser._id, quoteRequestId: quote._id,
                    type: 'review_request',
                    message: 'Laissez un avis sur votre expérience.',
                    contractorId: contractor._id,
                    contractorName: contractor.companyName,
                    contractorSlug: contractor.slug,
                    status: 'pending'
                  }
                },
                { upsert: true }
              );
            }
          } catch (e) { console.error('[Lead done] Notification create failed:', e.message); }
        }
      } catch (e) { console.error('[Lead done] Review handling failed:', e.message); }
    }

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

    // Accept/refuse reserved for monthly subscribers only
    if (status === 'accepted' || status === 'refused') {
      var plan = req.user.proSubscription && req.user.proSubscription.plan;
      if (!['pro', 'premium', 'elite'].includes(plan)) {
        return res.status(403).json({ error: 'Un abonnement mensuel est requis pour accepter ou refuser un lead.' });
      }
    }

    var updateFields = { status: status, statusUpdatedAt: new Date() };

    // Accepting claims the lead exclusively for this pro
    if (status === 'accepted') {
      var lead = await QuoteRequest.findById(req.params.id).select('claimedByProUserId').lean();
      if (!lead) return res.status(404).json({ error: 'Demande introuvable' });
      if (lead.claimedByProUserId && lead.claimedByProUserId.toString() !== req.user.id.toString()) {
        return res.status(409).json({ error: 'Ce lead a déjà été attribué à un autre professionnel.' });
      }
      updateFields.claimedByProUserId = req.user.id;
    }

    var quote = await QuoteRequest.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );
    if (!quote) return res.status(404).json({ error: 'Demande introuvable' });

    if (status === 'accepted' && quote.email) {
      try {
        await sendResendEmail({
          to: quote.email,
          subject: 'Un professionnel a accepté votre demande — CraftyCrib',
          html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;background:#0a0a0f;color:#fff;margin:0;padding:0}
    .c{max-width:600px;margin:0 auto;padding:40px 20px}
    .logo{font-size:26px;font-weight:bold;background:linear-gradient(135deg,#00ff88,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-align:center;display:block;margin-bottom:28px}
    .card{background:linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:36px}
    h1{color:#fff;font-size:20px;margin:0 0 14px}
    p{color:#a0a0a0;line-height:1.6;margin:0 0 12px}
    .btn{display:inline-block;background:linear-gradient(135deg,#00ff88,#00d4ff);color:#000;text-decoration:none;padding:13px 34px;border-radius:50px;font-weight:bold;font-size:14px}
    .footer{text-align:center;color:#555;font-size:12px;margin-top:28px}
  </style>
</head>
<body>
  <div class="c">
    <span class="logo">CraftyCrib</span>
    <div class="card">
      <h1>Votre demande a été acceptée</h1>
      <p>Bonjour ${quote.firstName},</p>
      <p>Un professionnel CraftyCrib a accepté votre demande. Il va vous contacter prochainement pour convenir des prochaines étapes.</p>
      <p>Vous pouvez dès maintenant consulter votre tableau de bord pour suivre l'avancement de votre projet.</p>
      <center style="margin-top:22px">
        <a href="${process.env.APP_URL || 'https://craftycrib.ca'}/dashboard" class="btn">Voir mon tableau de bord</a>
      </center>
    </div>
    <div class="footer"><p>© ${new Date().getFullYear()} CraftyCrib. Tous droits réservés.</p></div>
  </div>
</body>
</html>`
        });
      } catch (emailErr) {
        console.error('[Pro] Acceptance email failed:', emailErr.message);
      }

      // Admin notification — pro accepted a lead (non-blocking)
      try {
        await sendAdminEmail({
          subject: `[CraftyCrib] Lead accepté — ${quote.firstName} ${quote.lastName}`,
          title: 'Un professionnel a accepté un lead',
          rows: [
            ['Client', `${quote.firstName} ${quote.lastName}`],
            ['Email client', quote.email],
            ['Service', quote.service || quote.specialty],
            ['Ville', quote.city],
            ['Pro (ID)', req.user.id.toString()],
            ['Date', new Date().toLocaleString('fr-CA')]
          ]
        });
      } catch (e) { console.error('[Admin] Lead acceptance email failed:', e.message); }
    }

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

// ─── PRO PLAN STRIPE CHECKOUT ────────────────────────────────────────────────

const PRO_PLAN_CONFIG = {
  lead:    { mode: 'payment',      envKey: 'STRIPE_PRICE_PRO_LEAD' },
  pro:     { mode: 'subscription', envKey: 'STRIPE_PRICE_PRO_MONTHLY' },
  premium: { mode: 'subscription', envKey: 'STRIPE_PRICE_PRO_PREMIUM_MONTHLY' },
  elite:   { mode: 'subscription', envKey: 'STRIPE_PRICE_PRO_ELITE_MONTHLY' }
};

router.post('/checkout-session', ensureProfessional, async function(req, res) {
  var stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(500).json({ error: 'Stripe non configuré. Ajoutez STRIPE_SECRET_KEY dans les variables d\'environnement.' });
  }

  var proType = req.body.proType;
  var leadId  = req.body.leadId ? String(req.body.leadId) : '';
  var config = PRO_PLAN_CONFIG[proType];
  if (!config) {
    return res.status(400).json({ error: 'Type de plan invalide : ' + proType });
  }

  if (proType === 'lead' && !leadId) {
    return res.status(400).json({ error: 'leadId requis pour l\'achat d\'un lead.' });
  }

  if (proType === 'lead') {
    const lead = await QuoteRequest.findById(leadId).select('claimedByProUserId').lean();
    if (!lead) {
      return res.status(404).json({ error: 'Lead introuvable.' });
    }
    if (lead.claimedByProUserId && lead.claimedByProUserId.toString() !== req.user.id.toString()) {
      return res.status(409).json({ error: 'Ce lead a déjà été attribué à un autre professionnel.' });
    }
  }

  var priceId = process.env[config.envKey];
  if (!priceId) {
    console.error('[ProStripe] ❌ Env var ' + config.envKey + ' is not set');
    return res.status(400).json({
      error: 'Ce plan n\'est pas encore configuré. Ajoutez ' + config.envKey + ' dans les variables d\'environnement Render.'
    });
  }

  var appUrl = (process.env.APP_URL || 'https://craftycrib.com').replace(/\/$/, '');
  var stripe = require('stripe')(stripeKey);

  try {
    var session = await stripe.checkout.sessions.create({
      mode: config.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: req.user.email || undefined,
      client_reference_id: String(req.user.id),
      success_url: appUrl + '/pro/dashboard?unlocked=' + (leadId || '') + '#sec-leads',
      cancel_url:  appUrl + '/pro/dashboard#sec-' + (proType === 'lead' ? 'leads' : 'billing'),
      metadata: {
        userId:  String(req.user.id),
        proType: proType,
        leadId:  leadId
      },
      allow_promotion_codes: true
    });

    console.log('[ProStripe] ✅ Session ' + session.id + ' created (' + proType + (leadId ? ', lead=' + leadId : '') + ')');
    res.json({ url: session.url });
  } catch (err) {
    console.error('[ProStripe] ❌ Checkout error:', err.message);
    res.status(500).json({ error: err.message || 'Erreur lors de la création de la session de paiement.' });
  }
});

// ─── ANALYTICS API ────────────────────────────────────────────────────────────

router.get('/analytics', ensureProfessional, async function(req, res) {
  try {
    var period = req.query.period || 'month';
    var now = new Date();
    var start;
    if (period === 'week') {
      var dow = now.getDay();
      var diff = dow === 0 ? -6 : 1 - dow;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    var proId = req.user._id;

    var myLeads = await QuoteRequest.find({
      claimedByProUserId: proId,
      createdAt: { $gte: start, $lte: now }
    }).lean();

    var leadsReceived = myLeads.length;
    var leadsDone = myLeads.filter(function(l) { return l.proLeadStatus === 'done'; }).length;

    var contractor = await Contractor.findOne({ user: proId }).select('reviews').lean();
    var reviewsCount = 0;
    if (contractor && contractor.reviews) {
      reviewsCount = contractor.reviews.filter(function(r) {
        return new Date(r.createdAt) >= start && new Date(r.createdAt) <= now;
      }).length;
    }

    res.json({ success: true, period: period, leadsReceived: leadsReceived, leadsDone: leadsDone, reviewsCount: reviewsCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PRO NOTIFICATIONS ───────────────────────────────────────────────────────

router.get('/notifications', ensureAuthenticated, ensureProfessional, async function(req, res) {
  try {
    var contractor = await Contractor.findOne({ user: req.user._id });
    var lastLeadSeen   = contractor && contractor.lastLeadSeen   ? contractor.lastLeadSeen   : new Date(0);
    var lastReviewSeen = contractor && contractor.lastReviewSeen ? contractor.lastReviewSeen : new Date(0);

    var newLeadCount = await QuoteRequest.countDocuments({
      visibility: 'contractors',
      claimedByProUserId: null,
      createdAt: { $gt: lastLeadSeen }
    });

    var newReviewCount = contractor
      ? contractor.reviews.filter(function(r) { return new Date(r.createdAt) > lastReviewSeen; }).length
      : 0;

    var items = [];
    if (newLeadCount > 0) {
      items.push({
        type: 'leads',
        count: newLeadCount,
        label: newLeadCount === 1 ? '1 nouvelle demande client' : newLeadCount + ' nouvelles demandes clients',
        section: 'leads'
      });
    }
    if (newReviewCount > 0) {
      items.push({
        type: 'reviews',
        count: newReviewCount,
        label: newReviewCount === 1 ? '1 nouvel avis client' : newReviewCount + ' nouveaux avis clients',
        section: 'reviews'
      });
    }

    res.json({ success: true, items: items, totalUnread: newLeadCount + newReviewCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/read', ensureAuthenticated, ensureProfessional, async function(req, res) {
  try {
    var type = req.body.type;
    var update = {};
    var now = new Date();
    if (type === 'leads'   || type === 'all') update.lastLeadSeen   = now;
    if (type === 'reviews' || type === 'all') update.lastReviewSeen = now;
    await Contractor.updateOne({ user: req.user._id }, { $set: update });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CALENDAR EVENTS ──────────────────────────────────────────────────────────

router.get('/calendar/events', ensureAuthenticated, async function(req, res) {
  try {
    var query = { proUserId: req.user._id };
    if (req.query.start || req.query.end) {
      query.date = {};
      if (req.query.start) query.date.$gte = new Date(req.query.start);
      if (req.query.end)   query.date.$lte = new Date(req.query.end);
    }
    var events = await CalendarEvent.find(query).sort({ date: 1, startTime: 1 });
    res.json({ success: true, events: events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/calendar/events', ensureAuthenticated, async function(req, res) {
  try {
    var { title, description, date, startTime, endTime, color } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'Titre et date requis' });
    var event = await CalendarEvent.create({
      proUserId:   req.user._id,
      title:       title,
      description: description || '',
      date:        new Date(date),
      startTime:   startTime || '',
      endTime:     endTime   || '',
      color:       color     || 'green'
    });
    res.json({ success: true, event: event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/calendar/events/:id', ensureAuthenticated, async function(req, res) {
  try {
    var { title, description, date, startTime, endTime, color } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'Titre et date requis' });
    var event = await CalendarEvent.findOneAndUpdate(
      { _id: req.params.id, proUserId: req.user._id },
      { title: title, description: description || '', date: new Date(date),
        startTime: startTime || '', endTime: endTime || '', color: color || 'green' },
      { new: true }
    );
    if (!event) return res.status(404).json({ error: 'Événement introuvable' });
    res.json({ success: true, event: event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/calendar/events/:id', ensureAuthenticated, async function(req, res) {
  try {
    var event = await CalendarEvent.findOneAndDelete({ _id: req.params.id, proUserId: req.user._id });
    if (!event) return res.status(404).json({ error: 'Événement introuvable' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
