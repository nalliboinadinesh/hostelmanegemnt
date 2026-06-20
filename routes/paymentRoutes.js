const express = require('express');
const router = express.Router();
const { getPaymentsByTenant, getPaymentsByHostel, updatePayment, getFeeDataByHostel } = require('../controller/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/fee/:hostelId', protect, getFeeDataByHostel);
router.get('/hostel/:hostelId', protect, getPaymentsByHostel);
router.get('/:tenantId', protect, getPaymentsByTenant);
router.put('/:paymentId', protect, updatePayment);

module.exports = router;
