const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  hostelId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  title:       { type: String, required: true },
  category:    { type: String, required: true },
  description: { type: String, required: true },
  imageLink:   { type: String, default: null },
  status:      { type: String, enum: ['open', 'in-progress', 'resolved'], default: 'open' },
}, { timestamps: true, collection: 'tickets' });

// Indexes — tickets are listed by tenant (dashboard) and by hostel (owner view).
ticketSchema.index({ tenantId: 1, createdAt: -1 });
ticketSchema.index({ hostelId: 1, createdAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
