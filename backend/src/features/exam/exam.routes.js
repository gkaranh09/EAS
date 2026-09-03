const express = require('express');
const auth = require('../../core/middleware/auth');
const examController = require('./exam.controller');

const router = express.Router();

router.get('/', auth, examController.getExams);

module.exports = router;
