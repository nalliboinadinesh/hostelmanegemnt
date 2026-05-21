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

    const result = await Promise.all(
      tenants.map(async (tenant) => {
        const payments = await Payment.find({ tenantId: tenant._id }).sort({ periodStart: 1 });
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
      })
    );

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

    await payment.save();

    // --- Sync feeStatus + paymentStatus on the tenant ---
    if (isPaid !== undefined) {
      const tenant = await Tenant.findById(payment.tenantId);
      if (tenant) {
        // Derive the month/year this payment cycle belongs to (use periodStart)
        const cycleMonth = new Date(payment.periodStart).getMonth() + 1;
        const cycleYear  = new Date(payment.periodStart).getFullYear();

        // Update the matching feeStatus entry, or push one if missing
        const entry = tenant.feeStatus.find(f => f.month === cycleMonth && f.year === cycleYear);
        if (entry) {
          entry.isPaid = payment.isPaid;
        } else {
          tenant.feeStatus.push({ month: cycleMonth, year: cycleYear, isPaid: payment.isPaid });
        }

        // paymentStatus = 'paid' only if every feeStatus entry is paid, else 'pending'
        tenant.paymentStatus = tenant.feeStatus.every(f => f.isPaid) ? 'paid' : 'pending';

        tenant.markModified('feeStatus');
        await tenant.save();
      }
    }
    // --- end sync ---

    res.status(200).json({ message: 'Payment updated successfully', payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPaymentsByTenant, getPaymentsByHostel, updatePayment };
