const express = require('express');
const router = express.Router();
const { registerOrLogin, sendTestMail, getOwnerProfile } = require('../controller/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register-login', registerOrLogin);
// test-mail sends real emails via Resend — require an authenticated owner so it
// can't be used as an open relay / to burn the mail quota.
router.post('/test-mail', protect, sendTestMail);
router.get('/profile', protect, getOwnerProfile);

module.exports = router;
