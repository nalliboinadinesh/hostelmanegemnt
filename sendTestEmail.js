require('dotenv').config();
const fs = require('fs');
const { sendWelcomeEmail } = require('./config/mailer');

const log = (msg) => {
  fs.appendFileSync('test_email_result.txt', msg + '\n');
  console.log(msg);
};

log('Starting test...');
log('BREVO_API_KEY set: ' + !!process.env.BREVO_API_KEY);
log('MAIL_FROM: ' + process.env.MAIL_FROM);

sendWelcomeEmail({
  to: 'nalliboinadinesh9441@gmail.com',
  tenantName: 'Dinesh',
  hostelName: 'Test Hostel',
  hostelOwnerName: 'Ranga Rohith',
  dashboardLink: 'http://localhost:3000?token=test',
})
  .then(() => { log('OK — sent via Brevo HTTPS'); })
  .catch(e => { log('FAIL: ' + e.message); })
  .finally(() => process.exit(0));
