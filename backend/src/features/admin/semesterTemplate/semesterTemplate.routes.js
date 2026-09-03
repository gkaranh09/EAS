const express = require('express');
const auth = require('../../../core/middleware/auth');
const controller = require('./semesterTemplate.controller');

const router = express.Router();

router.get('/',    auth, controller.getTemplates);
router.get('/:id', auth, controller.getTemplateDetail);
router.post('/',   auth, controller.createTemplate);
router.put('/:id', auth, controller.updateTemplate);
router.delete('/:id', auth, controller.deleteTemplate);

module.exports = router;
