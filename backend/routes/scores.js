const express = require('express');
const router = express.Router();
const Score = require('../models/Score');
const Match = require('../models/Match');

// GET score by match ID
router.get('/match/:matchId', async (req, res) => {
  try {
    const score = await Score.findOne({ matchId: req.params.matchId })
      .populate('matchId');
    if (!score) {
      return res.status(404).json({ error: 'Score not found' });
    }
    res.json(score);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update cricket score
router.put('/cricket/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const updateData = req.body;
    
    const setDoc = {
      lastUpdated: new Date(),
    };
    if (updateData.cricketScore) {
      setDoc['cricketScore'] = updateData.cricketScore;
    }
    if (typeof updateData.winner !== 'undefined') {
      setDoc['winner'] = updateData.winner;
    }
    if (typeof updateData.isMatchComplete !== 'undefined') {
      setDoc['isMatchComplete'] = updateData.isMatchComplete;
    }

    const score = await Score.findOneAndUpdate(
      { matchId },
      { $set: setDoc },
      { new: true, upsert: true }
    ).populate('matchId');
    
    // emit live update
    const io = req.app.get('io');
    if (io) io.to(matchId).emit('scoreUpdated', score);
    res.json(score);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update badminton score
router.put('/badminton/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const updateData = req.body;
    
    const setDoc = {
      lastUpdated: new Date(),
    };
    if (updateData.badmintonScore) {
      setDoc['badmintonScore'] = updateData.badmintonScore;
    }
    if (typeof updateData.winner !== 'undefined') {
      setDoc['winner'] = updateData.winner;
    }
    if (typeof updateData.isMatchComplete !== 'undefined') {
      setDoc['isMatchComplete'] = updateData.isMatchComplete;
    }

    const score = await Score.findOneAndUpdate(
      { matchId },
      { $set: setDoc },
      { new: true, upsert: true }
    ).populate('matchId');
    
    // emit live update
    const io = req.app.get('io');
    if (io) io.to(matchId).emit('scoreUpdated', score);
    res.json(score);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST add runs to cricket score
router.post('/cricket/:matchId/add-runs', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { runs, isWicket, isExtra, team } = req.body;
    
    const score = await Score.findOne({ matchId });
    if (!score) {
      return res.status(404).json({ error: 'Score not found' });
    }
    // If match already complete, block further scoring
    if (score.isMatchComplete) {
      return res.status(400).json({ error: 'Match already complete' });
    }

    const match = await Match.findById(matchId);
    const totalOvers = Number(match?.totalOvers || 0) || 20;
    
    const teamField = team === 1 ? 'team1' : 'team2';
    
    // Add runs
    score.cricketScore[`${teamField}Runs`] += runs;
    
    // Add wicket if applicable
    if (isWicket) {
      score.cricketScore[`${teamField}Wickets`] += 1;
    }
    
    // Increment balls (only if not an extra)
    if (!isExtra) {
      score.cricketScore[`${teamField}Balls`] += 1;
      
      // Check if over is complete
      if (score.cricketScore[`${teamField}Balls`] >= 6) {
        score.cricketScore[`${teamField}Overs`] += 1;
        score.cricketScore[`${teamField}Balls`] = 0;
      }
    }
    // Enforce innings and match rules
    const cs = score.cricketScore;
    const endOfOverForTeam = cs[`${teamField}Overs`] >= totalOvers;
    const allOutForTeam = cs[`${teamField}Wickets`] >= 10;

    // If first innings (currentInnings = 1)
    if (cs.currentInnings === 1) {
      if (endOfOverForTeam || allOutForTeam) {
        cs.isInningsComplete = true;
        cs.currentInnings = 2; // switch to second innings automatically
      }
    } else if (cs.currentInnings === 2) {
      // Determine target and early finish conditions in second innings
      const target = cs.team1Runs + 1;
      // If second team (team 2) surpasses target at any time -> win immediately
      if (cs.team2Runs >= target) {
        score.winner = match?.team2 || 'Team 2';
        score.isMatchComplete = true;
      }
      // If team 2 all out or overs finished without reaching target -> team 1 wins
      const secondInningsComplete = endOfOverForTeam || allOutForTeam;
      if (!score.isMatchComplete && secondInningsComplete) {
        if (cs.team2Runs >= target) {
          score.winner = match?.team2 || 'Team 2';
        } else if (cs.team2Runs < cs.team1Runs) {
          score.winner = match?.team1 || 'Team 1';
        } else if (cs.team2Runs === cs.team1Runs) {
          score.winner = 'Tie';
        }
        score.isMatchComplete = true;
      }
    }

    score.lastUpdated = new Date();
    await score.save();
    
    const populatedScore = await Score.findById(score._id).populate('matchId');
    // emit live update
    const io = req.app.get('io');
    if (io) io.to(matchId).emit('scoreUpdated', populatedScore);
    res.json(populatedScore);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST add point to badminton score
router.post('/badminton/:matchId/add-point', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { player } = req.body; // 'player1' or 'player2'
    
    const score = await Score.findOne({ matchId });
    if (!score) {
      return res.status(404).json({ error: 'Score not found' });
    }
    
    const currentSetIndex = score.badmintonScore.currentSet - 1;
    const currentSet = score.badmintonScore.sets[currentSetIndex];
    
    if (!currentSet || currentSet.isComplete) {
      return res.status(400).json({ error: 'Current set is complete or not found' });
    }
    
    // Add point
    currentSet[`${player}Score`] += 1;
    
    // Determine points-to-win from Match (default 21)
    const match = await Match.findById(matchId);
    const pointsToWin = match?.pointsToWin || 21;
    const player1Score = currentSet.player1Score;
    const player2Score = currentSet.player2Score;

    // Simple rule: first to pointsToWin wins the set
    if (player1Score >= pointsToWin) {
      currentSet.isComplete = true;
      currentSet.winner = 'player1';
      score.badmintonScore.player1Sets += 1;
    } else if (player2Score >= pointsToWin) {
      currentSet.isComplete = true;
      currentSet.winner = 'player2';
      score.badmintonScore.player2Sets += 1;
    }
    
    // Check if match is won (best of N sets)
    const setsToWin = Math.ceil(match.maxSets / 2);
    
    if (score.badmintonScore.player1Sets >= setsToWin) {
      score.winner = 'player1';
      score.isMatchComplete = true;
    } else if (score.badmintonScore.player2Sets >= setsToWin) {
      score.winner = 'player2';
      score.isMatchComplete = true;
    } else if (currentSet.isComplete && !score.isMatchComplete) {
      // Start new set
      score.badmintonScore.currentSet += 1;
      score.badmintonScore.sets.push({
        setNumber: score.badmintonScore.currentSet,
        player1Score: 0,
        player2Score: 0,
        isComplete: false
      });
    }
    
    score.lastUpdated = new Date();
    await score.save();
    
    const populatedScore = await Score.findById(score._id).populate('matchId');
    res.json(populatedScore);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
