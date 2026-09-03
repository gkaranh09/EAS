const formRepository = require('./form.repository');

const submitExamForm = async (data, studentId) => {
  const { exam_id, subject_ids } = data;

  if (!exam_id || !Array.isArray(subject_ids) || subject_ids.length === 0) {
    throw new Error('exam_id and at least one subject_id are required');
  }

  const exists = await formRepository.checkStudentExists(studentId);
  if (!exists) {
    throw new Error('Your session has expired because the database was reset. Please Sign Out and log in again.');
  }

  const dup = await formRepository.getExamFormDuplicate(exam_id, studentId);
  if (dup) {
    const error = new Error('You have already applied for this exam');
    error.form_id = dup.form_id;
    throw error;
  }

  const examDetails = await formRepository.getExamDetails(exam_id);
  if (!examDetails) {
    throw new Error('Exam not found');
  }

  const { form_fees, deadline_date, late_fees, exam_type } = examDetails;
  const count = subject_ids.length;
  const baseFormFee = Number(form_fees) || 0;
  const type = (exam_type || '').toLowerCase().trim();

  let subjectFee = 0;
  if (type === 'atkt' || type.includes('kt')) {
    // ATKT: 1-3 subjects = 500 per subject; >3 subjects = 1850 flat
    subjectFee = count <= 3 ? count * 500 : 1850;
  } else if (type === 'supplementary' || type === 'supplymentry') {
    // Supplementary: 500 per subject chosen
    subjectFee = count * 500;
  } else {
    subjectFee = 0;
  }

  let finalFee = baseFormFee + subjectFee;

  const today = new Date();
  const deadline = new Date(deadline_date);
  deadline.setHours(23, 59, 59, 999);
  
  if (today > deadline) {
    finalFee += (Number(late_fees) || 500);
  }

  const initialPaymentStatus = finalFee === 0 ? 'paid' : 'pending';
  const isRepeater = Boolean(data.repeters || data.is_repeater);

  const form_id = await formRepository.submitForm(exam_id, studentId, subject_ids, initialPaymentStatus, finalFee, isRepeater);

  return { form_id, payment_status: initialPaymentStatus, amount_due: finalFee };
};

const getStatus = async (studentId) => {
  return await formRepository.getFormStatus(studentId);
};

const getFormPdfData = async (formId, user) => {
  if (!user.is_faculty) {
    const ownership = await formRepository.verifyOwnership(formId, user.id);
    if (!ownership) {
      throw new Error('Access denied');
    }
  }

  const form = await formRepository.getFormDataForPdf(formId);
  if (!form) {
    throw new Error('Form not found');
  }

  const subjects = await formRepository.getFormSubjects(formId);
  return { form, subjects };
};

const getAdmitCardPdfData = async (formId, user) => {
  if (!user.is_faculty) {
    const ownership = await formRepository.verifyOwnership(formId, user.id);
    if (!ownership) {
      throw new Error('Access denied');
    }
    if (!ownership.admit_card_released) {
      throw new Error('Admit Card has not been released yet.');
    }
  }

  const form = await formRepository.getFormDataForPdf(formId);
  if (!form) {
    throw new Error('Form not found');
  }

  const schedules = await formRepository.getFormSchedules(form.exam_id, formId);
  return { form, schedules };
};

const crypto = require('crypto');
const { getRazorpayInstance, getKeyId, getKeySecret } = require('../../core/config/razorpay');

const createRazorpayOrder = async (formId, studentId) => {
  if (!formId) throw new Error('form_id is required');

  const formQuery = await formRepository.getExamFormForPayment(formId, studentId);
  if (!formQuery) {
    throw new Error('Form not found or access denied');
  }

  const { deadline_date, late_fees, form_fees, exam_type, subject_count } = formQuery;
  const count = Number(subject_count) || 0;
  const baseFormFee = Number(form_fees) || 0;
  const type = (exam_type || '').toLowerCase().trim();

  let subjectFee = 0;
  if (type === 'atkt' || type.includes('kt')) {
    subjectFee = count <= 3 ? count * 500 : 1850;
  } else if (type === 'supplementary' || type === 'supplymentry') {
    subjectFee = count * 500;
  } else {
    subjectFee = 0;
  }

  let finalFee = baseFormFee + subjectFee;
  const today = new Date();
  const deadline = new Date(deadline_date);
  deadline.setHours(23, 59, 59, 999);
  
  if (today > deadline) {
    finalFee += (Number(late_fees) || 500);
  }

  const amountInPaise = Math.round(finalFee * 100);
  const currentKeyId = getKeyId();
  const currentSecret = getKeySecret();
  const rzp = getRazorpayInstance();

  let orderId = `order_sim_${Date.now()}_${formId}`;

  if (rzp && currentKeyId && currentSecret && !currentKeyId.includes('Demo')) {
    try {
      const order = await rzp.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `form_rcpt_${formId}`,
        notes: {
          form_id: String(formId),
          student_id: String(studentId)
        }
      });
      orderId = order.id;
    } catch (err) {
      console.warn('Razorpay order creation via API failed, using structured fallback order:', err.message);
    }
  }

  return {
    order_id: orderId,
    amount: finalFee,
    amount_in_paise: amountInPaise,
    currency: 'INR',
    key_id: currentKeyId,
    form_id: formId
  };
};

const verifyRazorpayPayment = async (formId, studentId, paymentData) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
  if (!formId || !razorpay_payment_id) {
    throw new Error('form_id and razorpay_payment_id are required');
  }

  const formQuery = await formRepository.getExamFormForPayment(formId, studentId);
  if (!formQuery) {
    throw new Error('Form not found or access denied');
  }

  const currentKeyId = getKeyId();
  const currentSecret = getKeySecret();

  // If real signature provided and not a demo key, verify HMAC SHA256 signature
  if (razorpay_order_id && razorpay_signature && currentSecret && !currentKeyId.includes('Demo')) {
    const expectedSignature = crypto
      .createHmac('sha256', currentSecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new Error('Invalid Razorpay signature verification failed');
    }
  }

  const { deadline_date, late_fees, form_fees, exam_type, subject_count } = formQuery;
  const count = Number(subject_count) || 0;
  const baseFormFee = Number(form_fees) || 0;
  const type = (exam_type || '').toLowerCase().trim();

  let subjectFee = 0;
  if (type === 'atkt' || type.includes('kt')) {
    subjectFee = count <= 3 ? count * 500 : 1850;
  } else if (type === 'supplementary' || type === 'supplymentry') {
    subjectFee = count * 500;
  } else {
    subjectFee = 0;
  }

  let finalFee = baseFormFee + subjectFee;
  const today = new Date();
  const deadline = new Date(deadline_date);
  deadline.setHours(23, 59, 59, 999);
  
  if (today > deadline) {
    finalFee += (Number(late_fees) || 500);
  }

  await formRepository.updatePaymentStatus(formId, razorpay_payment_id, finalFee);
  return { success: true, form_id: formId, payment_id: razorpay_payment_id, amount_paid: finalFee };
};

const recordPaymentSuccess = async (formId, paymentId, studentId) => {
  const result = await verifyRazorpayPayment(formId, studentId, { razorpay_payment_id: paymentId });
  return result.amount_paid;
};

module.exports = {
  submitExamForm,
  getStatus,
  getFormPdfData,
  getAdmitCardPdfData,
  recordPaymentSuccess,
  createRazorpayOrder,
  verifyRazorpayPayment
};
