const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const startFeeStatusCron = require('./cron/feeStatusCron');

dotenv.config();

const app = express();

app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/hostel', require('./routes/hostelRoutes'));
app.use('/api/floor', require('./routes/floorRoutes'));
app.use('/api/room', require('./routes/roomRoutes'));
app.use('/api/tenant', require('./routes/tenantRoutes'));
app.use('/api/expense', require('./routes/expenseRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));

connectDB().then(() => {
  startFeeStatusCron();
  app.listen(process.env.PORT, () => {
    console.log(`server is running in the port ${process.env.PORT}`);
  });
});


