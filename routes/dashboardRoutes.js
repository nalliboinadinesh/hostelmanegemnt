const express = require('express');
const router = express.Router();
const { getTenantDashboard, createTicket, getMyTickets } = require('../controller/dashboardController');

// All authenticated via token in request body
router.post('/', getTenantDashboard);
router.post('/ticket', createTicket);
router.post('/tickets', getMyTickets);

module.exports = router;
