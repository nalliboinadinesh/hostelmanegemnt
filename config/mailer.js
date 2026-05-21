const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * Send a payment reminder email to a tenant.
 * @param {Object} options
 * @param {string} options.to         - Tenant email address
 * @param {string} options.tenantName - Tenant's name
 * @param {number} options.amount     - Due amount
 * @param {Date}   options.periodStart - Cycle start date
 * @param {Date}   options.periodEnd   - Cycle end date
 * @param {string} options.hostelName  - Hostel name
 */
const sendPaymentReminder = async ({ to, tenantName, amount, periodEnd, hostelName, hostelOwnerName, roomNumber }) => {
  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Reminder</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial, sans-serif;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff; margin-top:30px; border-radius:10px; overflow:hidden;">
          <!-- Header -->
          <tr>
            <td align="center" style="background:#2563eb; padding:25px; color:white;">
              <h1 style="margin:0;">Hostel Payment Reminder</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:35px; color:#333333;">
              <h2>Hello ${tenantName},</h2>
              <p style="font-size:16px; line-height:1.6;">
                This is a friendly reminder that your hostel fee payment is still pending.
              </p>
              <!-- Payment Details -->
              <table width="100%" cellpadding="10" cellspacing="0"
                     style="margin-top:20px; border-collapse:collapse;">
                <tr style="background:#f3f4f6;">
                  <td><strong>Room Number</strong></td>
                  <td>${roomNumber}</td>
                </tr>
                <tr>
                  <td><strong>Amount Due</strong></td>
                  <td>₹${amount}</td>
                </tr>
                <tr style="background:#f3f4f6;">
                  <td><strong>Due Date</strong></td>
                  <td>${fmt(periodEnd)}</td>
                </tr>
                <tr>
                  <td><strong>Hostel Name</strong></td>
                  <td>${hostelName}</td>
                </tr>
              </table>
              <!-- Note -->
              <p style="margin-top:35px; font-size:14px; color:#666;">
                Kindly make the payment before the due date to avoid late charges.
              </p>
              <p style="font-size:15px;">
                Thank you,<br>
                <strong>${hostelOwnerName}</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center"
                style="background:#f3f4f6; padding:18px; font-size:13px; color:#666;">
              © 2026 ${hostelName}. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const mailOptions = {
    from: `"${hostelName}" <${process.env.MAIL_USER}>`,
    to,
    subject: `Payment Reminder — ₹${amount} due | ${hostelName}`,
    html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendPaymentReminder };
