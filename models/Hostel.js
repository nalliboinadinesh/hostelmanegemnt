const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
  ownerNumber: { type: String, required: true },
  hostelName: { type: String, required: true },
  hostelType: { type: String, required: true },
  ownerName: { type: String, required: true },
  email: { type: String },
  upiId: { type: String },
}, { timestamps: true, collection: 'hostels' });

module.exports = mongoose.model('Hostel', hostelSchema);
