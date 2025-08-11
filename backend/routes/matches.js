const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Score = require('../models/Score');

// GET all matches
router.get('/', async (req, res) => {
  try {
    const matches = await Match.find()
      .populate('umpireId', 'name email')
      .sort({ createdAt: -1 });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET match by ID with score
router.get('/:id', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).populate('umpireId', 'name email');
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    const score = await Score.findOne({ matchId: req.params.id });
    res.json({ match, score });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new match
router.post('/', async (req, res) => {
  try {
    const match = new Match(req.body);
    await match.save();
    
    // Create initial score record
    const initialScore = new Score({
      matchId: match._id,
      cricketScore: match.sportType === 'cricket' ? {
        team1Runs: 0,
        team1Wickets: 0,
        team1Overs: 0,
        team1Balls: 0,
        team2Runs: 0,
        team2Wickets: 0,
        team2Overs: 0,
        team2Balls: 0,
        currentInnings: 1,
        isInningsComplete: false
      } : undefined,
      badmintonScore: match.sportType === 'badminton' ? {
        player1Sets: 0,
        player2Sets: 0,
        currentSet: 1,
        sets: [{ setNumber: 1, player1Score: 0, player2Score: 0, isComplete: false }]
      } : undefined
    });
    
    await initialScore.save();
    
    const populatedMatch = await Match.findById(match._id).populate('umpireId', 'name email');
    res.status(201).json(populatedMatch);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update match status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const existing = await Match.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Match not found' });

    const updates = { status };
    const now = new Date();
    if (status === 'live') {
      updates.startTime = now;
      const duration = existing.durationMinutes || 30;
      updates.endTime = new Date(now.getTime() + duration * 60 * 1000);
    }
    if (status === 'completed') {
      updates.endTime = now;
    }

    const match = await Match.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('umpireId', 'name email');

    res.json(match);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE match
router.delete('/:id', async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Also delete associated score
    await Score.findOneAndDelete({ matchId: req.params.id });
    
    res.json({ message: 'Match deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
