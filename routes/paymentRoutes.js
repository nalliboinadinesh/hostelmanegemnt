const express = require('express');
const router = express.Router();
const { getPaymentsByTenant, getPaymentsByHostel, updatePayment } = require('../controller/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/hostel/:hostelId', protect, getPaymentsByHostel);
router.get('/:tenantId', protect, getPaymentsByTenant);
router.put('/:paymentId', protect, updatePayment);

module.exports = router;
