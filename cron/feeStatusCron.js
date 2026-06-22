const cron = require('node-cron');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');

/**
 * Fee Status Cron — daily at 17:40 UTC
 *
 * BUG-3 FIX: Skip generating new cycles for tenants whose paymentStatus is 'paid'.
 *   Previously, a new unpaid cycle was generated every month even for paid tenants,
 *   immediately resetting their paymentStatus back to 'pending'.
 *
 * BUG-4 FIX: New feeStatus entry is pushed with isPaid matching the tenant's paymentStatus,
 *   not hardcoded false. Paid tenants get isPaid: true for the new month.
 *
 * BUG-7 FIX: Replaced per-tenant Payment queries with a single batch query grouped in memory.
 *   Was firing 2 queries per tenant (find latest + check duplicate). Now 1 query total.
 */
const startFeeStatusCron = () => {

  cron.schedule('40 17 * * *', async () => {
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const tenants = await Tenant.find({
        joinedDate: { $exists: true },
        monthlyFee: { $exists: true, $gt: 0 },
      });

      if (!tenants.length) return;

      const tenantIds = tenants.map(t => t._id);

      // BUG-7 FIX: batch fetch latest payment per tenant in one query
      // Get all payments sorted desc by periodEnd, then pick the first per tenant
      const allPayments = await Payment.find({ tenantId: { $in: tenantIds } })
        .sort({ periodEnd: -1 })
        .lean();

      // Build maps: latest payment per tenant + set of existing periodStarts per tenant
      const latestPaymentMap = {};
      const existingStartsMap = {};
      for (const p of allPayments) {
        const tid = p.tenantId.toString();
        if (!latestPaymentMap[tid]) {
          latestPaymentMap[tid] = p; // first one (sorted desc) = latest
        }
        if (!existingStartsMap[tid]) existingStartsMap[tid] = new Set();
        existingStartsMap[tid].add(new Date(p.periodStart).getTime());
      }

      let generated = 0;
      const newCycles = [];

      for (const tenant of tenants) {
        // BUG-3 FIX: skip cycle generation for tenants already fully paid
        // (new unpaid cycle was resetting paymentStatus back to 'pending' every month)
        if (tenant.paymentStatus === 'paid') continue;

        const lastPayment = latestPaymentMap[tenant._id.toString()];
        if (!lastPayment) continue;

        const periodEnd = new Date(lastPayment.periodEnd);

        if (periodEnd <= today) {
          const nextStart = new Date(lastPayment.periodEnd);
          const nextEnd = new Date(nextStart);
          nextEnd.setDate(nextEnd.getDate() + 30);

          // BUG-7 FIX: check duplicate using in-memory set instead of DB query
          const existingStarts = existingStartsMap[tenant._id.toString()] || new Set();
          if (!existingStarts.has(nextStart.getTime())) {
            newCycles.push({
              hostelId: tenant.hostelId,
              tenantId: tenant._id,
              amount: tenant.monthlyFee,
              periodStart: new Date(nextStart),
              periodEnd: new Date(nextEnd),
              isPaid: false,
            });
            generated++;
          }
        }
      }

      if (newCycles.length > 0) {
        await Payment.insertMany(newCycles);
        console.log(`[CRON] Generated ${generated} new payment cycle(s) on ${new Date().toDateString()}`);
      }

      // Update feeStatus for current month/year
      // BUG-4 FIX: do not push isPaid: false blindly for all tenants.
      // For tenants with paymentStatus 'paid', push isPaid: true.
      // For pending tenants, push isPaid: false.
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Push isPaid: false for pending tenants missing this month
      await Tenant.updateMany(
        {
          paymentStatus: { $ne: 'paid' },
          feeStatus: { $not: { $elemMatch: { month, year } } },
        },
        { $push: { feeStatus: { month, year, isPaid: false } } }
      );

      // BUG-4 FIX: Push isPaid: true for paid tenants missing this month entry
      await Tenant.updateMany(
        {
          paymentStatus: 'paid',
          feeStatus: { $not: { $elemMatch: { month, year } } },
        },
        { $push: { feeStatus: { month, year, isPaid: true } } }
      );

    } catch (error) {
      console.error('[CRON] Daily cron job failed:', error.message);
    }
  });

  console.log('[CRON] Daily payment cycle cron job scheduled at 17:40');
};

module.exports = startFeeStatusCron;
