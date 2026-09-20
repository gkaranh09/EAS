const express = require('express');
const auth = require('../../core/middleware/auth');
const { requireRole } = require('../../core/middleware/rbac');
const formController = require('./form.controller');

const router = express.Router();

// Student-specific exam form actions
router.post('/submit', auth, requireRole('STUDENT'), formController.submitForm);
router.get('/status', auth, requireRole('STUDENT'), formController.getStatus);
router.post('/create-order', auth, requireRole('STUDENT'), formController.createOrder);
router.post('/verify-payment', auth, requireRole('STUDENT'), formController.verifyPayment);
router.post('/payment/success', auth, requireRole('STUDENT'), formController.paymentSuccess);

// Document downloads (accessible by Student owner and Staff)
router.get('/pdf/:formId', auth, formController.getFormPdf);
router.get('/admit-card/pdf/:formId', auth, formController.getAdmitCardPdf);

module.exports = router;
