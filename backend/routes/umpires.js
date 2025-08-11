const express = require('express');
const router = express.Router();
const Umpire = require('../models/Umpire');

// GET all umpires
router.get('/', async (req, res) => {
  try {
    const umpires = await Umpire.find({ isActive: true }).sort({ name: 1 });
    res.json(umpires);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET umpire by ID
router.get('/:id', async (req, res) => {
  try {
    const umpire = await Umpire.findById(req.params.id);
    if (!umpire) {
      return res.status(404).json({ error: 'Umpire not found' });
    }
    res.json(umpire);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new umpire
router.post('/', async (req, res) => {
  try {
    const umpire = new Umpire(req.body);
    await umpire.save();
    res.status(201).json(umpire);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// PUT update umpire
router.put('/:id', async (req, res) => {
  try {
    const umpire = await Umpire.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!umpire) {
      return res.status(404).json({ error: 'Umpire not found' });
    }
    res.json(umpire);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE umpire (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const umpire = await Umpire.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!umpire) {
      return res.status(404).json({ error: 'Umpire not found' });
    }
    res.json({ message: 'Umpire deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
