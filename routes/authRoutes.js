const express = require('express');
const router = express.Router();
const { registerOrLogin } = require('../controller/authController');

router.post('/register-login', registerOrLogin);

module.exports = router;
