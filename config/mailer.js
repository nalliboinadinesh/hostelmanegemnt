const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const mailFrom = process.env.MAIL_FROM || process.env.MAIL_USER;

const sendPaymentReminder = async ({ to, tenantName, amount, periodEnd, hostelName, hostelOwnerName, roomNumber }) => {
  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const paymentLink = '#';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Urgent Payment Reminder</title></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="650" cellpadding="0" cellspacing="0"
             style="background:#ffffff;margin:30px auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr>
          <td align="center" style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:30px;color:white;">
            <div style="font-size:50px;">&#9888;&#65039;</div>
            <h1 style="margin:10px 0 0;">PAYMENT OVERDUE</h1>
            <p style="margin:10px 0 0;font-size:16px;">Immediate Action Required</p>
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="padding:35px;color:#333;">
            <h2 style="color:#b91c1c;">Dear ${tenantName},</h2>
            <p style="font-size:16px;line-height:1.7;">
              Our records indicate that your hostel fee payment is still
              <strong style="color:#dc2626;">pending</strong>.
              Please complete the payment before the due date to avoid
              penalties, service restrictions, or additional late charges.
            </p>
            <!-- Alert Box -->
            <table width="100%" cellpadding="15" cellspacing="0"
                   style="background:#fef2f2;border-left:6px solid #dc2626;border-radius:6px;margin:25px 0;">
              <tr><td><strong style="color:#b91c1c;font-size:18px;">&#9888;&#65039; Outstanding Amount: &#8377;${amount}</strong></td></tr>
            </table>
            <!-- Details -->
            <table width="100%" cellpadding="12" cellspacing="0"
                   style="border-collapse:collapse;border:1px solid #e5e7eb;">
              <tr style="background:#fef2f2;"><td><strong>Room Number</strong></td><td>${roomNumber}</td></tr>
              <tr><td><strong>Amount Due</strong></td><td style="color:#dc2626;font-weight:bold;">&#8377;${amount}</td></tr>
              <tr style="background:#fef2f2;"><td><strong>Due Date</strong></td><td style="color:#dc2626;font-weight:bold;">${fmt(periodEnd)}</td></tr>
              <tr><td><strong>Hostel Name</strong></td><td>${hostelName}</td></tr>
            </table>
            <!-- Warning -->
            <div style="margin-top:25px;padding:15px;background:#fff7ed;border-left:5px solid #f97316;border-radius:5px;">
              <strong style="color:#c2410c;">Important:</strong>
              Failure to clear outstanding dues before the due date may
              result in late payment charges and further administrative action.
            </div>
            <!-- CTA -->
            <div style="text-align:center;margin-top:35px;">
              <a href="${paymentLink}"
                 style="background:#dc2626;color:white;text-decoration:none;padding:14px 30px;border-radius:8px;font-size:16px;font-weight:bold;display:inline-block;">
                PAY NOW
              </a>
            </div>
            <p style="margin-top:35px;font-size:15px;">If you have already made the payment, please ignore this message.</p>
            <p style="font-size:15px;">Regards,<br><strong>${hostelOwnerName}</strong></p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td align="center" style="background:#111827;color:#d1d5db;padding:18px;font-size:13px;">
            &copy; ${new Date().getFullYear()} ${hostelName}. All Rights Reserved.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: `"Hostel Management" <${mailFrom}>`,
    to,
    subject: `⚠️ Payment Overdue — ₹${amount} due | ${hostelName}`,
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

  await resend.emails.send({
    from: `"Hostel Management" <${mailFrom}>`,
    to,
    subject: `Welcome to ${hostelName} — Your Dashboard is Ready`,
    html,
  });
};

module.exports = { sendPaymentReminder, sendWelcomeEmail };
