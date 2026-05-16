const mongoose = require('mongoose');

const feeStatusSchema = new mongoose.Schema({
  month: { type: Number, required: true },   // 1-12
  year: { type: Number, required: true },
  isPaid: { type: Boolean, default: false },
}, { _id: false });

const tenantSchema = new mongoose.Schema({
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String },
  address: { type: String },
  parentNumber: { type: String },
  aadhaarNumber: { type: String },
  occupation: { type: String },
  joinedDate: { type: Date },
  monthlyFee: { type: Number },
  deposit: { type: Number },
  paymentStatus: { type: String, default: 'pending' },
  feeStatus: { type: [feeStatusSchema], default: [] },
}, { timestamps: true, collection: 'tenants' });

module.exports = mongoose.model('Tenant', tenantSchema);
