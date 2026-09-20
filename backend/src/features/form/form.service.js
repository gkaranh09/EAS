const formRepository = require('./form.repository');
const studentService = require('../student/student.service');
const crypto = require('crypto');
const { getRazorpayInstance, getKeyId, getKeySecret } = require('../../core/config/razorpay');

const calculateFormFee = (examDetails, count) => {
  const { form_fees, deadline_date, late_deadline1, late_deadline2, late_fees1, late_fees2, exam_type } = examDetails;
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
  
  const ld1 = new Date(late_deadline1);
  ld1.setHours(23, 59, 59, 999);
  
  const ld2 = new Date(late_deadline2);
  ld2.setHours(23, 59, 59, 999);
  
  if (today > ld2) {
    throw new Error('Form filling deadline has passed');
  } else if (today > ld1) {
    finalFee += (Number(late_fees2) || 0);
  } else if (today > deadline) {
    finalFee += (Number(late_fees1) || 0);
  }

  return finalFee;
};

const submitExamForm = async (data, studentId) => {
  const { exam_id, subject_ids } = data;

  if (!exam_id || !Array.isArray(subject_ids) || subject_ids.length === 0) {
    throw new Error('exam_id and at least one subject_id are required');
  }

  const student = await formRepository.checkStudentExists(studentId);
  if (!student) {
    throw new Error('Your session has expired because the database was reset. Please Sign Out and log in again.');
  }

  // 0. Profile Completeness Gate Check
  const profileStatus = await studentService.checkProfileCompleteness(studentId);
  if (!profileStatus.complete) {
    const missingStr = profileStatus.missingLabels ? profileStatus.missingLabels.join(', ') : 'Required profile details';
    const error = new Error(`Form submission blocked: Please complete your student profile before applying for exams. Incomplete fields: ${missingStr}`);
    error.statusCode = 400;
    error.missingFields = profileStatus.missingFields;
    error.missingLabels = profileStatus.missingLabels;
    throw error;
  }

  // 1. Hold-List Restriction Check
  const hold = await formRepository.checkStudentHold(studentId);
  if (hold && hold.restricted) {
    const error = new Error('Form submission blocked: Your account has an active hold restriction. Please contact Counter No. 8.');
    error.statusCode = 403;
    throw error;
  }

  // 2. Duplicate Submission Check
  const dup = await formRepository.getExamFormDuplicate(exam_id, studentId);
  if (dup) {
    const error = new Error('You have already applied for this exam');
    error.form_id = dup.form_id;
    error.form_code = dup.form_code;
    error.statusCode = 409;
    throw error;
  }

  // 3. Exam Details & Active Status Check
  const examDetails = await formRepository.getExamDetails(exam_id);
  if (!examDetails) {
    const error = new Error('Exam not found');
    error.statusCode = 404;
    throw error;
  }

  if (examDetails.is_active === false) {
    const error = new Error('Exam is currently closed or inactive');
    error.statusCode = 400;
    throw error;
  }

  // 4. ATKT / Supplementary Prerequisite Failure Eligibility Check
  const eligibility = await formRepository.checkStudentExamEligibility(
    studentId,
    student.abc_id,
    exam_id,
    examDetails.exam_type
  );
  if (!eligibility.eligible) {
    const error = new Error(eligibility.reason || 'You are not eligible to register for this exam.');
    error.statusCode = 403;
    throw error;
  }

  const count = subject_ids.length;
  const finalFee = calculateFormFee(examDetails, count);

  const initialPaymentStatus = finalFee === 0 ? 'paid' : 'pending';
  const isRepeater = Boolean(data.repeters || data.is_repeater);

  const { form_id, form_code } = await formRepository.submitForm(
    exam_id,
    studentId,
    subject_ids,
    initialPaymentStatus,
    finalFee,
    isRepeater
  );

  return { form_id, form_code, payment_status: initialPaymentStatus, amount_due: finalFee };
};

const getStatus = async (studentId) => {
  return await formRepository.getFormStatus(studentId);
};

