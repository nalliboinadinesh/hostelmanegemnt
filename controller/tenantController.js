const Tenant = require('../models/Tenant');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Payment = require('../models/Payment');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail } = require('../config/mailer');

const verifyHostelOwner = async (hostelId, ownerId) => {
  return await Hostel.findOne({ _id: hostelId, ownerId });
};

// Generates dashboard link with JWT containing hostelId + tenantId
const buildDashboardLink = (hostelId, tenantId) => {
  const token = jwt.sign(
    { hostelId: hostelId.toString(), tenantId: tenantId.toString() },
    process.env.JWT_SECRET
    // no expiry — permanent access link
  );
  return `https://dashboard-frontend-five-rouge.vercel.app/?token=${token}`;
};

// POST /api/tenant/create
const createTenant = async (req, res) => {
  try {
    const {
      hostelId, floorId, roomId, name, phoneNumber,
      email, address, parentNumber, aadhaarNumber,
      occupation, joinedDate, monthlyFee, deposit, paymentStatus,
    } = req.body;

    if (!hostelId || !floorId || !roomId || !name || !phoneNumber) {
      return res.status(400).json({ message: 'hostelId, floorId, roomId, name and phoneNumber are required' });
    }

    const hostel = await verifyHostelOwner(hostelId, req.owner._id);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found or unauthorized' });
    }

    const room = await Room.findOne({ _id: roomId, hostelId, floorId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found in this hostel/floor' });
    }

    if (room.vacantBeds <= 0) {
      return res.status(400).json({ message: 'No vacant beds available in this room' });
    }

    // Validate joinedDate before creating anything
    if (joinedDate && new Date(joinedDate) > new Date()) {
      return res.status(400).json({ message: 'joinedDate cannot be in the future' });
    }

    const now = new Date();
    const initialPaymentStatus = paymentStatus || 'pending';

    // Build feeStatus array covering every month from joinedDate to today
    // Past months: isPaid = true (assumed paid since tenant was active)
    // Current month: isPaid = false if paymentStatus is pending, true if paid
    const buildFeeStatus = (startDate, currentPaymentStatus) => {
      const feeStatus = [];
      if (!startDate) {
        // No joinedDate — just add current month
        feeStatus.push({ month: now.getMonth() + 1, year: now.getFullYear(), isPaid: currentPaymentStatus === 'paid' });
        return feeStatus;
      }
      const start = new Date(startDate);
      let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      while (cursor <= currentMonthStart) {
        const isCurrentMonth = cursor.getTime() === currentMonthStart.getTime();
        feeStatus.push({
          month: cursor.getMonth() + 1,
          year: cursor.getFullYear(),
          // past months = true, current month = based on paymentStatus
          isPaid: isCurrentMonth ? currentPaymentStatus === 'paid' : true,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
      return feeStatus;
    };

    const tenant = await Tenant.create({
      hostelId, floorId, roomId, name, phoneNumber,
      email, address, parentNumber, aadhaarNumber,
      occupation, joinedDate, monthlyFee, deposit,
      paymentStatus: initialPaymentStatus,
      feeStatus: buildFeeStatus(joinedDate, initialPaymentStatus),
    });

    // update room bed counts
    room.occupiedBeds += 1;
    room.vacantBeds -= 1;
    await room.save();

    // auto-generate 30-day payment cycles from joinedDate to today
    if (joinedDate && monthlyFee) {
      const cycles = [];
      let cycleStart = new Date(joinedDate);
      const today = new Date();
      while (cycleStart <= today) {
        const cycleEnd = new Date(cycleStart);
        cycleEnd.setDate(cycleEnd.getDate() + 30);
        cycles.push({
          hostelId: tenant.hostelId,
          tenantId: tenant._id,
          amount: tenant.monthlyFee,
          periodStart: new Date(cycleStart),
          periodEnd: new Date(cycleEnd),
          isPaid: false,
        });
        cycleStart = new Date(cycleEnd);
      }
      if (cycles.length > 0) await Payment.insertMany(cycles);
    }

    res.status(201).json({ message: 'Tenant created successfully', tenant });

    // send welcome email after response is sent
    if (tenant.email) {
      try {
        const dashboardLink = buildDashboardLink(tenant.hostelId, tenant._id);
        await sendWelcomeEmail({
          to:              tenant.email,
          tenantName:      tenant.name,
          hostelName:      hostel.hostelName,
          hostelOwnerName: hostel.ownerName,
          dashboardLink,
        });
        console.log(`[MAIL] Welcome email sent to ${tenant.email}`);
      } catch (mailErr) {
        console.error('[MAIL] Welcome email failed:', mailErr.message);
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/tenant/:hostelId
const getTenantsByHostel = async (req, res) => {
  try {
    const hostel = await verifyHostelOwner(req.params.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found or unauthorized' });
    }

    const tenants = await Tenant.find({ hostelId: req.params.hostelId })
      .populate('floorId', 'floorNumber')
      .populate('roomId', 'roomNumber roomType');

    res.status(200).json({ tenants });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/tenant/single/:tenantId
const getTenantById = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.tenantId)
      .populate('floorId', 'floorNumber')
      .populate('roomId', 'roomNumber roomType');

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const hostel = await verifyHostelOwner(tenant.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.status(200).json({ tenant });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/tenant/:tenantId
const updateTenant = async (req, res) => {
  try {
    const {
      name, phoneNumber, email, address, parentNumber,
      aadhaarNumber, occupation, joinedDate, monthlyFee,
      deposit, paymentStatus,
    } = req.body;

    const tenant = await Tenant.findById(req.params.tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const hostel = await verifyHostelOwner(tenant.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (name) tenant.name = name;
    if (phoneNumber) tenant.phoneNumber = phoneNumber;
    if (email) tenant.email = email;
    if (address) tenant.address = address;
    if (parentNumber) tenant.parentNumber = parentNumber;
    if (aadhaarNumber) tenant.aadhaarNumber = aadhaarNumber;
    if (occupation) tenant.occupation = occupation;
    if (joinedDate) tenant.joinedDate = joinedDate;
    if (monthlyFee !== undefined) tenant.monthlyFee = monthlyFee;
    if (deposit !== undefined) tenant.deposit = deposit;
    if (paymentStatus) tenant.paymentStatus = paymentStatus;

    await tenant.save();
    res.status(200).json({ message: 'Tenant updated successfully', tenant });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/tenant/:tenantId
const deleteTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const hostel = await verifyHostelOwner(tenant.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // update room bed counts
    const room = await Room.findById(tenant.roomId);
    if (room) {
      room.occupiedBeds = Math.max(0, room.occupiedBeds - 1);
      room.vacantBeds += 1;
      await room.save();
    }

    // delete all payment records for this tenant
    await Payment.deleteMany({ tenantId: tenant._id });

    await tenant.deleteOne();
    res.status(200).json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createTenant, getTenantsByHostel, getTenantById, updateTenant, deleteTenant };
