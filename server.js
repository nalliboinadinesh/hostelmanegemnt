const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const startFeeStatusCron = require('./cron/feeStatusCron');
const startPaymentReminderCron = require('./cron/paymentReminderCron');
// BUG-14 FIX: removed healthCheckCron — it only logged to stdout every 12 min
// and was originally meant to prevent Render free-tier sleeping. Not needed on EC2.

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/hostel', require('./routes/hostelRoutes'));
app.use('/api/floor', require('./routes/floorRoutes'));
app.use('/api/room', require('./routes/roomRoutes'));
app.use('/api/tenant', require('./routes/tenantRoutes'));
app.use('/api/expense', require('./routes/expenseRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/temporary-tenant', require('./routes/temporaryTenantRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));

connectDB().then(() => {
  startFeeStatusCron();
  startPaymentReminderCron();
  app.listen(process.env.PORT, () => {
    console.log(`server is running in the port ${process.env.PORT}`);
  });
});


