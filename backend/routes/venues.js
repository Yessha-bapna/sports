const express = require('express');
const router = express.Router();
const Venue = require('../models/Venue');

// GET all active venues with optional filters
router.get('/', async (req, res) => {
  try {
    const { city, sport, type, q } = req.query;
    const filter = { isActive: true };
    if (city) filter.city = new RegExp(city, 'i');
    if (type) filter.type = type;
    if (sport) filter.sports = sport;
    if (q) filter.name = new RegExp(q, 'i');

    const venues = await Venue.find(filter).sort({ createdAt: -1 });
    res.json(venues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET venue by id
router.get('/:id', async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue || !venue.isActive) return res.status(404).json({ error: 'Venue not found' });
    res.json(venue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create venue
router.post('/', async (req, res) => {
  try {
    const venue = new Venue(req.body);
    await venue.save();
    res.status(201).json(venue);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update venue
router.put('/:id', async (req, res) => {
  try {
    const venue = await Venue.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    res.json(venue);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE soft delete
router.delete('/:id', async (req, res) => {
  try {
    const venue = await Venue.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    res.json({ message: 'Venue deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
