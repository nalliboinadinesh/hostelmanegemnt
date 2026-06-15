const cron = require('node-cron');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');

const startFeeStatusCron = () => {

  // Runs daily at 17:40 — generates next payment cycle for tenants whose current cycle ends today
  cron.schedule('40 17 * * *', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tenants = await Tenant.find({
        joinedDate: { $exists: true },
        monthlyFee: { $exists: true, $gt: 0 },
      });

      let generated = 0;

      for (const tenant of tenants) {
        // Find the latest cycle for this tenant
        const lastPayment = await Payment.findOne({ tenantId: tenant._id }).sort({ periodEnd: -1 });
        if (!lastPayment) continue;

        const periodEnd = new Date(lastPayment.periodEnd);
        periodEnd.setHours(0, 0, 0, 0);

        // Only generate if the last cycle ends today or earlier
        if (periodEnd <= today) {
          const nextStart = new Date(lastPayment.periodEnd);
          const nextEnd = new Date(nextStart);
          nextEnd.setDate(nextEnd.getDate() + 30);

          // Avoid duplicate
          const exists = await Payment.findOne({ tenantId: tenant._id, periodStart: nextStart });
          if (!exists) {
            await Payment.create({
              hostelId: tenant.hostelId,
              tenantId: tenant._id,
              amount: tenant.monthlyFee,
              periodStart: nextStart,
              periodEnd: nextEnd,
              isPaid: false,
            });
            generated++;
          }
        }
      }

      if (generated > 0) {
        console.log(`[CRON] Generated ${generated} new payment cycle(s) on ${today.toDateString()}`);
      }

      // Update feeStatus for current month/year for all tenants
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      await Tenant.updateMany(
        { feeStatus: { $not: { $elemMatch: { month, year } } } },
        { $push: { feeStatus: { month, year, isPaid: false } } }
      );

    } catch (error) {
      console.error('[CRON] Daily cron job failed:', error.message);
    }
  });

  console.log('[CRON] Daily payment cycle cron job scheduled at 17:40');
};

module.exports = startFeeStatusCron;
