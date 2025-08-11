const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true,
    unique: true
  },
  // Cricket specific scoring
  cricketScore: {
    team1Runs: { type: Number, default: 0 },
    team1Wickets: { type: Number, default: 0 },
    team1Overs: { type: Number, default: 0 },
    team1Balls: { type: Number, default: 0 },
    team2Runs: { type: Number, default: 0 },
    team2Wickets: { type: Number, default: 0 },
    team2Overs: { type: Number, default: 0 },
    team2Balls: { type: Number, default: 0 },
    currentInnings: { type: Number, default: 1 }, // 1 or 2
    isInningsComplete: { type: Boolean, default: false }
  },
  // Badminton specific scoring
  badmintonScore: {
    player1Sets: { type: Number, default: 0 },
    player2Sets: { type: Number, default: 0 },
    currentSet: { type: Number, default: 1 },
    sets: [{
      setNumber: { type: Number, required: true },
      player1Score: { type: Number, default: 0 },
      player2Score: { type: Number, default: 0 },
      isComplete: { type: Boolean, default: false },
      winner: { type: String, enum: ['player1', 'player2', null], default: null }
    }]
  },
  winner: {
    type: String,
    default: null
  },
  isMatchComplete: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update lastUpdated on save
scoreSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('Score', scoreSchema);
