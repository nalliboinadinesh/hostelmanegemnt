const mongoose = require('mongoose');

const floorSchema = new mongoose.Schema({
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  floorNumber: { type: Number, required: true },
}, { timestamps: true, collection: 'floors' });

// Index — floors are always listed within a hostel.
floorSchema.index({ hostelId: 1 });

module.exports = mongoose.model('Floor', floorSchema);
