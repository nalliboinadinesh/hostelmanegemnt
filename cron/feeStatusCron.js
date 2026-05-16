const cron = require('node-cron');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');

// Runs at 00:00 on the 1st of every month
const startFeeStatusCron = () => {
  cron.schedule('0 0 1 * *', async () => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // 1. Reset feeStatus for all tenants
      await Tenant.updateMany(
        { feeStatus: { $not: { $elemMatch: { month, year } } } },
        { $push: { feeStatus: { month, year, isPaid: false } } }
      );
      console.log(`[CRON] Fee status reset for ${month}/${year}`);

      // 2. Generate next payment cycle for each tenant
      const tenants = await Tenant.find({ joinedDate: { $exists: true }, monthlyFee: { $exists: true } });

      for (const tenant of tenants) {
        // Find the latest payment cycle for this tenant
        const lastPayment = await Payment.findOne({ tenantId: tenant._id }).sort({ periodEnd: -1 });

        if (lastPayment) {
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
          }
        }
      }

      console.log(`[CRON] Payment cycles generated for ${month}/${year}`);
    } catch (error) {
      console.error('[CRON] Cron job failed:', error.message);
    }
  });

  console.log('[CRON] Fee status cron job scheduled');
};

module.exports = startFeeStatusCron;
