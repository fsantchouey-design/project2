const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { ensureAuthenticated, ensureContractor } = require('../middleware/auth');
const Contractor = require('../models/Contractor');
const Project = require('../models/Project');
const slugify = require('slugify');

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/contractors');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type'));
  }
});

const ServiceCategory = require('../models/ServiceCategory');

// Default seed data — written to DB on first run
const DEFAULT_SERVICE_CATEGORIES = [
  { order: 1,  specialty: 'painting',   label: 'Peinture et décoration',     icon: 'paintbrush',   subcategories: ['Peinture intérieure', 'Peinture extérieure', 'Papier peint', 'Enduit décoratif', 'Ravalement de façade'] },
  { order: 2,  specialty: 'kitchen',    label: 'Rénovation cuisine',          icon: 'utensils',     subcategories: ['Armoires', 'Comptoirs', 'Îlot de cuisine', 'Électroménager encastré', 'Carrelage cuisine'] },
  { order: 3,  specialty: 'bathroom',   label: 'Rénovation salle de bain',    icon: 'bath',         subcategories: ['Douche italienne', 'Baignoire', 'Vanité', 'Carrelage salle de bain', 'Robinetterie'] },
  { order: 4,  specialty: 'flooring',   label: 'Planchers et revêtements',    icon: 'layers',       subcategories: ['Bois franc', 'Céramique', 'Vinyle', 'Moquette', 'Parquet flottant'] },
  { order: 5,  specialty: 'electrical', label: 'Éclairage',                   icon: 'lightbulb',    subcategories: ['Plafonniers', 'Spots encastrés', 'Éclairage extérieur', 'Appliques murales', 'Lustres et suspensions'] },
  { order: 6,  specialty: 'general',    label: 'Mobilier et aménagement',     icon: 'sofa',         subcategories: ['Aménagement salon', 'Aménagement chambre', 'Bureau à domicile', 'Dressing sur mesure', 'Rangement'] },
  { order: 7,  specialty: 'outdoor',    label: 'Jardinage et extérieur',      icon: 'trees',        subcategories: ['Terrasse et patio', 'Clôture et portail', 'Gazon et paysagement', 'Piscine et spa', 'Pergola et abri'] },
  { order: 8,  specialty: 'plumbing',   label: 'Plomberie',                   icon: 'wrench',       subcategories: ['Robinetterie', 'Tuyaux et raccords', 'Chauffe-eau', 'WC et sanitaires', 'Évacuations'] },
  { order: 9,  specialty: 'electrical', label: 'Électricité',                 icon: 'zap',          subcategories: ['Prises et interrupteurs', 'Tableau électrique', 'Domotique', 'Câblage', 'Mise aux normes'] },
  { order: 10, specialty: 'general',    label: 'Nettoyage',                   icon: 'sparkles',     subcategories: ['Ménage régulier', 'Nettoyage de vitres', 'Nettoyage de tapis', 'Après travaux', 'Nettoyage extérieur'] },
  { order: 11, specialty: 'general',    label: 'Chauffage et climatisation',  icon: 'thermometer',  subcategories: ['Installation climatiseur', 'Installation fournaise', 'Entretien système HVAC', 'Thermostats intelligents', 'Ventilation'] },
  { order: 12, specialty: 'general',    label: 'Portes et fenêtres',          icon: 'door-open',    subcategories: ['Installation portes intérieures', 'Installation portes extérieures', 'Installation fenêtres', 'Remplacement vitres', 'Calfeutrage'] }
];

async function seedCategories() {
  const count = await ServiceCategory.countDocuments();
  if (count === 0) {
    await ServiceCategory.insertMany(DEFAULT_SERVICE_CATEGORIES);
    console.log('✅ ServiceCategory: seeded 12 default categories');
  }
}

