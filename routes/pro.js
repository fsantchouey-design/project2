const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Note = require('../models/Note');
const QuoteRequest = require('../models/QuoteRequest');

router.use((req, res, next) => {
  res.locals.layout = 'layouts/pro-dashboard';
  next();
});

router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const [proNotes, quoteRequests] = await Promise.all([
      Note.find({ user: req.user.id, source: 'pro' }).sort({ pinned: -1, updatedAt: -1 }),
      QuoteRequest.find({}).sort({ createdAt: -1 })
    ]);
    res.render('pages/pro/dashboard', {
      title: 'Pro Dashboard — CraftyCrib',
      layout: 'layouts/pro-dashboard',
      activePage: 'dashboard',
      proNotes,
      quoteRequests
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

router.put('/leads/:id/lead-status', ensureAuthenticated, async (req, res) => {
  try {
    const { proLeadStatus } = req.body;
    const allowed = ['new_lead', 'contacted', 'won', 'lost', 'archived'];
    if (!allowed.includes(proLeadStatus)) return res.status(400).json({ error: 'Statut invalide' });
    const quote = await QuoteRequest.findByIdAndUpdate(
      req.params.id,
      { proLeadStatus },
      { new: true }
    );
    if (!quote) return res.status(404).json({ error: 'Lead introuvable' });
    res.json({ success: true, proLeadStatus: quote.proLeadStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/quotes/:id/status', ensureAuthenticated, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['new', 'contacted', 'accepted', 'refused', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
    const quote = await QuoteRequest.findByIdAndUpdate(
      req.params.id,
      { status, statusUpdatedAt: new Date() },
      { new: true }
    );
    if (!quote) return res.status(404).json({ error: 'Demande introuvable' });
    res.json({ success: true, status: quote.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
