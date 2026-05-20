const express = require('express');
const router = express.Router();
const { generateFormToken, submitTenantForm, deleteTemporaryTenant, approveTenant, getTemporaryTenantsByHostel } = require('../controller/temporaryTenantController');
const { protect } = require('../middleware/authMiddleware');

// No auth — public endpoints for tenant form
router.post('/generate-token', generateFormToken);
router.post('/submit', submitTenantForm);

// Auth required — owner actions
router.get('/hostel/:hostelId', protect, getTemporaryTenantsByHostel);
router.post('/approve/:tempTenantId', protect, approveTenant);
router.delete('/:tempTenantId', protect, deleteTemporaryTenant);

module.exports = router;
