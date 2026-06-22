const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
  ownerNumber: { type: String, required: true, unique: true },
  isExisted: { type: Boolean, default: false },
}, { timestamps: true, collection: 'owners' });

module.exports = mongoose.model('Owner', ownerSchema);
