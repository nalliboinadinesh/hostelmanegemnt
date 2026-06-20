const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');

// Shared token verifier — reads from req.body.token
const verifyDashboardToken = (token) => {
  if (!token) throw { status: 400, message: 'Token is required' };
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.hostelId || !decoded.tenantId)
      throw { status: 401, message: 'Invalid token payload' };
    return decoded;
  } catch (err) {
    if (err.status) throw err;
    if (err.name === 'TokenExpiredError')
      throw { status: 401, message: 'Dashboard link has expired' };
    throw { status: 401, message: 'Invalid token' };
  }
};

// POST /api/dashboard
const getTenantDashboard = async (req, res) => {
  try {
    const { token } = req.body;
    let decoded;
    try { decoded = verifyDashboardToken(token); }
    catch (err) { return res.status(err.status).json({ message: err.message }); }

    const { hostelId, tenantId } = decoded;

    const [tenant, hostel] = await Promise.all([
      Tenant.findOne({ _id: tenantId, hostelId }).lean(),
      Hostel.findById(hostelId).lean(),
    ]);

    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    if (!hostel)  return res.status(404).json({ message: 'Hostel not found' });

    const [room, payments, tickets] = await Promise.all([
      // BUG-13 FIX: scope room query to hostelId to prevent data leak from other hostels
      Room.findOne({ _id: tenant.roomId, hostelId }).lean(),
      Payment.find({ tenantId: tenant._id }).sort({ periodStart: 1 }).lean(),
      Ticket.find({ tenantId: tenant._id }).sort({ createdAt: -1 }).lean(),
    ]);

    const totalDues    = payments.filter(p => !p.isPaid).reduce((sum, p) => sum + p.amount, 0);
    const paidCycles   = payments.filter(p => p.isPaid).length;
    const unpaidCycles = payments.filter(p => !p.isPaid).length;
    const lastPayment  = payments.filter(p => p.isPaid).pop() || null;

    res.status(200).json({
      tenant: {
        id:            tenant._id,
        name:          tenant.name,
        phoneNumber:   tenant.phoneNumber,
        email:         tenant.email,
        occupation:    tenant.occupation,
        joinedDate:    tenant.joinedDate,
        paymentStatus: tenant.paymentStatus,
      },
      hostel: {
        id:          hostel._id,
        hostelName:  hostel.hostelName,
        hostelType:  hostel.hostelType,
        ownerName:   hostel.ownerName,
        ownerNumber: hostel.ownerNumber,
        email:       hostel.email,
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
          _id:           p._id,
          periodStart:   p.periodStart,
          periodEnd:     p.periodEnd,
          amount:        p.amount,
          isPaid:        p.isPaid,
          paymentDate:   p.paymentDate || null,
          paymentMethod: p.paymentMethod || null,
        })),
      },
      tickets: tickets.map(t => ({
        _id:         t._id,
        title:       t.title,
        category:    t.category,
        description: t.description,
        imageLink:   t.imageLink,
        status:      t.status,
        createdAt:   t.createdAt,
        updatedAt:   t.updatedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/dashboard/ticket
const createTicket = async (req, res) => {
  try {
    const { token, title, category, description, imageLink } = req.body;
    let decoded;
    try { decoded = verifyDashboardToken(token); }
    catch (err) { return res.status(err.status).json({ message: err.message }); }

    const { hostelId, tenantId } = decoded;

    if (!title || !category || !description)
      return res.status(400).json({ message: 'title, category and description are required' });

    const tenant = await Tenant.findOne({ _id: tenantId, hostelId }).lean();
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    const ticket = await Ticket.create({
      hostelId,
      tenantId,
      title,
      category,
      description,
      imageLink: imageLink || null,
    });

    res.status(201).json({ message: 'Ticket raised successfully', ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/dashboard/tickets
const getMyTickets = async (req, res) => {
  try {
    const { token } = req.body;
    let decoded;
    try { decoded = verifyDashboardToken(token); }
    catch (err) { return res.status(err.status).json({ message: err.message }); }

    const tickets = await Ticket.find({ tenantId: decoded.tenantId }).sort({ createdAt: -1 });
    res.status(200).json({ total: tickets.length, tickets });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTenantDashboard, createTicket, getMyTickets };
