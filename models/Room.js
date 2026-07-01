const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', required: true },
  roomNumber: { type: String, required: true },
  roomType: { type: String, required: true },
  totalBeds: { type: Number, required: true },
  occupiedBeds: { type: Number, default: 0 },
  vacantBeds: { type: Number, default: 0 },
}, { timestamps: true, collection: 'rooms' });

// Indexes — rooms are always listed/looked up within a hostel (and often a floor).
roomSchema.index({ hostelId: 1, floorId: 1 });

module.exports = mongoose.model('Room', roomSchema);
