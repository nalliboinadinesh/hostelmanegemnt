const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner');
const Hostel = require('../models/Hostel');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// POST /api/auth/register-login
const registerOrLogin = async (req, res) => {
  try {
    const { ownerNumber } = req.body;

    if (!ownerNumber) {
      return res.status(400).json({ message: 'ownerNumber is required' });
    }

    let owner = await Owner.findOne({ ownerNumber });

    if (owner) {
      // Check if hostel exists for this owner
      const hostel = await Hostel.findOne({ ownerId: owner._id });
      const isExisted = !!hostel;

      // Update isExisted based on hostel presence
      owner = await Owner.findByIdAndUpdate(
        owner._id,
        { isExisted },
        { new: true }
      );

      const token = generateToken(owner._id);
      return res.status(200).json({ token, isExisted, owner });
    }

    // New registration — no hostel yet so isExisted is false
    owner = await Owner.create({ ownerNumber, isExisted: false });

    const token = generateToken(owner._id);
    return res.status(201).json({ token, isExisted: false, owner });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerOrLogin };
