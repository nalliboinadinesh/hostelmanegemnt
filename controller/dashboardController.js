const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Payment = require('../models/Payment');

// GET /api/dashboard?token=<jwt>
const getTenantDashboard = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Token is required' });

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError')
        return res.status(401).json({ message: 'Dashboard link has expired' });
      return res.status(401).json({ message: 'Invalid token' });
    }

    const { hostelId, tenantId } = decoded;
    if (!hostelId || !tenantId)
      return res.status(401).json({ message: 'Invalid token payload' });

    // Fetch all data in parallel
    const [tenant, hostel] = await Promise.all([
      Tenant.findOne({ _id: tenantId, hostelId }).lean(),
      Hostel.findById(hostelId).lean(),
    ]);

    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    if (!hostel)  return res.status(404).json({ message: 'Hostel not found' });

    const [room, payments] = await Promise.all([
      Room.findById(tenant.roomId).lean(),
      Payment.find({ tenantId: tenant._id }).sort({ periodStart: 1 }).lean(),
    ]);

    // Payment summary
    const totalDues = payments
      .filter(p => !p.isPaid)
      .reduce((sum, p) => sum + p.amount, 0);

    const paidCycles   = payments.filter(p => p.isPaid).length;
    const unpaidCycles = payments.filter(p => !p.isPaid).length;

    const lastPayment = payments.filter(p => p.isPaid).pop() || null;

    res.status(200).json({
      tenant: {
        id:           tenant._id,
        name:         tenant.name,
        phoneNumber:  tenant.phoneNumber,
        email:        tenant.email,
        occupation:   tenant.occupation,
        joinedDate:   tenant.joinedDate,
        paymentStatus: tenant.paymentStatus,
      },
      hostel: {
        id:           hostel._id,
        hostelName:   hostel.hostelName,
        hostelType:   hostel.hostelType,
        ownerName:    hostel.ownerName,
        ownerNumber:  hostel.ownerNumber,
        email:        hostel.email,
      },
      room: {
        id:         room?._id,
        roomNumber: room?.roomNumber,
        roomType:   room?.roomType,
        totalBeds:  room?.totalBeds,
      },
      payments: {
        monthlyRent:  tenant.monthlyFee,
        deposit:      tenant.deposit,
        totalDues,
        paidCycles,
        unpaidCycles,
        lastPaidDate: lastPayment?.paymentDate || null,
        cycles: payments.map(p => ({
          _id:         p._id,
          periodStart: p.periodStart,
          periodEnd:   p.periodEnd,
          amount:      p.amount,
          isPaid:      p.isPaid,
          paymentDate: p.paymentDate || null,
          paymentMethod: p.paymentMethod || null,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTenantDashboard };
