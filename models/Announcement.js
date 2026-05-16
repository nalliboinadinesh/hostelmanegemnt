const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
}, { timestamps: true, collection: 'announcements' });

module.exports = mongoose.model('Announcement', announcementSchema);
