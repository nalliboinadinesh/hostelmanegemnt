const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');
const connectDB = require('./config/db');
const startFeeStatusCron = require('./cron/feeStatusCron');
const startPaymentReminderCron = require('./cron/paymentReminderCron');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// API routes
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

// Proxy all non-API requests to the Next.js tenant dashboard (port 3000)
// This means http://13.60.202.87:4000/?token=... serves the frontend directly
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';
app.use('/', createProxyMiddleware({
  target: DASHBOARD_URL,
  changeOrigin: true,
  ws: true, // proxy websockets too (Next.js HMR)
}));

connectDB().then(() => {
  startFeeStatusCron();
  startPaymentReminderCron();
  app.listen(process.env.PORT, () => {
    console.log(`server is running on port ${process.env.PORT}`);
    console.log(`tenant dashboard proxied from ${DASHBOARD_URL}`);
  });
});


