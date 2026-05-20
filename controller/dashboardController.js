const Hostel = require('../models/Hostel');
const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const Payment = require('../models/Payment');

// Helper: build stats for a single hostel
const getHostelStats = async (hostelId, today, monthStart, monthEnd) => {
  const hostelObjId = hostelId;

  // Tenant counts
  const totalTenants = await Tenant.countDocuments({ hostelId: hostelObjId });

  // Room bed stats
  const roomAgg = await Room.aggregate([
    { $match: { hostelId: hostelObjId } },
    {
      $group: {
        _id: null,
        totalBeds: { $sum: '$totalBeds' },
        occupiedBeds: { $sum: '$occupiedBeds' },
        vacantBeds: { $sum: '$vacantBeds' },
      },
    },
  ]);
  const bedStats = roomAgg[0] || { totalBeds: 0, occupiedBeds: 0, vacantBeds: 0 };

  // Today's collections — payments where paymentDate is today and isPaid = true
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const todayAgg = await Payment.aggregate([
    {
      $match: {
        hostelId: hostelObjId,
        isPaid: true,
        paymentDate: { $gte: todayStart, $lte: todayEnd },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const todayCollection = todayAgg[0] || { total: 0, count: 0 };

  // Monthly collections — payments where paymentDate is in current month and isPaid = true
  const monthlyAgg = await Payment.aggregate([
    {
      $match: {
        hostelId: hostelObjId,
        isPaid: true,
        paymentDate: { $gte: monthStart, $lte: monthEnd },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const monthlyCollection = monthlyAgg[0] || { total: 0, count: 0 };

  // Total dues — unpaid cycles whose periodEnd has passed (overdue)
  const duesAgg = await Payment.aggregate([
    {
      $match: {
        hostelId: hostelObjId,
        isPaid: false,
        periodEnd: { $lte: todayEnd },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const totalDues = duesAgg[0] || { total: 0, count: 0 };

  // Paid tenants — tenants who have at least one paid cycle this month
  const paidTenantIds = await Payment.distinct('tenantId', {
    hostelId: hostelObjId,
    isPaid: true,
    paymentDate: { $gte: monthStart, $lte: monthEnd },
  });
  const paidTenants = paidTenantIds.length;
  const unpaidTenants = totalTenants - paidTenants;

  return {
    totalTenants,
    totalBeds: bedStats.totalBeds,
    occupiedBeds: bedStats.occupiedBeds,
    vacantBeds: bedStats.vacantBeds,
    todayCollection: {
      amount: todayCollection.total,
      count: todayCollection.count,
    },
    monthlyCollection: {
      amount: monthlyCollection.total,
      count: monthlyCollection.count,
    },
    totalDues: {
      amount: totalDues.total,
      count: totalDues.count,
    },
    paidTenants,
    unpaidTenants,
  };
};

// GET /api/dashboard
// Overall stats for the owner + branch-wise breakdown
const getDashboard = async (req, res) => {
  try {
    const hostels = await Hostel.find({ ownerId: req.owner._id });

    if (hostels.length === 0) {
      return res.status(200).json({
        overall: {
          totalHostels: 0, totalTenants: 0, totalBeds: 0,
          occupiedBeds: 0, vacantBeds: 0,
          todayCollection: { amount: 0, count: 0 },
          monthlyCollection: { amount: 0, count: 0 },
          totalDues: { amount: 0, count: 0 },
          paidTenants: 0, unpaidTenants: 0,
        },
        branches: [],
      });
    }

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Build branch-wise stats in parallel
    const branches = await Promise.all(
      hostels.map(async (hostel) => {
        const stats = await getHostelStats(hostel._id, today, monthStart, monthEnd);
        return {
          hostelId: hostel._id,
          hostelName: hostel.hostelName,
          hostelType: hostel.hostelType,
          ...stats,
        };
      })
    );

    // Aggregate overall totals
    const overall = branches.reduce(
      (acc, b) => {
        acc.totalTenants += b.totalTenants;
        acc.totalBeds += b.totalBeds;
        acc.occupiedBeds += b.occupiedBeds;
        acc.vacantBeds += b.vacantBeds;
        acc.todayCollection.amount += b.todayCollection.amount;
        acc.todayCollection.count += b.todayCollection.count;
        acc.monthlyCollection.amount += b.monthlyCollection.amount;
        acc.monthlyCollection.count += b.monthlyCollection.count;
        acc.totalDues.amount += b.totalDues.amount;
        acc.totalDues.count += b.totalDues.count;
        acc.paidTenants += b.paidTenants;
        acc.unpaidTenants += b.unpaidTenants;
        return acc;
      },
      {
        totalHostels: hostels.length,
        totalTenants: 0, totalBeds: 0, occupiedBeds: 0, vacantBeds: 0,
        todayCollection: { amount: 0, count: 0 },
        monthlyCollection: { amount: 0, count: 0 },
        totalDues: { amount: 0, count: 0 },
        paidTenants: 0, unpaidTenants: 0,
      }
    );

    res.status(200).json({ overall, branches });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboard };
