const express = require('express');
const auth = require('../../core/middleware/auth');
const { requireRole } = require('../../core/middleware/rbac');
const studentController = require('./student.controller');

const router = express.Router();

router.get('/me', auth, requireRole('STUDENT'), studentController.getMe);
router.get('/profile-status', auth, requireRole('STUDENT'), studentController.getProfileStatus);
router.put('/profile', auth, requireRole('STUDENT'), studentController.updateProfile);
router.post('/upload-photo', auth, requireRole('STUDENT'), studentController.uploadPhoto);

module.exports = router;
