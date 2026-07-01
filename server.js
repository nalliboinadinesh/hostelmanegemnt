const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const http = require('http');
const mongoose = require('mongoose');

dotenv.config();

const connectDB = require('./config/db');
const startFeeStatusCron = require('./cron/feeStatusCron');
const startPaymentReminderCron = require('./cron/paymentReminderCron');
const initSocket = require('./socket');
// BUG-14 FIX: removed healthCheckCron — it only logged to stdout every 12 min
// and was originally meant to prevent Render free-tier sleeping. Not needed on EC2.

const app = express();

// Security headers.
app.use(helmet());

// Gzip responses (payment-cycle / tenant lists can be large JSON payloads).
app.use(compression());

// CORS. Defaults to the previous "allow all" behavior so nothing breaks; set
// ALLOWED_ORIGINS (comma-separated) in the env to lock it down to your dashboard.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : null;
app.use(cors(allowedOrigins ? { origin: allowedOrigins } : undefined));

// Cap request body size to avoid large-payload DoS (no legit request is near this).
app.use(express.json({ limit: '100kb' }));

// Rate limiting. A generous global cap protects against abuse/DoS without
// tripping normal app usage; auth is stricter since it's the brute-force surface.
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again shortly.' },
});
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again shortly.' },
});
app.use('/api', globalLimiter);

// Lightweight health check for the load balancer / uptime monitor.
app.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp });
});

app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/hostel', require('./routes/hostelRoutes'));
app.use('/api/floor', require('./routes/floorRoutes'));
app.use('/api/room', require('./routes/roomRoutes'));
app.use('/api/tenant', require('./routes/tenantRoutes'));
app.use('/api/expense', require('./routes/expenseRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/temporary-tenant', require('./routes/temporaryTenantRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));

// 404 for unknown routes — return JSON, not Express's default HTML page.
app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Central error handler — catches body-parser errors (e.g. malformed JSON) and
// anything thrown outside a controller's own try/catch. Logs the real error
// server-side and returns a generic message so internals aren't leaked.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: status === 500 ? 'Internal server error' : err.message });
});

// Socket.IO must attach to a raw HTTP server, not the Express app directly.
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  startFeeStatusCron();
  startPaymentReminderCron();
  await initSocket(server);
  server.listen(PORT, () => {
    console.log(`server is running in the port ${PORT}`);
  });
});

// Graceful shutdown — stop accepting connections and close the DB cleanly on
// deploy/restart (SIGTERM from the process manager, SIGINT from Ctrl-C).
const shutdown = (signal) => {
  console.log(`[SHUTDOWN] ${signal} received — closing server...`);
  server.close(() => {
    mongoose.connection.close(false).finally(() => {
      console.log('[SHUTDOWN] closed. Exiting.');
      process.exit(0);
    });
  });
  // Force-exit if something hangs.
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
