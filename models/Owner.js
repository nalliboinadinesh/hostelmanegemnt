const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
  ownerNumber: { type: String, required: true, unique: true },
  ownerName:   { type: String, default: null },
  email:       { type: String, default: null },
  isExisted:   { type: Boolean, default: false },
}, { timestamps: true, collection: 'owners' });

module.exports = mongoose.model('Owner', ownerSchema);