const getFormPdfData = async (formIdentifier, user) => {
  if (!user.is_faculty) {
    const ownership = await formRepository.verifyOwnership(formIdentifier, user.id);
    if (!ownership) {
      throw new Error('Access denied');
    }
  }

  const form = await formRepository.getFormDataForPdf(formIdentifier);
  if (!form) {
    throw new Error('Form not found');
  }

  // Coordinator Program Scope Check
  if (user.is_faculty && user.role === 'coordinator') {
    const allowedPrograms = Array.isArray(user.allowed_program_ids) ? user.allowed_program_ids : [];
    if (!allowedPrograms.includes(form.program_id)) {
      throw new Error('Access denied: You are not authorized to view exam forms outside your assigned coordinate programs.');
    }
  }

  const subjects = await formRepository.getFormSubjects(formIdentifier);
  return { form, subjects };
};

const getAdmitCardPdfData = async (formIdentifier, user) => {
  const form = await formRepository.getFormDataForPdf(formIdentifier);
  if (!form) {
    throw new Error('Form not found');
  }

  if (!form.is_approved) {
    throw new Error('Admit Card has not been approved yet.');
  }

  if (!form.admit_card_released) {
    throw new Error('Admit Card has not been released yet.');
  }

  // Check if student has an active hold restriction
  const hold = await formRepository.checkStudentHold(form.internal_student_id);
  if (hold && hold.restricted) {
    throw new Error('Admit Card access blocked: Student has an active hold restriction. Please contact Counter No. 8.');
  }

  // Student ownership check
  if (!user.is_faculty) {
    if (form.internal_student_id !== user.id) {
      throw new Error('Access denied');
    }
  }

  // Coordinator scope check
  if (user.is_faculty && user.role === 'coordinator') {
    const allowedPrograms = Array.isArray(user.allowed_program_ids) ? user.allowed_program_ids : [];
    if (!allowedPrograms.includes(form.program_id)) {
      throw new Error('Access denied: You are not authorized to access admit cards outside your assigned coordinate programs.');
    }
  }

  // Admit card must have an active generated record from official admin release
  if (!form.admit_card_number) {
    throw new Error('Admit Card has not been officially released by the examination cell yet.');
  }

  const schedules = await formRepository.getFormSchedules(form.exam_id, formIdentifier);
  return { form, schedules };
};

const createRazorpayOrder = async (formIdentifier, studentId) => {
  if (!formIdentifier) throw new Error('form_id is required');

  const formQuery = await formRepository.getExamFormForPayment(formIdentifier, studentId);
  if (!formQuery) {
    throw new Error('Form not found or access denied');
  }

  if (formQuery.payment_status === 'paid') {
    throw new Error('Exam form fee is already paid');
  }

  const count = Number(formQuery.subject_count) || 0;
  const finalFee = calculateFormFee(formQuery, count);

  const amountInPaise = Math.round(finalFee * 100);
  const currentKeyId = getKeyId();
  const currentSecret = getKeySecret();
  const rzp = getRazorpayInstance();

  let orderId = `order_sim_${Date.now()}_${formQuery.form_id}`;

  if (rzp && currentKeyId && currentSecret && !currentKeyId.includes('Demo')) {
    try {
      const order = await rzp.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `form_rcpt_${formQuery.form_id}`,
        notes: {
          form_id: String(formQuery.form_id),
          form_code: String(formQuery.form_code || ''),
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
    form_id: formQuery.form_id,
    form_code: formQuery.form_code
  };
};

const verifyRazorpayPayment = async (formIdentifier, studentId, paymentData) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
  if (!formIdentifier || !razorpay_payment_id) {
    throw new Error('form_id and razorpay_payment_id are required');
  }

  const formQuery = await formRepository.getExamFormForPayment(formIdentifier, studentId);
  if (!formQuery) {
    throw new Error('Form not found or access denied');
  }

  if (formQuery.payment_status === 'paid') {
    return {
      success: true,
      form_id: formQuery.form_id,
      form_code: formQuery.form_code,
      message: 'Payment already verified and confirmed',
      amount_paid: formQuery.amount_paid || 0
    };
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

  const count = Number(formQuery.subject_count) || 0;
  const finalFee = calculateFormFee(formQuery, count);

  await formRepository.updatePaymentStatus(formQuery.form_id, razorpay_payment_id, finalFee);
  return {
    success: true,
    form_id: formQuery.form_id,
    form_code: formQuery.form_code,
    payment_id: razorpay_payment_id,
    amount_paid: finalFee
  };
};

const recordPaymentSuccess = async (formIdentifier, paymentId, studentId) => {
  const result = await verifyRazorpayPayment(formIdentifier, studentId, { razorpay_payment_id: paymentId });
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
