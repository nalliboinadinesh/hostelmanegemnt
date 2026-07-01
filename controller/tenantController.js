const Tenant = require('../models/Tenant');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Payment = require('../models/Payment');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail, sendPaymentReminder } = require('../config/mailer');

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
  return `https://dashboard-frontend-five-rough.vercel.app/?token=${token}`;
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

    const isPaidDefault = (paymentStatus === 'paid' || paymentStatus === true || paymentStatus === 'true');
    const actualPaymentStatus = isPaidDefault ? 'paid' : 'pending';
    let paymentCycles = [];

    // Build feeStatus entries for every calendar month from joinedDate to now
    // so the tenant record reflects all months since they joined, not just current month
    const buildFeeStatus = (startDate) => {
      const entries = [];
      if (!startDate) {
        // No joinedDate — just add current month
        return [{ month: now.getMonth() + 1, year: now.getFullYear(), isPaid: isPaidDefault }];
      }
      const cursor = new Date(startDate);
      cursor.setDate(1); // normalize to 1st of month to avoid day-overflow issues
      cursor.setHours(0, 0, 0, 0);
      const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      endMonth.setHours(0, 0, 0, 0);
      while (cursor <= endMonth) {
        entries.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear(), isPaid: isPaidDefault });
        cursor.setMonth(cursor.getMonth() + 1);
      }
      return entries.length > 0 ? entries : [{ month: now.getMonth() + 1, year: now.getFullYear(), isPaid: isPaidDefault }];
    };

    const tenant = await Tenant.create({
      hostelId, floorId, roomId, name, phoneNumber,
      email, address, parentNumber, aadhaarNumber,
      occupation, joinedDate, monthlyFee, deposit,
      paymentStatus: actualPaymentStatus,
      feeStatus: buildFeeStatus(joinedDate),
    });

    // update room bed counts
    room.occupiedBeds += 1;
    room.vacantBeds -= 1;
    await room.save();

    // auto-generate 30-day payment cycles from joinedDate to today
    if (joinedDate && monthlyFee) {
      // BUG-06 FIX: reject future joinedDate — would silently create 0 cycles
      if (new Date(joinedDate) > new Date()) {
        return res.status(400).json({ message: 'joinedDate cannot be in the future' });
      }
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
          isPaid: isPaidDefault,
          paymentDate: isPaidDefault ? new Date() : undefined,
          paymentMethod: isPaidDefault ? 'Cash' : undefined,
        });
        cycleStart = new Date(cycleEnd);
      }
      if (cycles.length > 0) {
        await Payment.insertMany(cycles);
        paymentCycles = cycles;
      }
    }

    res.status(201).json({ message: 'Tenant created successfully', tenant });

    // send initial reminder if tenant created with pending payment
    if (tenant.email && !isPaidDefault && paymentCycles.length > 0) {
      try {
        const firstCycle = paymentCycles[0];
        const billingMonth = new Date(firstCycle.periodStart).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        await sendPaymentReminder({
          to:             tenant.email,
          tenantName:     tenant.name,
          amount:         firstCycle.amount,
          periodEnd:      firstCycle.periodEnd,
          hostelName:     hostel.hostelName,
          hostelOwnerName: hostel.ownerName,
          roomNumber:     room.roomNumber,
          billingMonth,
          upiId:          hostel?.upiId || null,
        });
        console.log(`[MAIL] Initial payment reminder sent to ${tenant.email}`);
      } catch (mailErr) {
        console.error('[MAIL] Initial payment reminder failed:', mailErr.message);
      }
    }

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
      deposit, paymentStatus, feeStatus, floorId, roomId,
    } = req.body;

    const tenant = await Tenant.findById(req.params.tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const hostel = await verifyHostelOwner(tenant.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // --- Handle room change: update bed counts on old and new room ---
    if (roomId && roomId.toString() !== tenant.roomId.toString()) {
      const newRoom = await Room.findOne({ _id: roomId, hostelId: tenant.hostelId });
      if (!newRoom) {
        return res.status(404).json({ message: 'New room not found in this hostel' });
      }
      if (newRoom.vacantBeds <= 0) {
        return res.status(400).json({ message: 'No vacant beds available in the new room' });
      }
      // free bed in old room
      const oldRoom = await Room.findById(tenant.roomId);
      if (oldRoom) {
        oldRoom.occupiedBeds = Math.max(0, oldRoom.occupiedBeds - 1);
        oldRoom.vacantBeds += 1;
        await oldRoom.save();
      }
      // occupy bed in new room
      newRoom.occupiedBeds += 1;
      newRoom.vacantBeds -= 1;
      await newRoom.save();
      tenant.roomId = roomId;
    }

    // --- Handle joinedDate change: regenerate payment cycles and feeStatus ---
    const joinedDateChanged = joinedDate && new Date(joinedDate).toISOString() !== new Date(tenant.joinedDate).toISOString();
    const monthlyFeeChanged = monthlyFee !== undefined && monthlyFee !== tenant.monthlyFee;

    if (joinedDateChanged && new Date(joinedDate) > new Date()) {
      return res.status(400).json({ message: 'joinedDate cannot be in the future' });
    }

    if (joinedDateChanged || monthlyFeeChanged) {
      const effectiveJoinedDate = joinedDate || tenant.joinedDate;
      const effectiveFee = monthlyFee !== undefined ? monthlyFee : tenant.monthlyFee;

      if (effectiveJoinedDate && effectiveFee) {
        // Delete old payment cycles and regenerate from new joinedDate
        await Payment.deleteMany({ tenantId: tenant._id });

        const cycles = [];
        let cycleStart = new Date(effectiveJoinedDate);
        const today = new Date();
        while (cycleStart <= today) {
          const cycleEnd = new Date(cycleStart);
          cycleEnd.setDate(cycleEnd.getDate() + 30);
          cycles.push({
            hostelId: tenant.hostelId,
            tenantId: tenant._id,
            amount: effectiveFee,
            periodStart: new Date(cycleStart),
            periodEnd: new Date(cycleEnd),
            isPaid: false,
          });
          cycleStart = new Date(cycleEnd);
        }
        if (cycles.length > 0) await Payment.insertMany(cycles);

        // Rebuild feeStatus from new joinedDate
        const now = new Date();
        const cursor = new Date(effectiveJoinedDate);
        cursor.setDate(1);
        cursor.setHours(0, 0, 0, 0);
        const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        endMonth.setHours(0, 0, 0, 0);
        const feeEntries = [];
        while (cursor <= endMonth) {
          feeEntries.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear(), isPaid: false });
          cursor.setMonth(cursor.getMonth() + 1);
        }
        tenant.feeStatus = feeEntries.length > 0
          ? feeEntries
          : [{ month: now.getMonth() + 1, year: now.getFullYear(), isPaid: false }];

        // Default to pending after regeneration, but allow paymentStatus override below
        tenant.paymentStatus = 'pending';
        tenant.markModified('feeStatus');
      }
    }

    // --- Update all simple fields ---
    if (name)                        tenant.name = name;
    if (phoneNumber)                 tenant.phoneNumber = phoneNumber;
    if (email !== undefined)         tenant.email = email;
    if (address !== undefined)       tenant.address = address;
    if (parentNumber !== undefined)  tenant.parentNumber = parentNumber;
    if (aadhaarNumber !== undefined) tenant.aadhaarNumber = aadhaarNumber;
    if (occupation !== undefined)    tenant.occupation = occupation;
    if (joinedDate)                  tenant.joinedDate = joinedDate;
    if (monthlyFee !== undefined)    tenant.monthlyFee = monthlyFee;
    if (deposit !== undefined)       tenant.deposit = deposit;
    if (floorId)                     tenant.floorId = floorId;

    // --- Synchronize paymentStatus, feeStatus and Payment collection ---
    let targetPaymentStatus = undefined;
    if (paymentStatus !== undefined) {
      if (paymentStatus === 'paid' || paymentStatus === true || paymentStatus === 'true') {
        targetPaymentStatus = 'paid';
      } else if (paymentStatus === 'pending' || paymentStatus === false || paymentStatus === 'false') {
        targetPaymentStatus = 'pending';
      }
    }

    if (targetPaymentStatus !== undefined) {
      // 1. paymentStatus has been explicitly changed
      if (targetPaymentStatus === 'paid') {
        // Mark all payments as paid
        await Payment.updateMany(
          { tenantId: tenant._id },
          {
            $set: {
              isPaid: true,
              paymentDate: new Date(),
              paymentMethod: 'Cash',
            }
          }
        );
        // Mark all feeStatus entries as paid
        tenant.feeStatus.forEach(f => {
          f.isPaid = true;
        });
        tenant.paymentStatus = 'paid';
        tenant.markModified('feeStatus');
      } else {
        // Mark all payments as unpaid
        await Payment.updateMany(
          { tenantId: tenant._id },
          {
            $set: {
              isPaid: false,
            },
            $unset: {
              paymentDate: "",
              paymentMethod: "",
            }
          }
        );
        // Mark all feeStatus entries as unpaid
        tenant.feeStatus.forEach(f => {
          f.isPaid = false;
        });
        tenant.paymentStatus = 'pending';
        tenant.markModified('feeStatus');
      }
    } else if (feeStatus !== undefined && Array.isArray(feeStatus)) {
      // 2. feeStatus array has been explicitly updated directly
      const tenantPayments = await Payment.find({ tenantId: tenant._id });

      const parsedFeeStatus = feeStatus.map(f => ({
        month: Number(f.month),
        year: Number(f.year),
        isPaid: f.isPaid === true || f.isPaid === 'true'
      }));

      for (const fee of parsedFeeStatus) {
        const { month, year, isPaid } = fee;
        // Find matching payments in-memory
        const matchingPayments = tenantPayments.filter(p => {
          const pStart = new Date(p.periodStart);
          return (pStart.getMonth() + 1) === month && pStart.getFullYear() === year;
        });

        for (const p of matchingPayments) {
          p.isPaid = isPaid;
          if (isPaid) {
            if (!p.paymentDate) p.paymentDate = new Date();
            if (!p.paymentMethod) p.paymentMethod = 'Cash';
          } else {
            p.paymentDate = undefined;
            p.paymentMethod = undefined;
          }
        }
      }

      // Save modified payments
      await Promise.all(tenantPayments.map(p => p.save()));

      // Update tenant feeStatus
      tenant.feeStatus = parsedFeeStatus;
      tenant.markModified('feeStatus');

      // Re-evaluate overall paymentStatus
      tenant.paymentStatus = tenant.feeStatus.length > 0 && tenant.feeStatus.every(f => f.isPaid)
        ? 'paid'
        : 'pending';
    }

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
