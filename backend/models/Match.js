const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  matchName: {
    type: String,
    required: true,
    trim: true
  },
  sportType: {
    type: String,
    required: true,
    enum: ['cricket', 'badminton']
  },
  umpireId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Umpire',
    required: true
  },
  // Link to Venue and Booking
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue'
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  // Cricket specific fields
  team1: {
    type: String,
    trim: true
  },
  team2: {
    type: String,
    trim: true
  },
  totalOvers: {
    type: Number,
    min: 1
  },
  // Badminton specific fields
  player1: {
    type: String,
    trim: true
  },
  player2: {
    type: String,
    trim: true
  },
  maxSets: {
    type: Number,
    default: 3,
    min: 1,
    max: 5
  },
  // Badminton points target per set (e.g., 10 or 21)
  pointsToWin: {
    type: Number,
    default: 21,
    min: 1
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed'],
    default: 'upcoming'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  }
  ,
  durationMinutes: {
    type: Number,
    default: 30,
    min: 1
  }
}, {
  timestamps: true
});

// Validation based on sport type
matchSchema.pre('save', function(next) {
  if (this.sportType === 'cricket') {
    if (!this.team1 || !this.team2 || !this.totalOvers) {
      return next(new Error('Cricket matches require team1, team2, and totalOvers'));
    }
  } else if (this.sportType === 'badminton') {
    if (!this.player1 || !this.player2) {
      return next(new Error('Badminton matches require player1 and player2'));
    }
  }
  next();
});

module.exports = mongoose.model('Match', matchSchema);
