const express = require('express');
const router = express.Router();
const { registerOrLogin, sendTestMail, getOwnerProfile } = require('../controller/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register-login', registerOrLogin);
router.post('/test-mail', sendTestMail);
router.get('/profile', protect, getOwnerProfile);

module.exports = router;
