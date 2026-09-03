const express = require('express');
const auth = require('../../core/middleware/auth');
const studentController = require('./student.controller');

const router = express.Router();

router.get('/me', auth, studentController.getMe);
router.put('/profile', auth, studentController.updateProfile);

module.exports = router;
