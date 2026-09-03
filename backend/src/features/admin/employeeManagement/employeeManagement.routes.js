const express = require('express');
const auth = require('../../../core/middleware/auth');
const controller = require('./employeeManagement.controller');

const router = express.Router();

router.get('/', auth, controller.getEmployees);
router.post('/', auth, controller.addEmployee);
router.patch('/:id/role', auth, controller.updateRole);
router.patch('/:id/toggle-active', auth, controller.toggleActive);

module.exports = router;
