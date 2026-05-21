const cron = require('node-cron');
const Payment = require('../models/Payment');
const Tenant = require('../models/Tenant');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const { sendPaymentReminder } = require('../config/mailer');

/**
 * Payment Reminder Cron
 * Schedule: every day at 12:00 PM
 *
 * Logic:
 * - Find all unpaid payment cycles whose periodStart <= today (i.e. already started)
 * - Group by tenant — one email per tenant showing total outstanding
 * - Skip tenants with no email
 * - Repeats daily until isPaid: true
 */
const startPaymentReminderCron = () => {
  cron.schedule('0 12 * * *', async () => {
    console.log(`[REMINDER] Running payment reminder cron at ${new Date().toISOString()}`);

    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // All unpaid cycles that have already started
      const unpaidPayments = await Payment.find({
        isPaid: false,
        periodStart: { $lte: today },
      }).lean();

      if (!unpaidPayments.length) {
        console.log('[REMINDER] No unpaid payments found. Skipping.');
        return;
      }

      // Group by tenantId — one email per tenant even if multiple cycles are due
      const tenantMap = new Map();
      for (const payment of unpaidPayments) {
        const tid = payment.tenantId.toString();
        if (!tenantMap.has(tid)) {
          tenantMap.set(tid, { hostelId: payment.hostelId, cycles: [] });
        }
        tenantMap.get(tid).cycles.push(payment);
      }

      let sent = 0;
      let skipped = 0;

      for (const [tenantId, { hostelId, cycles }] of tenantMap) {
        const tenant = await Tenant.findById(tenantId).lean();
        if (!tenant || !tenant.email) { skipped++; continue; }

        const [hostel, room] = await Promise.all([
          Hostel.findById(hostelId).lean(),
          Room.findById(tenant.roomId).lean(),
        ]);

        const hostelName     = hostel ? hostel.hostelName  : 'Hostel';
        const hostelOwnerName = hostel ? hostel.ownerName  : 'Management';
        const roomNumber     = room   ? room.roomNumber    : 'N/A';

        // Total outstanding across all due cycles
        const totalDue = cycles.reduce((sum, c) => sum + c.amount, 0);

        // Earliest unpaid cycle for due date display
        const earliest = cycles.sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart))[0];

        try {
          await sendPaymentReminder({
            to:             tenant.email,
            tenantName:     tenant.name,
            amount:         totalDue,
            periodEnd:      earliest.periodEnd,
            hostelName,
            hostelOwnerName,
            roomNumber,
          });
          sent++;
          console.log(`[REMINDER] Sent to ${tenant.email} (${tenant.name}) — ₹${totalDue} due`);
        } catch (mailErr) {
          console.error(`[REMINDER] Failed to send to ${tenant.email}:`, mailErr.message);
        }
      }

      console.log(`[REMINDER] Done — ${sent} sent, ${skipped} skipped (no email)`);
    } catch (error) {
      console.error('[REMINDER] Cron job failed:', error.message);
    }
  });

  console.log('[REMINDER] Payment reminder cron scheduled (daily at 12:00 PM)');
};

module.exports = startPaymentReminderCron;
