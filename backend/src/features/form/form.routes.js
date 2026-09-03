const express = require('express');
const auth = require('../../core/middleware/auth');
const formController = require('./form.controller');

const router = express.Router();

router.post('/submit', auth, formController.submitForm);
router.get('/status', auth, formController.getStatus);
router.get('/pdf/:formId', auth, formController.getFormPdf);
router.get('/admit-card/pdf/:formId', auth, formController.getAdmitCardPdf);
router.post('/create-order', auth, formController.createOrder);
router.post('/verify-payment', auth, formController.verifyPayment);
router.post('/payment/success', auth, formController.paymentSuccess);

module.exports = router;
