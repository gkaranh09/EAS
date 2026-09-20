const express = require('express');
const programController = require('./program.controller');
const auth = require('../../core/middleware/auth');
const { requireRole } = require('../../core/middleware/rbac');

const router = express.Router();

// Public lookups for student registration and search
router.get('/departments', programController.getDepartments);
router.get('/', programController.getPrograms);

// Staff management of allowed coordinate programs
router.get('/employee/:employeeId', auth, requireRole('HEAD', 'ADMIN'), programController.getEmployeeAllowedPrograms);
router.put('/employee/:employeeId', auth, requireRole('HEAD'), programController.updateEmployeeAllowedPrograms);

module.exports = router;
