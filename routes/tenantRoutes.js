const express = require('express');
const router = express.Router();
const { createTenant, getTenantsByHostel, getTenantById, updateTenant, deleteTenant } = require('../controller/tenantController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create', protect, createTenant);
router.get('/:hostelId', protect, getTenantsByHostel);
router.get('/single/:tenantId', protect, getTenantById);
router.put('/:tenantId', protect, updateTenant);
router.delete('/:tenantId', protect, deleteTenant);

module.exports = router;
