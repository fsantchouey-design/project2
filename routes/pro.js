const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');

router.use((req, res, next) => {
  res.locals.layout = 'layouts/pro-dashboard';
  next();
});

router.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render('pages/pro/dashboard', {
    title: 'Pro Dashboard — CraftyCrib',
    layout: 'layouts/pro-dashboard',
    activePage: 'dashboard'
  });
});

module.exports = router;
