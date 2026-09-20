const express = require('express');
const authController = require('./auth.controller');
const auth = require('../../core/middleware/auth');
const { authLimiter, sessionVerifyLimiter } = require('../../core/middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

router.post('/admin/register', authLimiter, authController.disabledEmployeeRegister);
router.post('/employee/register', authLimiter, authController.disabledEmployeeRegister);

router.post('/admin/login', authLimiter, authController.employeeLogin);
router.post('/employee/login', authLimiter, authController.employeeLogin);

router.post('/logout', auth, authController.logout);
router.get('/session/verify', auth, sessionVerifyLimiter, authController.verifySession);

module.exports = router;
