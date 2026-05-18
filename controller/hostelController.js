const Hostel = require('../models/Hostel');
const Owner = require('../models/Owner');

// POST /api/hostel/create
const createHostel = async (req, res) => {
  try {
    const { hostelName, hostelType, ownerName, email } = req.body;

    if (!hostelName || !hostelType || !ownerName) {
      return res.status(400).json({ message: 'hostelName, hostelType and ownerName are required' });
    }

    const hostel = await Hostel.create({
      ownerId: req.owner._id,
      ownerNumber: req.owner.ownerNumber,
      hostelName,
      hostelType,
      ownerName,
      email,
    });

    // Mark owner as existed since hostel is now created
    await Owner.findByIdAndUpdate(req.owner._id, { isExisted: true });

    res.status(201).json({ message: 'Hostel created successfully', hostel });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// GET /api/hostel/list
const getHostelsByOwner = async (req, res) => {
  try {
    const hostels = await Hostel.find({ ownerId: req.owner._id });
    res.status(200).json({ hostels });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/hostel/:hostelId
const deleteHostel = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ _id: req.params.hostelId, ownerId: req.owner._id });

    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found or unauthorized' });
    }

    await hostel.deleteOne();

    // Check if owner has any remaining hostels, update isExisted accordingly
    const remaining = await Hostel.countDocuments({ ownerId: req.owner._id });
    await Owner.findByIdAndUpdate(req.owner._id, { isExisted: remaining > 0 });

    res.status(200).json({ message: 'Hostel deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/hostel/:hostelId
const updateHostel = async (req, res) => {
  try {
    const { hostelName, hostelType, ownerName, email } = req.body;

    const hostel = await Hostel.findOne({ _id: req.params.hostelId, ownerId: req.owner._id });

    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found or unauthorized' });
    }

    if (hostelName) hostel.hostelName = hostelName;
    if (hostelType) hostel.hostelType = hostelType;
    if (ownerName) hostel.ownerName = ownerName;
    if (email) hostel.email = email;

    await hostel.save();

    res.status(200).json({ message: 'Hostel updated successfully', hostel });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/hostel/:hostelId
const getHostelById = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ _id: req.params.hostelId, ownerId: req.owner._id });

    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found or unauthorized' });
    }

    res.status(200).json({ hostel });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createHostel, getHostelsByOwner, getHostelById, deleteHostel, updateHostel };
