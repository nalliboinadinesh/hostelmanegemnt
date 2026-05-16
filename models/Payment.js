const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  amount: { type: Number, required: true },
  periodStart: { type: Date, required: true },  // start of 30-day cycle
  periodEnd: { type: Date, required: true },     // periodStart + 30 days
  paymentMethod: { type: String },
  note: { type: String },
  isPaid: { type: Boolean, default: false },
}, { timestamps: true, collection: 'payments' });

module.exports = mongoose.model('Payment', paymentSchema);
