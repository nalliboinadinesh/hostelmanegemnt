const express = require('express');
const router = express.Router();
const { getTicketsByHostel, getTicketsByTenant, updateTicketStatus } = require('../controller/ticketController');
const { protect } = require('../middleware/authMiddleware');

router.get('/hostel/:hostelId', protect, getTicketsByHostel);
router.get('/tenant/:tenantId', protect, getTicketsByTenant);
router.put('/:ticketId/status', protect, updateTicketStatus);

module.exports = router;
