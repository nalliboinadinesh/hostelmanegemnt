const express = require('express');
const router = express.Router();
const { registerOrLogin, sendTestMail } = require('../controller/authController');

router.post('/register-login', registerOrLogin);
router.post('/test-mail', sendTestMail);

module.exports = router;
