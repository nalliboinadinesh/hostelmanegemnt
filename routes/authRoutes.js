const express = require('express');
const router = express.Router();
const { registerOrLogin, sendTestMail, getMe, updateMe } = require('../controller/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register-login', registerOrLogin);
router.post('/test-mail', sendTestMail);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

module.exports = router;
