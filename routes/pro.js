const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Note = require('../models/Note');

router.use((req, res, next) => {
  res.locals.layout = 'layouts/pro-dashboard';
  next();
});

router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const proNotes = await Note.find({ user: req.user.id, source: 'pro' })
      .sort({ pinned: -1, updatedAt: -1 });
    res.render('pages/pro/dashboard', {
      title: 'Pro Dashboard — CraftyCrib',
      layout: 'layouts/pro-dashboard',
      activePage: 'dashboard',
      proNotes
    });
  } catch (err) {
    console.error('Pro dashboard error:', err);
    res.render('pages/pro/dashboard', {
      title: 'Pro Dashboard — CraftyCrib',
      layout: 'layouts/pro-dashboard',
      activePage: 'dashboard',
      proNotes: []
    });
  }
});

router.post('/notes', ensureAuthenticated, async (req, res) => {
  try {
    const note = new Note({
      user:    req.user.id,
      source:  'pro',
      title:   req.body.title   || '',
      content: req.body.content || '',
      tags:    req.body.tags    || [],
      pinned:  false
    });
    await note.save();
    res.json({ success: true, note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/notes/:id', ensureAuthenticated, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user.id, source: 'pro' });
    if (!note) return res.status(404).json({ error: 'Note introuvable' });
    if (req.body.title   !== undefined) note.title   = req.body.title;
    if (req.body.content !== undefined) note.content = req.body.content;
    if (req.body.tags    !== undefined) note.tags    = req.body.tags;
    if (req.body.pinned  !== undefined) note.pinned  = req.body.pinned;
    await note.save();
    res.json({ success: true, note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/notes/:id', ensureAuthenticated, async (req, res) => {
  try {
    await Note.deleteOne({ _id: req.params.id, user: req.user.id, source: 'pro' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
