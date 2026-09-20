const formService = require('./form.service');
const { generatePdf, generateAdmitCardPdf } = require('../../core/utils/pdfService');

const submitForm = async (req, res) => {
  try {
    const result = await formService.submitExamForm(req.body, req.user.id);
    res.status(201).json({
      message: 'Exam form submitted successfully',
      form_id: result.form_id,
      form_code: result.form_code,
      payment_status: result.payment_status,
      amount_due: result.amount_due
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message, form_id: err.form_id, form_code: err.form_code });
    }
    if (err.message.includes('expired')) {
      return res.status(401).json({ message: err.message });
    }
    if (err.message.includes('blocked') || err.message.includes('eligible') || err.message.includes('denied')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message === 'You have already applied for this exam') {
      return res.status(409).json({ message: err.message, form_id: err.form_id, form_code: err.form_code });
    }
    if (err.message === 'Exam not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes('required') || err.message.includes('deadline has passed') || err.message.includes('inactive')) {
      return res.status(400).json({ message: err.message });
    }
    console.error('Form submit error:', err);
    res.status(500).json({ message: 'Server error during form submission' });
  }
};

const getStatus = async (req, res) => {
  try {
    const status = await formService.getStatus(req.user.id);
    res.json(status);
  } catch (err) {
    console.error('Form status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getFormPdf = async (req, res) => {
  try {
    const { formId } = req.params;
    const { form, subjects } = await formService.getFormPdfData(formId, req.user);

    const filename = form.form_code ? `ExamForm_${form.form_code}.pdf` : `ExamForm_${formId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    generatePdf(form, subjects, res);
  } catch (err) {
    if (err.message.includes('Access denied')) return res.status(403).json({ message: err.message });
    if (err.message === 'Form not found') return res.status(404).json({ message: err.message });
    
    console.error('PDF generation error:', err);
    res.status(500).json({ message: 'Server error generating PDF' });
  }
};

const getAdmitCardPdf = async (req, res) => {
  try {
    const { formId } = req.params;
    const { form, schedules } = await formService.getAdmitCardPdfData(formId, req.user);

    const filename = form.admit_card_number ? `AdmitCard_${form.admit_card_number}.pdf` : `AdmitCard_${formId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    generateAdmitCardPdf(form, schedules, res);
  } catch (err) {
    if (err.message.includes('Access denied') || err.message.includes('blocked')) return res.status(403).json({ message: err.message });
    if (err.message.includes('released') || err.message.includes('approved')) return res.status(400).json({ message: err.message });
    if (err.message === 'Form not found') return res.status(404).json({ message: err.message });

    console.error('Admit Card PDF error:', err);
    res.status(500).json({ message: 'Server error generating Admit Card PDF' });
  }
};

const createOrder = async (req, res) => {
  try {
    const { form_id } = req.body;
    const orderData = await formService.createRazorpayOrder(form_id, req.user.id);
    res.json(orderData);
  } catch (err) {
    if (err.message.includes('required') || err.message.includes('already paid') || err.message.includes('deadline has passed')) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message.includes('not found') || err.message.includes('denied')) return res.status(404).json({ message: err.message });

    console.error('Create Razorpay order error:', err);
    res.status(500).json({ message: 'Failed to create Razorpay order' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { form_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const result = await formService.verifyRazorpayPayment(form_id, req.user.id, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });
    res.json(result);
  } catch (err) {
    if (err.message.includes('required')) return res.status(400).json({ message: err.message });
    if (err.message.includes('signature')) return res.status(400).json({ message: 'Signature verification failed' });
    if (err.message.includes('not found') || err.message.includes('denied')) return res.status(404).json({ message: err.message });
    if (err.message.includes('deadline has passed')) return res.status(400).json({ message: err.message });

    console.error('Verify payment error:', err);
    res.status(500).json({ message: 'Payment verification failed' });
  }
};

const paymentSuccess = async (req, res) => {
  try {
    const { form_id, razorpay_payment_id } = req.body;
    const amount_paid = await formService.recordPaymentSuccess(form_id, razorpay_payment_id, req.user.id);
    res.json({ message: 'Payment recorded successfully', amount_paid });
  } catch (err) {
    if (err.message.includes('required')) return res.status(400).json({ message: err.message });
    if (err.message.includes('not found')) return res.status(404).json({ message: err.message });

    console.error('Payment success error:', err);
    res.status(500).json({ message: 'Server error during payment confirmation' });
  }
};

module.exports = {
  submitForm,
  getStatus,
  getFormPdf,
  getAdmitCardPdf,
  createOrder,
  verifyPayment,
  paymentSuccess
};
