const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  address: { type: String, trim: true },
  sports: [{ type: String, enum: ['cricket', 'badminton', 'football', 'basketball', 'tennis', 'other'] }],
  type: { type: String, enum: ['indoor', 'outdoor', 'mixed'], default: 'mixed' },
  imageUrl: { type: String, trim: true },
  gallery: [{ type: String, trim: true }],
  openingTime: { type: String, trim: true }, // e.g., '07:00 AM'
  closingTime: { type: String, trim: true }, // e.g., '11:00 PM'
  amenities: [{ type: String, trim: true }], // e.g., Parking, Restroom, WiFi
  about: { type: String, trim: true },
  mapUrl: { type: String, trim: true },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  pricePerHour: { type: Number, min: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Venue', venueSchema);
