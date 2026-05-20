const express = require('express');
const router = express.Router();
const { generateFormToken, submitTenantForm, deleteTemporaryTenant, approveTenant } = require('../controller/temporaryTenantController');
const { protect } = require('../middleware/authMiddleware');

// No auth — public endpoints for tenant form
router.post('/generate-token', generateFormToken);
router.post('/submit', submitTenantForm);

// Auth required — owner actions
router.post('/approve/:tempTenantId', protect, approveTenant);
router.delete('/:tempTenantId', protect, deleteTemporaryTenant);

module.exports = router;
