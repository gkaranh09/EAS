const express = require('express');
const auth = require('../../../core/middleware/auth');
const { requireRole } = require('../../../core/middleware/rbac');
const controller = require('./employeeManagement.controller');

const router = express.Router();

// Employee Management is strictly restricted to the Exam Center Head
router.use(auth, requireRole('HEAD'));

router.get('/', controller.getEmployees);
router.post('/', controller.addEmployee);
router.patch('/:id/role', controller.updateRole);
router.patch('/:id/toggle-active', controller.toggleActive);

module.exports = router;
