const cron = require('node-cron');
const Payment = require('../models/Payment');
const Tenant = require('../models/Tenant');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const { sendPaymentReminder } = require('../config/mailer');

/**
 * Payment Reminder Cron — daily at 12:00 PM UTC
 *
 * BUG-6 FIX: Replaced N+1 per-tenant DB queries with batch fetches outside the loop.
 * For 50 overdue tenants, was firing ~150 queries. Now fires 4 total.
 *
 * Logic:
 * - Find all unpaid cycles whose periodEnd has passed (genuinely overdue)
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

      // Only remind for cycles whose periodEnd has passed (genuinely overdue)
      const unpaidPayments = await Payment.find({
        isPaid: false,
        periodEnd: { $lte: today },
      }).lean();

      if (!unpaidPayments.length) {
        console.log('[REMINDER] No unpaid payments found. Skipping.');
        return;
      }

      // Group by tenantId — one entry per tenant with all overdue cycles
      const tenantMap = new Map();
      for (const payment of unpaidPayments) {
        const tid = payment.tenantId.toString();
        if (!tenantMap.has(tid)) {
          tenantMap.set(tid, { hostelId: payment.hostelId, cycles: [] });
        }
        tenantMap.get(tid).cycles.push(payment);
      }

      const tenantIds = [...tenantMap.keys()];

      // BUG-6 FIX: batch fetch all tenants, hostels, rooms in 3 queries instead of N*3
      const [tenants, hostels, rooms] = await Promise.all([
        Tenant.find({ _id: { $in: tenantIds } }, 'name email roomId hostelId').lean(),
        Hostel.find({}).lean(),
        Room.find({}).lean(),
      ]);

      const tenantById  = Object.fromEntries(tenants.map(t => [t._id.toString(), t]));
      const hostelById  = Object.fromEntries(hostels.map(h => [h._id.toString(), h]));
      const roomById    = Object.fromEntries(rooms.map(r => [r._id.toString(), r]));

      let sent = 0;
      let skipped = 0;

      for (const [tenantId, { hostelId, cycles }] of tenantMap) {
        const tenant = tenantById[tenantId];
        if (!tenant || !tenant.email) { skipped++; continue; }

        const hostel = hostelById[hostelId.toString()];
        const room   = roomById[tenant.roomId?.toString()];

        const hostelName      = hostel?.hostelName  || 'Hostel';
        const hostelOwnerName = hostel?.ownerName   || 'Management';
        const roomNumber      = room?.roomNumber    || 'N/A';

        // Total outstanding across all overdue cycles
        const totalDue = cycles.reduce((sum, c) => sum + c.amount, 0);

        // Earliest unpaid cycle for due date display
        const earliest = [...cycles].sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart))[0];

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
