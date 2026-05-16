const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: 'open' },
}, { timestamps: true, collection: 'complaints' });

module.exports = mongoose.model('Complaint', complaintSchema);
