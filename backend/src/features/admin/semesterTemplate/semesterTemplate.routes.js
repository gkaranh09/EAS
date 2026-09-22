const express = require('express');
const auth = require('../../../core/middleware/auth');
const { requireRole } = require('../../../core/middleware/rbac');
const controller = require('./semesterTemplate.controller');

const router = express.Router();

// Read operations: accessible by Coordinators, Admins, and Heads
router.get('/',    auth, requireRole('HEAD', 'ADMIN', 'COORDINATOR', 'STUDENT'), controller.getTemplates);
router.get('/:id', auth, requireRole('HEAD', 'ADMIN', 'COORDINATOR', 'STUDENT'), controller.getTemplateDetail);

// Write operations: restricted to Admins and Heads
router.post('/',   auth, requireRole('HEAD', 'ADMIN'), controller.createTemplate);
router.put('/:id', auth, requireRole('HEAD', 'ADMIN'), controller.updateTemplate);
router.delete('/:id', auth, requireRole('HEAD', 'ADMIN'), controller.deleteTemplate);

module.exports = router;