// Browse Contractors (Public)
router.get('/', async (req, res) => {
  try {
    await seedCategories();

    const { specialty, city, q, service } = req.query;

    let dbQuery = {};
    if (specialty) dbQuery.specialties = specialty;
    if (city)      dbQuery['serviceArea.cities'] = { $regex: city, $options: 'i' };
    if (q) {
      dbQuery.$or = [
        { companyName:    { $regex: q, $options: 'i' } },
        { specialties:    { $regex: q, $options: 'i' } },
        { 'address.city': { $regex: q, $options: 'i' } }
      ];
    }

    const [contractors, categories] = await Promise.all([
      Contractor.find(dbQuery)
        .populate('user', 'firstName lastName avatar')
        .sort({ isPremium: -1, 'rating.average': -1 })
        .limit(24),
      ServiceCategory.find({ isActive: true }).sort({ order: 1 })
    ]);

    const activeCategory = categories.find(c =>
      c.specialty === specialty && (!service || c.subcategories.includes(service))
    );

    res.render('pages/contractors/index', {
      title: 'Trouver un entrepreneur - CraftyCrib',
      metaDescription: 'Trouvez des entrepreneurs et designers d\'intérieur vérifiés pour concrétiser votre projet de rénovation.',
      layout: 'layouts/landing',
      contractors,
      categories,
      filters: { specialty: specialty || '', city: city || '', service: service || '', q: q || '' },
      activeCategory: activeCategory || null
    });
  } catch (err) {
    console.error('Browse contractors error:', err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/');
  }
});

// ==========================================
// Quote Request (4-step wizard form)
// ==========================================
const QuoteRequest = require('../models/QuoteRequest');
const quoteUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/quotes'),
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase());
    cb(null, ok);
  }
});

router.post('/quote', quoteUpload.array('photos', 5), async (req, res) => {
  try {
    const {
      service, specialty, postalCode, timing, description,
      firstName, lastName, address, apartment, city, province,
      contactPostalCode, phone, altPhone, email
    } = req.body;

    const photos = (req.files || []).map(f => '/uploads/quotes/' + f.filename);

    const quote = await QuoteRequest.create({
      service, specialty, postalCode, timing,
      description: description || '',
      photos,
      firstName, lastName,
      address: address || '',
      apartment: apartment || '',
      city: city || '',
      province: province || '',
      contactPostalCode: contactPostalCode || '',
      phone,
      altPhone: altPhone || '',
      email
    });

    // Return matching contractors
    const contractors = await Contractor.find({ specialties: specialty })
      .populate('user', 'firstName lastName')
      .sort({ isPremium: -1, 'rating.average': -1 })
      .limit(6);

    res.json({
      success: true,
      quoteId: quote._id,
      contractors: contractors.map(c => ({
        _id: c._id,
        slug: c.slug,
        companyName: c.companyName,
        tagline: c.tagline || '',
        description: c.description ? c.description.substring(0, 110) + (c.description.length > 110 ? '…' : '') : '',
        logo: c.logo || '',
        initials: c.companyName.charAt(0).toUpperCase(),
        rating: c.rating || { average: 0, count: 0 },
        city: c.address?.city || 'France',
        specialties: c.specialties || [],
        isVerified: c.isVerified,
        isPremium: c.isPremium,
        availability: c.availability?.status || 'unknown'
      }))
    });
  } catch (err) {
    console.error('Quote request error:', err);
    res.status(500).json({ success: false, error: 'Une erreur est survenue.' });
  }
});

// Contractor Profile Setup (for new contractors)
router.get('/setup', ensureAuthenticated, ensureContractor, async (req, res) => {
  const existingProfile = await Contractor.findOne({ user: req.user.id });
  
  if (existingProfile) {
    return res.redirect('/contractors/profile');
  }

  res.render('pages/contractors/setup', {
    title: 'Set Up Your Profile - CraftyCrib',
    layout: 'layouts/dashboard',
    activePage: 'profile'
  });
});

// Save Contractor Profile
router.post('/setup', ensureAuthenticated, ensureContractor, upload.array('portfolioImages', 10), async (req, res) => {
  try {
    const {
      companyName,
      description,
      specialties,
      experienceYears,
      phone,
      website,
      street,
      city,
      state,
      zipCode,
      serviceCities,
      serviceRadius,
      hourlyRate,
      minimumProject
    } = req.body;

    const slug = slugify(companyName, { lower: true, strict: true }) + '-' + Date.now().toString(36);

    const contractor = new Contractor({
      user: req.user.id,
      companyName,
      slug,
      description,
      specialties: Array.isArray(specialties) ? specialties : [specialties],
      experience: {
        years: experienceYears ? parseInt(experienceYears) : 0
      },
      contact: {
        phone,
        email: req.user.email,
        website
      },
      address: {
        street,
        city,
        state,
        zipCode
      },
      serviceArea: {
        cities: serviceCities ? serviceCities.split(',').map(c => c.trim()) : [],
        radius: serviceRadius ? parseInt(serviceRadius) : 50
      },
      pricing: {
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        minimumProject: minimumProject ? parseFloat(minimumProject) : undefined
      }
    });

    // Add portfolio images
    if (req.files && req.files.length > 0) {
      contractor.portfolio.push({
        title: 'Portfolio',
        images: req.files.map(file => `/uploads/contractors/${file.filename}`)
      });
    }

    await contractor.save();

    req.flash('success_msg', 'Profile created successfully!');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Setup contractor error:', err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/contractors/setup');
  }
});

