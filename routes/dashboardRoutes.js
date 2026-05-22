const express = require('express');
const router = express.Router();
const { getTenantDashboard } = require('../controller/dashboardController');

// Public — authenticated via JWT in query param
// GET /api/dashboard?token=<jwt>
router.get('/', getTenantDashboard);

module.exports = router;
