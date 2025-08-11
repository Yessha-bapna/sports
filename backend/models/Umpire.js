const mongoose = require('mongoose');

const umpireSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  experience: {
    type: Number,
    default: 0
  },
  specialization: {
    type: [String],
    enum: ['cricket', 'badminton'],
    default: ['cricket', 'badminton']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Umpire', umpireSchema);
