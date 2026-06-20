const Payment = require('../models/Payment');
const Tenant = require('../models/Tenant');
const Hostel = require('../models/Hostel');

const verifyHostelOwner = async (hostelId, ownerId) => {
  return await Hostel.findOne({ _id: hostelId, ownerId });
};

// GET /api/payment/:tenantId
// Returns all 30-day payment cycles with paid/unpaid status
const getPaymentsByTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const hostel = await verifyHostelOwner(tenant.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const payments = await Payment.find({ tenantId: tenant._id }).sort({ periodStart: 1 });

    const summary = {
      tenantId: tenant._id,
      tenantName: tenant.name,
      monthlyFee: tenant.monthlyFee,
      joinedDate: tenant.joinedDate,
      totalCycles: payments.length,
      paid: payments.filter(p => p.isPaid).length,
      unpaid: payments.filter(p => !p.isPaid).length,
      cycles: payments.map(p => ({
        _id: p._id,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        amount: p.amount,
        isPaid: p.isPaid,
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
        note: p.note,
      })),
    };

    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/payment/hostel/:hostelId
// Returns all tenants with their payment summary
const getPaymentsByHostel = async (req, res) => {
  try {
    const hostel = await verifyHostelOwner(req.params.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found or unauthorized' });
    }

    const tenants = await Tenant.find({ hostelId: req.params.hostelId }, 'name phoneNumber joinedDate monthlyFee');

    // BUG-07 FIX: fetch all payments in one query and group in memory (was N+1 queries)
    const tenantIds = tenants.map(t => t._id);
    const allPayments = await Payment.find({ tenantId: { $in: tenantIds } }).sort({ periodStart: 1 }).lean();

    const paymentMap = {};
    for (const p of allPayments) {
      const tid = p.tenantId.toString();
      if (!paymentMap[tid]) paymentMap[tid] = [];
      paymentMap[tid].push(p);
    }

    const result = tenants.map(tenant => {
      const payments = paymentMap[tenant._id.toString()] || [];
      return {
        tenantId: tenant._id,
        tenantName: tenant.name,
        phoneNumber: tenant.phoneNumber,
        joinedDate: tenant.joinedDate,
        monthlyFee: tenant.monthlyFee,
        paid: payments.filter(p => p.isPaid).length,
        unpaid: payments.filter(p => !p.isPaid).length,
        cycles: payments.map(p => ({
          _id: p._id,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          amount: p.amount,
          isPaid: p.isPaid,
          paymentMethod: p.paymentMethod,
          paymentDate: p.paymentDate,
          note: p.note,
        })),
      };
    });

    res.status(200).json({ payments: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/payment/:paymentId
const updatePayment = async (req, res) => {
  try {
    const { isPaid, paymentMethod, paymentDate, amount, note } = req.body;

    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const hostel = await verifyHostelOwner(payment.hostelId, req.owner._id);
    if (!hostel) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (isPaid !== undefined) payment.isPaid = isPaid;
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (paymentDate) payment.paymentDate = new Date(paymentDate);
    if (amount !== undefined) payment.amount = amount;
    if (note) payment.note = note;

    // auto-set paymentDate to now when marking paid with no date provided
    if (isPaid === true && !paymentDate && !payment.paymentDate) {
      payment.paymentDate = new Date();
    }
    // if marking unpaid, clear paymentDate and paymentMethod
    if (isPaid === false) {
      payment.paymentDate = undefined;
      payment.paymentMethod = undefined;
    }

    await payment.save();

    // --- Cascade: when marking a payment as PAID, also mark all earlier unpaid cycles as paid ---
    if (isPaid === true) {
      // Find all unpaid cycles for this tenant that started BEFORE this cycle
      const previousUnpaid = await Payment.find({
        tenantId: payment.tenantId,
        isPaid: false,
        periodStart: { $lt: payment.periodStart },
      });

      if (previousUnpaid.length > 0) {
        const autoPayDate = payment.paymentDate || new Date();
        await Payment.updateMany(
          {
            tenantId: payment.tenantId,
            isPaid: false,
            periodStart: { $lt: payment.periodStart },
          },
          {
            $set: {
              isPaid: true,
              paymentDate: autoPayDate,
              paymentMethod: payment.paymentMethod || 'Cash',
              note: 'Auto-marked paid with current month',
            },
          }
        );
      }
    }
    // --- end cascade ---

    // --- Rebuild feeStatus + paymentStatus from scratch using all Payment records ---
    // Fetch AFTER cascade so updated cycles are included
    const tenant = await Tenant.findById(payment.tenantId);
    if (tenant) {
      const allPayments = await Payment.find({ tenantId: tenant._id }).lean();

      // Group all cycles by calendar month, then mark month paid only if ALL cycles in that month are paid
      const feeMap = {};
      for (const p of allPayments) {
        const m = new Date(p.periodStart).getMonth() + 1;
        const y = new Date(p.periodStart).getFullYear();
        const key = `${y}-${m}`;
        if (!(key in feeMap)) {
          feeMap[key] = { month: m, year: y, allPaid: true };
        }
        // if ANY cycle in this month is unpaid, the whole month is unpaid
        if (!p.isPaid) feeMap[key].allPaid = false;
      }

      tenant.feeStatus = Object.values(feeMap)
        .map(e => ({ month: e.month, year: e.year, isPaid: e.allPaid }))
        .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

      // paymentStatus = 'paid' only if EVERY month entry is paid
      tenant.paymentStatus = tenant.feeStatus.length > 0 && tenant.feeStatus.every(f => f.isPaid)
        ? 'paid'
        : 'pending';

      tenant.markModified('feeStatus');
      await tenant.save();
    }
    // --- end sync ---

    res.status(200).json({ message: 'Payment updated successfully', payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPaymentsByTenant, getPaymentsByHostel, updatePayment };
