const nodemailer = require('nodemailer');

// Brevo SMTP relay — works on Render (port 587 is allowed via Brevo's relay)
const getTransporter = () => nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,  // ac1201001@smtp-brevo.com
    pass: process.env.MAIL_PASS,  // xsmtpsib-...
  },
});

const sendPaymentReminder = async ({ to, tenantName, amount, periodEnd, hostelName, hostelOwnerName, roomNumber }) => {
  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Payment Reminder</title></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,sans-serif;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;margin-top:30px;border-radius:10px;overflow:hidden;">
        <tr>
          <td align="center" style="background:#2563eb;padding:25px;color:white;">
            <h1 style="margin:0;">Hostel Payment Reminder</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:35px;color:#333333;">
            <h2>Hello ${tenantName},</h2>
            <p style="font-size:16px;line-height:1.6;">This is a friendly reminder that your hostel fee payment is still pending.</p>
            <table width="100%" cellpadding="10" cellspacing="0" style="margin-top:20px;border-collapse:collapse;">
              <tr style="background:#f3f4f6;"><td><strong>Room Number</strong></td><td>${roomNumber}</td></tr>
              <tr><td><strong>Amount Due</strong></td><td>&#8377;${amount}</td></tr>
              <tr style="background:#f3f4f6;"><td><strong>Due Date</strong></td><td>${fmt(periodEnd)}</td></tr>
              <tr><td><strong>Hostel Name</strong></td><td>${hostelName}</td></tr>
            </table>
            <p style="margin-top:35px;font-size:14px;color:#666;">Kindly make the payment before the due date to avoid late charges.</p>
            <p style="font-size:15px;">Thank you,<br><strong>${hostelOwnerName}</strong></p>
          </td>
        </tr>
        <tr>
          <td align="center" style="background:#f3f4f6;padding:18px;font-size:13px;color:#666;">
            &copy; ${new Date().getFullYear()} ${hostelName}. All rights reserved.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getTransporter().sendMail({
    from: `"Hostel Management" <${process.env.MAIL_FROM}>`,
    to,
    subject: `Payment Reminder — ₹${amount} due | ${hostelName}`,
    html,
  });
};

const sendWelcomeEmail = async ({ to, tenantName, hostelName, hostelOwnerName, dashboardLink }) => {
  const currentYear = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Tenant Dashboard Access</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:16px 8px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.08);">
        <tr>
          <td align="center" style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 20px;color:#ffffff;">
            <div style="font-size:32px;margin-bottom:10px;">&#127968;</div>
            <h1 style="margin:0 0 6px;font-size:22px;font-weight:bold;line-height:1.3;">Welcome to ${hostelName}</h1>
            <p style="margin:0;font-size:13px;opacity:0.9;">Your tenant dashboard is now ready</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 20px;color:#1e293b;">
            <p style="margin:0 0 6px;font-size:16px;font-weight:bold;color:#0f172a;">Hello ${tenantName},</p>
            <p style="margin:0 0 20px;font-size:13px;line-height:1.7;color:#475569;">
              Your tenant account has been successfully created. Access your dashboard to manage everything in one place.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="40" valign="top" style="padding-bottom:16px;">
                  <div style="width:36px;height:36px;background:#dcfce7;border-radius:8px;text-align:center;line-height:36px;font-size:18px;">&#128196;</div>
                </td>
                <td style="padding-left:12px;padding-bottom:16px;vertical-align:top;">
                  <div style="font-size:13px;font-weight:bold;color:#0f172a;">View fee details</div>
                  <div style="font-size:12px;color:#64748b;margin-top:2px;">Due amount, fee breakdown &amp; upcoming payments.</div>
                </td>
              </tr>
              <tr>
                <td width="40" valign="top" style="padding-bottom:16px;">
                  <div style="width:36px;height:36px;background:#fef9c3;border-radius:8px;text-align:center;line-height:36px;font-size:18px;">&#8377;</div>
                </td>
                <td style="padding-left:12px;padding-bottom:16px;vertical-align:top;">
                  <div style="font-size:13px;font-weight:bold;color:#0f172a;">Payment history</div>
                  <div style="font-size:12px;color:#64748b;margin-top:2px;">View all past payments and receipts.</div>
                </td>
              </tr>
              <tr>
                <td width="40" valign="top" style="padding-bottom:16px;">
                  <div style="width:36px;height:36px;background:#e0f2fe;border-radius:8px;text-align:center;line-height:36px;font-size:18px;">&#128716;</div>
                </td>
                <td style="padding-left:12px;padding-bottom:16px;vertical-align:top;">
                  <div style="font-size:13px;font-weight:bold;color:#0f172a;">Room information</div>
                  <div style="font-size:12px;color:#64748b;margin-top:2px;">Access your room details and related info.</div>
                </td>
              </tr>
              <tr>
                <td width="40" valign="top" style="padding-bottom:4px;">
                  <div style="width:36px;height:36px;background:#fce7f3;border-radius:8px;text-align:center;line-height:36px;font-size:18px;">&#127915;</div>
                </td>
                <td style="padding-left:12px;padding-bottom:4px;vertical-align:top;">
                  <div style="font-size:13px;font-weight:bold;color:#0f172a;">Raise a support ticket</div>
                  <div style="font-size:12px;color:#64748b;margin-top:2px;">Report any issue — maintenance, cleanliness, or anything else — directly from your dashboard.</div>
                </td>
              </tr>
            </table>
            <div style="text-align:center;margin-top:24px;">
              <a href="${dashboardLink}"
                 style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:10px;display:inline-block;font-size:14px;font-weight:bold;">
                Open Tenant Dashboard
              </a>
            </div>
            <p style="margin-top:24px;margin-bottom:0;font-size:13px;line-height:1.7;color:#0f172a;">
              Regards,<br><strong>${hostelOwnerName}</strong><br>
              <span style="color:#64748b;">${hostelName}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="background:#f8fafc;padding:16px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;">
            &copy; ${currentYear} ${hostelName}. All rights reserved.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getTransporter().sendMail({
    from: `"Hostel Management" <${process.env.MAIL_FROM}>`,
    to,
    subject: `Welcome to ${hostelName} — Your Dashboard is Ready`,
    html,
  });
};

module.exports = { sendPaymentReminder, sendWelcomeEmail };
