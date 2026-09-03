const express = require('express');
const auth = require('../../core/middleware/auth');
const subjectController = require('./subject.controller');

const router = express.Router();

router.get('/', auth, subjectController.getSubjects);

module.exports = router;
