const express = require('express');
const router = express.Router();
const { createTenant, getTenantsByHostel, getTenantById, updateTenant, deleteTenant } = require('../controller/tenantController');
const { protect } = require('../middleware/authMiddleware');

// BUG-02 FIX: /single/:tenantId must be registered BEFORE /:hostelId
// otherwise Express matches "single" as a hostelId value
router.post('/create', protect, createTenant);
router.get('/single/:tenantId', protect, getTenantById);
router.get('/:hostelId', protect, getTenantsByHostel);
router.put('/:tenantId', protect, updateTenant);
router.delete('/:tenantId', protect, deleteTenant);

module.exports = router;
