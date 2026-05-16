const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  expenseReason: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  paymentMethod: { type: String },
  note: { type: String },
  month: { type: Number },
  year: { type: Number },
}, { timestamps: true, collection: 'expenses' });

module.exports = mongoose.model('Expense', expenseSchema);
