require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const path = require('path');

// Initialize Express
const app = express();

// Passport Config
require('./config/passport')(passport);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// EJS Setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

// Body Parser
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.json({ limit: '20mb' }));

// Method Override for PUT/DELETE
app.use(methodOverride('_method'));

// Static Files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'asset')));

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 14 * 24 * 60 * 60 // 14 days
  }),
  cookie: {
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
  }
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash Messages
app.use(flash());

// Global Variables
const SiteSettings = require('./models/SiteSettings');
app.use(async (req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  res.locals.currentYear = new Date().getFullYear();
  try {
    const settings = await SiteSettings.findOne({});
    res.locals.socialLinks = settings ? settings.socialLinks : { facebook: '', instagram: '', tiktok: '' };
  } catch (e) {
    res.locals.socialLinks = { facebook: '', instagram: '', tiktok: '' };
  }
  next();
});

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/projects', require('./routes/projects'));
app.use('/contractors', require('./routes/contractors'));
app.use('/admin', require('./routes/admin'));
app.use('/api', require('./routes/api'));

// 404 Handler
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: '404 - Page Not Found'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('pages/error', {
    title: 'Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   🏠 CraftyCrib Server Running                            ║
  ║   🌐 http://localhost:${PORT}                               ║
  ║   📊 Environment: ${process.env.NODE_ENV || 'development'}                        ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
});

