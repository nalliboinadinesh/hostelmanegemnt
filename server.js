const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const startFeeStatusCron = require('./cron/feeStatusCron');
const startHealthCheckCron = require('./cron/healthCheckCron');

dotenv.config();

const app = express();

// Allow requests from any frontend origin
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

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

connectDB().then(() => {
  startFeeStatusCron();
  startHealthCheckCron();
  app.listen(process.env.PORT, () => {
    console.log(`server is running in the port ${process.env.PORT}`);
  });
});


