const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const Hostel = require('../models/Hostel');
const Payment = require('../models/Payment');

const verifyHostelOwner = async (hostelId, ownerId) => {
  return await Hostel.findOne({ _id: hostelId, ownerId });
};

const incrementOccupied = async (roomId) => {
  const room = await Room.findById(roomId);
  if (room && room.vacantBeds > 0) {
    room.occupiedBeds += 1;
    room.vacantBeds -= 1;
    await room.save();
  }
};

const decrementOccupied = async (roomId) => {
  const room = await Room.findById(roomId);
  if (room && room.occupiedBeds > 0) {
    room.occupiedBeds -= 1;
    room.vacantBeds += 1;
    await room.save();
  }
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

    const now = new Date();
    const tenant = await Tenant.create({
      hostelId, floorId, roomId, name, phoneNumber,
      email, address, parentNumber, aadhaarNumber,
      occupation, joinedDate, monthlyFee, deposit,
      paymentStatus: paymentStatus || 'pending',
      feeStatus: [{ month: now.getMonth() + 1, year: now.getFullYear(), isPaid: false }],
    });

    await incrementOccupied(roomId);

    // Generate payment cycles every 30 days from joinedDate up to today
    if (tenant.joinedDate && tenant.monthlyFee) {
      const cycles = [];
      let cycleStart = new Date(tenant.joinedDate);
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

    await decrementOccupied(tenant.roomId);
    await tenant.deleteOne();

    res.status(200).json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createTenant, getTenantsByHostel, getTenantById, updateTenant, deleteTenant };
