const Hostel = require('../models/Hostel');
const Owner = require('../models/Owner');
const Floor = require('../models/Floor');
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Announcement = require('../models/Announcement');
const Complaint = require('../models/Complaint');
const TemporaryTenant = require('../models/TemporaryTenant');

// helper — build analytics for a list of hostelIds
const buildAnalytics = async (hostelIds) => {
  const now = new Date();

  // today's date range (midnight → midnight)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  // current month range
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [payments, tenants, rooms] = await Promise.all([
    Payment.find({ hostelId: { $in: hostelIds } }).lean(),
    Tenant.find({ hostelId: { $in: hostelIds } }, 'hostelId monthlyFee').lean(),
    Room.find({ hostelId: { $in: hostelIds } }, 'hostelId vacantBeds totalBeds occupiedBeds').lean(),
  ]);

  const calcStats = (filteredPayments, filteredTenants, filteredRooms) => {
    const todayCollection = filteredPayments
      .filter(p => p.isPaid && p.paymentDate >= todayStart && p.paymentDate < todayEnd)
      .reduce((sum, p) => sum + p.amount, 0);

    const monthlyCollection = filteredPayments
      .filter(p => p.isPaid && p.paymentDate >= monthStart && p.paymentDate < monthEnd)
      .reduce((sum, p) => sum + p.amount, 0);

    const totalDues = filteredPayments
      .filter(p => !p.isPaid)
      .reduce((sum, p) => sum + p.amount, 0);

    const vacantBeds = filteredRooms.reduce((sum, r) => sum + (r.vacantBeds || 0), 0);
    const totalBeds  = filteredRooms.reduce((sum, r) => sum + (r.totalBeds || 0), 0);
    const occupiedBeds = filteredRooms.reduce((sum, r) => sum + (r.occupiedBeds || 0), 0);

    // paid tenants = tenants who have at least one paid payment this month
    const paidTenantIds = new Set(
      filteredPayments
        .filter(p => p.isPaid && p.paymentDate >= monthStart && p.paymentDate < monthEnd)
        .map(p => p.tenantId.toString())
    );
    const allTenantIds = new Set(filteredTenants.map(t => t._id.toString()));
    const paidTenants   = paidTenantIds.size;
    const unpaidTenants = allTenantIds.size - paidTenantIds.size;

    return {
      todayCollection,
      monthlyCollection,
      totalDues,
      totalTenants: filteredTenants.length,
      vacantBeds,
      totalBeds,
      occupiedBeds,
      paidTenants,
      unpaidTenants,
    };
  };

  return { payments, tenants, rooms, calcStats };
};

// GET /api/hostel/analytics
const getOwnerAnalytics = async (req, res) => {
  try {
    const hostels = await Hostel.find({ ownerId: req.owner._id }).lean();
    if (!hostels.length) {
      return res.status(200).json({ overall: {}, hostels: [] });
    }

    const hostelIds = hostels.map(h => h._id);
    const { payments, tenants, rooms, calcStats } = await buildAnalytics(hostelIds);

    // overall stats across all hostels
    const overall = calcStats(payments, tenants, rooms);

    // per-hostel breakdown
    const hostelBreakdown = hostels.map(hostel => {
      const hid = hostel._id.toString();
      const hPayments = payments.filter(p => p.hostelId.toString() === hid);
      const hTenants  = tenants.filter(t => t.hostelId.toString() === hid);
      const hRooms    = rooms.filter(r => r.hostelId.toString() === hid);
      const stats     = calcStats(hPayments, hTenants, hRooms);

      return {
        hostelId:   hostel._id,
        hostelName: hostel.hostelName,
        hostelType: hostel.hostelType,
        ...stats,
      };
    });

    res.status(200).json({ overall, hostels: hostelBreakdown });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


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

    const hostelId = hostel._id;

    // cascade delete everything tied to this hostel
    await Promise.all([
      Floor.deleteMany({ hostelId }),
      Room.deleteMany({ hostelId }),
      Tenant.deleteMany({ hostelId }),
      Payment.deleteMany({ hostelId }),
      Expense.deleteMany({ hostelId }),
      Announcement.deleteMany({ hostelId }),
      Complaint.deleteMany({ hostelId }),
      TemporaryTenant.deleteMany({ hostelId }),
    ]);

    await hostel.deleteOne();

    // update owner.isExisted if no hostels remain
    const remaining = await Hostel.countDocuments({ ownerId: req.owner._id });
    await Owner.findByIdAndUpdate(req.owner._id, { isExisted: remaining > 0 });

    res.status(200).json({ message: 'Hostel and all related data deleted successfully' });
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

module.exports = { createHostel, getHostelsByOwner, getHostelById, deleteHostel, updateHostel, getOwnerAnalytics };
