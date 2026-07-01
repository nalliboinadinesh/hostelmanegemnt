const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const mailFrom = process.env.MAIL_FROM || process.env.MAIL_USER;
const normalizedMailFrom = mailFrom ? mailFrom.trim().replace(/^"(.*)"$/, '$1').trim() : '';
const defaultFrom = normalizedMailFrom.includes('<') ? normalizedMailFrom : `"Hostel Management" <${normalizedMailFrom}>`;
const mailReplyTo = process.env.MAIL_REPLY_TO || normalizedMailFrom || defaultFrom;

const sendPaymentReminder = async ({ to, tenantName, amount, periodEnd, hostelName, hostelOwnerName, roomNumber, billingMonth, upiId }) => {
  const currentYear = new Date().getFullYear();
  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const dueDate = fmt(periodEnd);
  const amountValue = Number(amount).toFixed(2);
  const note = encodeURIComponent(`Room ${roomNumber} fee for ${billingMonth}`);
  const paymentLink = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('HostelMate')}&am=${amountValue}&cu=INR&tn=${note}`
    : '#';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Payment Reminder</title>
</head>

<body style="margin:0;padding:20px;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#334155;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,.08);">
          <tr>
            <td style="background:#2563eb;padding:22px 24px;text-align:center;color:#ffffff;">
              <h1 style="margin:0;font-size:22px;letter-spacing:0.02em;">Payment Reminder</h1>
              <p style="margin:8px 0 0;font-size:13px;opacity:0.85;">${hostelName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">
                Hello ${tenantName},<br><br>
                Your hostel fee payment is due. Please complete the payment by <strong>${dueDate}</strong> to avoid late charges.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;">
                <tr>
                  <td style="padding:18px;">
                    <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Amount due</p>
                    <p style="margin:0;font-size:30px;font-weight:700;color:#0f172a;">₹ ${amount}</p>
                    <p style="margin:12px 0 0;font-size:13px;color:#475569;">Due date: ${dueDate}</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;font-size:14px;color:#334155;">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">Room Number</td>
                  <td align="right" style="padding:10px 0;border-bottom:1px solid #e2e8f0;">${roomNumber}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">Billing Month</td>
                  <td align="right" style="padding:10px 0;border-bottom:1px solid #e2e8f0;">${billingMonth}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">Hostel</td>
                  <td align="right" style="padding:10px 0;">${hostelName}</td>
                </tr>
              </table>

              <div style="text-align:center;margin:24px 0;">
                <a href="${paymentLink}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:600;">Pay Now</a>
              </div>

              <p style="margin:0;font-size:13px;line-height:1.8;color:#64748b;">
                If you have already completed the payment, kindly ignore this email. If you need help, contact the hostel office.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:18px 24px;text-align:center;font-size:12px;color:#94a3b8;">
              © ${currentYear} ${hostelName} • All rights reserved
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hello ${tenantName},\n\nThis is a friendly reminder that your hostel fee payment is due. Please complete the payment before ${dueDate} to avoid late charges.\n\nRoom Number: ${roomNumber}\nBilling Month: ${billingMonth}\nAmount Due: ₹ ${amount}\nDue Date: ${dueDate}\n\nPay now: ${paymentLink}\n\nIf you have already completed the payment, kindly ignore this email.\n\nRegards,\nFinance Team\nTENORA HOSTELS`;

  if (!resend) {
    console.warn('[MAIL] RESEND_API_KEY not configured; skipping payment reminder email.');
    return;
  }

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
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to Tenora Hostels</title>
</head>

<body style="margin:0;padding:20px;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellspacing="0" cellpadding="0">
<tr>
<td align="center">

<table width="500" cellspacing="0" cellpadding="0"
style="background:#ffffff;border-radius:18px;overflow:hidden;
box-shadow:0 10px 35px rgba(0,0,0,.08);">

<!-- Header -->
<tr>
<td align="center"
style="padding:35px 20px;
background:linear-gradient(135deg,#2563eb,#1d4ed8);">

<img src="https://cdn-icons-png.flaticon.com/512/619/619153.png"
width="65" alt="Hostel">

<h1 style="color:#fff;margin:15px 0 8px;font-size:30px;">
TENORA HOSTELS
</h1>

<p style="color:#dbeafe;margin:0;font-size:15px;">
Your tenant dashboard is ready
</p>

</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:30px;">

<h2 style="margin:0;color:#1e293b;">
Hello <span style="color:#2563eb;">${tenantName}</span> 👋
</h2>

<p style="color:#64748b;font-size:15px;line-height:24px;margin-top:15px;">
Welcome to <strong>Tenora Hostels</strong>.
Your account has been successfully created.
Everything you need is now available from your dashboard.
</p>

<!-- Features -->

<table width="100%" cellpadding="12"
style="margin-top:20px;border:1px solid #edf2f7;
border-radius:12px;">

<tr>
<td width="50" align="center" style="font-size:22px;">📄</td>
<td>
<b style="font-size:15px;">Fee Details</b><br>
<span style="font-size:13px;color:#64748b;">
View dues & upcoming payments
</span>
</td>
</tr>

<tr>
<td align="center" style="font-size:22px;">💳</td>
<td>
<b style="font-size:15px;">Payment History</b><br>
<span style="font-size:13px;color:#64748b;">
Access all receipts & transactions
</span>
</td>
</tr>

<tr>
<td align="center" style="font-size:22px;">🛏️</td>
<td>
<b style="font-size:15px;">Room Details</b><br>
<span style="font-size:13px;color:#64748b;">
Room allocation & hostel information
</span>
</td>
</tr>

<tr>
<td align="center" style="font-size:22px;">🛠️</td>
<td>
<b style="font-size:15px;">Support</b><br>
<span style="font-size:13px;color:#64748b;">
Raise maintenance & support tickets
</span>
</td>
</tr>

</table>

<!-- Button -->

<div style="text-align:center;margin:35px 0;">

<a href="${dashboardLink}"
style="
background:#2563eb;
color:white;
text-decoration:none;
padding:14px 35px;
border-radius:10px;
font-size:16px;
font-weight:bold;
display:inline-block;
box-shadow:0 8px 20px rgba(37,99,235,.35);
">
Open Dashboard →
</a>

</div>

<p style="font-size:14px;color:#64748b;line-height:24px;">
If you have any questions, simply reply to this email.
We're always happy to help.
</p>

<p style="margin-top:35px;font-size:15px;color:#1e293b;">
Regards,<br>
<b>${hostelOwnerName}</b><br>
<span style="color:#2563eb;">TENORA HOSTELS</span>
</p>

</td>
</tr>

<!-- Footer -->

<tr>
<td align="center"
style="padding:20px;background:#f8fafc;
font-size:12px;color:#94a3b8;">

© ${currentYear} TENORA HOSTELS • All Rights Reserved

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>`;

  const text = `Hello ${tenantName},\n\nYour tenant account at ${hostelName} has been created successfully. Use the following dashboard link to access your payment details, room info, and support tickets:\n\n${dashboardLink}\n\nRegards,\n${hostelOwnerName}\n${hostelName}`;

  if (!resend) {
    console.warn('[MAIL] RESEND_API_KEY not configured; skipping welcome email.');
    return;
  }

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
