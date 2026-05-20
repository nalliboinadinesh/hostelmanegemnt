const cron = require('node-cron');

// Runs every 12 minutes
const startHealthCheckCron = () => {
  cron.schedule('*/12 * * * *', () => {
    console.log(`[HEALTH] Server is alive at ${new Date().toISOString()}`);
  });

  console.log('[HEALTH] Health check cron scheduled (every 12 minutes)');
};

module.exports = startHealthCheckCron;
