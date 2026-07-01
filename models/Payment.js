const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  amount: { type: Number, required: true },
  periodStart: { type: Date, required: true },  // start of 30-day cycle
  periodEnd: { type: Date, required: true },     // periodStart + 30 days
  paymentMethod: { type: String },
  paymentDate: { type: Date },
  note: { type: String },
  isPaid: { type: Boolean, default: false },
}, { timestamps: true, collection: 'payments' });

// Indexes — the Payment collection grows fastest (one cycle per tenant per 30 days).
// Dashboard/tenant views filter by tenantId (sorted by periodStart); the reminder
// cron and hostel payment views filter by hostelId + isPaid.
paymentSchema.index({ tenantId: 1, periodStart: 1 });
paymentSchema.index({ hostelId: 1, isPaid: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
