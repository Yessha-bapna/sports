const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');

// Helper: build date range
function rangeFromQuery(q) {
  const { date, start, end } = q;
  if (date) {
    const d = new Date(date);
    const startAt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
    const endAt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0));
    return { startAt, endAt };
  }
  const startAt = start ? new Date(start) : null;
  const endAt = end ? new Date(end) : null;
  return { startAt, endAt };
}

// GET bookings for a venue (optionally by date or range)
router.get('/by-venue/:venueId', async (req, res) => {
  try {
    const { venueId } = req.params;
    const { startAt, endAt } = rangeFromQuery(req.query);
    const query = { venue: venueId };
    if (startAt && endAt) {
      query.$or = [
        { startAt: { $lt: endAt }, endAt: { $gt: startAt } },
      ];
    }
    const bookings = await Booking.find(query).sort({ startAt: 1 });
    res.json(bookings);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// POST create booking with conflict check
router.post('/', async (req, res) => {
  try {
    const { venue, sport, startAt, endAt, court, notes } = req.body || {};
    if (!venue || !sport || !startAt || !endAt) {
      return res.status(400).json({ error: 'venue, sport, startAt, endAt are required' });
    }
    const s = new Date(startAt);
    const e = new Date(endAt);
    if (!(s < e)) {
      return res.status(400).json({ error: 'endAt must be after startAt' });
    }

    // Conflict: overlapping on same venue and same court (if provided). If court omitted, block any overlap at venue.
    const conflictQuery = {
      venue,
      startAt: { $lt: e },
      endAt: { $gt: s },
    };
    if (court) conflictQuery.court = court;

    const conflict = await Booking.findOne(conflictQuery);
    if (conflict) {
      return res.status(409).json({ error: 'Slot is already booked' });
    }

    const created = await Booking.create({ venue, sport, startAt: s, endAt: e, court, notes });
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// GET booking by id
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

module.exports = router;
