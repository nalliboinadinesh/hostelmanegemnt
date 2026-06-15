const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner');
const Hostel = require('../models/Hostel');
const { sendWelcomeEmail, sendPaymentReminder } = require('../config/mailer');

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
      const hostels = await Hostel.find({ ownerId: owner._id });
      const isExisted = hostels.length > 0;

      owner = await Owner.findByIdAndUpdate(
        owner._id,
        { isExisted },
        { returnDocument: 'after' }
      );

      const token = generateToken(owner._id);
      return res.status(200).json({ token, isExisted, owner, hostels });
    }

    // New registration — no hostel yet
    owner = await Owner.create({ ownerNumber, isExisted: false });

    const token = generateToken(owner._id);
    return res.status(201).json({ token, isExisted: false, owner, hostels: [] });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerOrLogin, sendTestMail };

// POST /api/auth/test-mail
async function sendTestMail(req, res) {
  try {
    const { to, type = 'welcome' } = req.body;

    if (!to) {
      return res.status(400).json({ message: '`to` email address is required' });
    }

    if (type === 'welcome') {
      await sendWelcomeEmail({
        to,
        tenantName:      'Test Tenant',
        hostelName:      'Test Hostel PG',
        hostelOwnerName: 'Test Owner',
        dashboardLink:   'http://13.60.202.87:3000?token=test',
      });
    } else if (type === 'reminder') {
      await sendPaymentReminder({
        to,
        tenantName:      'Test Tenant',
        amount:          5000,
        periodEnd:       new Date(),
        hostelName:      'Test Hostel PG',
        hostelOwnerName: 'Test Owner',
        roomNumber:      '101',
      });
    } else {
      return res.status(400).json({ message: '`type` must be "welcome" or "reminder"' });
    }

    res.status(200).json({ message: `Test ${type} email sent successfully to ${to}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
