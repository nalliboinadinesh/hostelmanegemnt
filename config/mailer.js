const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const mailFrom = process.env.MAIL_FROM || process.env.MAIL_USER;
const normalizedMailFrom = mailFrom ? mailFrom.trim().replace(/^"(.*)"$/, '$1').trim() : '';
const defaultFrom = normalizedMailFrom.includes('<') ? normalizedMailFrom : `"Hostel Management" <${normalizedMailFrom}>`;
const mailReplyTo = process.env.MAIL_REPLY_TO || normalizedMailFrom || defaultFrom;

const sendPaymentReminder = async ({ to, tenantName, amount, periodEnd, hostelName, hostelOwnerName, roomNumber }) => {
  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const paymentLink = '#';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Payment Reminder</title></head>
<body style="margin:0;padding:0;background-color:#f6f8fb;font-family:Arial,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f8fb;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#2563eb;padding:24px 24px 18px;color:#ffffff;">
              <h2 style="margin:0;font-size:22px;">Payment Reminder</h2>
              <p style="margin:8px 0 0;font-size:14px;opacity:0.95;">${hostelName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;line-height:1.6;font-size:15px;">
              <p style="margin:0 0 12px;">Hello ${tenantName},</p>
              <p style="margin:0 0 12px;">This is a friendly reminder that your hostel fee payment of <strong>₹${amount}</strong> is still pending.</p>
              <p style="margin:0 0 12px;">Please clear the amount before the due date to avoid any inconvenience.</p>
              <table width="100%" cellpadding="10" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:12px 0;">
                <tr><td><strong>Room</strong></td><td>${roomNumber}</td></tr>
                <tr><td><strong>Amount due</strong></td><td>₹${amount}</td></tr>
                <tr><td><strong>Due date</strong></td><td>${fmt(periodEnd)}</td></tr>
              </table>
              <p style="margin:16px 0 0;">Regards,<br><strong>${hostelOwnerName}</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Dear ${tenantName},\n\nOur records indicate that your hostel fee payment is still pending. Please complete the payment before ${fmt(periodEnd)} to avoid penalties or additional late charges.\n\nRoom Number: ${roomNumber}\nHostel Name: ${hostelName}\nAmount Due: ₹${amount}\nDue Date: ${fmt(periodEnd)}\n\nIf you have already paid, please ignore this message.\n\nRegards,\n${hostelOwnerName}`;

  console.log('[MAIL] sending from:', defaultFrom, 'to:', to);
  const response = await resend.emails.send({
    from: defaultFrom,
    to,
    subject: `Payment Reminder — ${hostelName}`,
    html,
    text,
    replyTo: mailReplyTo,
  });
  console.log('[MAIL] Resend response:', response);
};

const sendWelcomeEmail = async ({ to, tenantName, hostelName, hostelOwnerName, dashboardLink }) => {
  const currentYear = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Dashboard Access</title></head>
<body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fb;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#2563eb;padding:24px 24px 18px;color:#ffffff;">
              <h2 style="margin:0;font-size:22px;">Welcome to ${hostelName}</h2>
              <p style="margin:8px 0 0;font-size:14px;opacity:0.95;">Your tenant dashboard is ready</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;line-height:1.6;font-size:15px;">
              <p style="margin:0 0 12px;">Hello ${tenantName},</p>
              <p style="margin:0 0 12px;">Your tenant dashboard for <strong>${hostelName}</strong> is ready. You can use the button below to open it.</p>
              <div style="text-align:center;margin:20px 0;">
                <a href="${dashboardLink}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:bold;">Open Dashboard</a>
              </div>
              <p style="margin:16px 0 0;">Regards,<br><strong>${hostelOwnerName}</strong><br>${hostelName}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hello ${tenantName},\n\nYour tenant account at ${hostelName} has been created successfully. Use the following dashboard link to access your payment details, room info, and support tickets:\n\n${dashboardLink}\n\nRegards,\n${hostelOwnerName}\n${hostelName}`;

  console.log('[MAIL] sending from:', defaultFrom, 'to:', to);
  const response = await resend.emails.send({
    from: defaultFrom,
    to,
    subject: `Welcome to ${hostelName}`,
    html,
    text,
    replyTo: mailReplyTo,
  });
  console.log('[MAIL] Resend response:', response);
};

module.exports = { sendPaymentReminder, sendWelcomeEmail };
