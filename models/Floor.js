const mongoose = require('mongoose');

const floorSchema = new mongoose.Schema({
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  floorNumber: { type: Number, required: true },
}, { timestamps: true, collection: 'floors' });

module.exports = mongoose.model('Floor', floorSchema);
