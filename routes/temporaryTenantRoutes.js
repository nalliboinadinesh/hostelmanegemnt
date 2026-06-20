const express = require('express');
const router = express.Router();
const { generateFormToken, submitTenantForm, deleteTemporaryTenant, approveTenant, getTemporaryTenantsByHostel } = require('../controller/temporaryTenantController');
const { protect } = require('../middleware/authMiddleware');

// BUG-10 FIX: generateFormToken now requires owner auth to prevent
// anyone with a hostelId from generating form tokens for other hostels
router.post('/generate-token', protect, generateFormToken);
router.post('/submit', submitTenantForm);

// Auth required — owner actions
router.get('/hostel/:hostelId', protect, getTemporaryTenantsByHostel);
router.post('/approve/:tempTenantId', protect, approveTenant);
router.delete('/:tempTenantId', protect, deleteTemporaryTenant);

module.exports = router;
