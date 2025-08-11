const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
    sport: { type: String, required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    court: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

// Helpful indexes
BookingSchema.index({ venue: 1, startAt: 1, endAt: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