// View Contractor Profile (Public)
router.get('/:slug', async (req, res) => {
  try {
    const contractor = await Contractor.findOne({ slug: req.params.slug })
      .populate('user', 'firstName lastName avatar')
      .populate('reviews.user', 'firstName lastName');

    if (!contractor) {
      return res.status(404).render('pages/404', {
        title: 'Contractor Not Found'
      });
    }

    // Increment profile views
    contractor.stats.profileViews++;
    await contractor.save();

    res.render('pages/contractors/view', {
      title: `${contractor.companyName} - Professional Contractor | CraftyCrib`,
      metaDescription: `${contractor.companyName} - ${contractor.tagline || 'Professional contractor on CraftyCrib'}. View portfolio, reviews, and get quotes for your renovation project.`,
      layout: 'layouts/landing',
      contractor
    });
  } catch (err) {
    console.error('View contractor error:', err);
    res.redirect('/contractors');
  }
});

// Edit Contractor Profile
router.get('/profile/edit', ensureAuthenticated, ensureContractor, async (req, res) => {
  try {
    const contractor = await Contractor.findOne({ user: req.user.id });

    if (!contractor) {
      return res.redirect('/contractors/setup');
    }

    res.render('pages/contractors/edit', {
      title: 'Edit Profile - CraftyCrib',
      layout: 'layouts/dashboard',
      activePage: 'profile',
      contractor
    });
  } catch (err) {
    console.error('Edit contractor error:', err);
    res.redirect('/dashboard');
  }
});

// Update Contractor Profile
router.put('/profile', ensureAuthenticated, ensureContractor, async (req, res) => {
  try {
    const contractor = await Contractor.findOne({ user: req.user.id });

    if (!contractor) {
      return res.redirect('/contractors/setup');
    }

    const {
      companyName,
      description,
      specialties,
      availabilityStatus
    } = req.body;

    contractor.companyName = companyName;
    contractor.description = description;
    contractor.specialties = Array.isArray(specialties) ? specialties : [specialties];
    contractor.availability.status = availabilityStatus;

    await contractor.save();

    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Update contractor error:', err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/contractors/profile/edit');
  }
});

// View Available Projects
router.get('/projects/available', ensureAuthenticated, ensureContractor, async (req, res) => {
  try {
    const contractor = await Contractor.findOne({ user: req.user.id });

    if (!contractor) {
      return res.redirect('/contractors/setup');
    }

    // Find projects that match contractor's specialties
    const projects = await Project.find({
      visibility: 'contractors',
      status: { $in: ['completed', 'pending'] },
      roomType: { $in: contractor.specialties }
    })
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.render('pages/contractors/projects', {
      title: 'Available Projects - CraftyCrib',
      layout: 'layouts/dashboard',
      activePage: 'available-projects',
      projects,
      contractor
    });
  } catch (err) {
    console.error('Available projects error:', err);
    res.redirect('/dashboard');
  }
});

// Express Interest in Project
router.post('/projects/:id/interest', ensureAuthenticated, ensureContractor, async (req, res) => {
  try {
    const contractor = await Contractor.findOne({ user: req.user.id });
    const project = await Project.findById(req.params.id);

    if (!contractor || !project) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Check if already expressed interest
    const existingRequest = project.contractorRequests.find(
      r => r.contractor.toString() === contractor._id.toString()
    );

    if (existingRequest) {
      return res.status(400).json({ error: 'Already expressed interest' });
    }

    project.contractorRequests.push({
      contractor: contractor._id,
      message: req.body.message,
      quotation: req.body.quotation ? parseFloat(req.body.quotation) : undefined
    });

    contractor.stats.projectsReceived++;
    
    await project.save();
    await contractor.save();

    req.flash('success_msg', 'Interest expressed successfully');
    res.redirect('/contractors/projects/available');
  } catch (err) {
    console.error('Express interest error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

module.exports = router;

