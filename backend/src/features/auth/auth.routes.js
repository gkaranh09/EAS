const express = require('express');
const authController = require('./auth.controller');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

router.post('/admin/register', authController.disabledEmployeeRegister);
router.post('/employee/register', authController.disabledEmployeeRegister);

router.post('/admin/login', authController.employeeLogin);
router.post('/employee/login', authController.employeeLogin);

module.exports = router;
