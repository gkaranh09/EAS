import axios from 'axios';

export const getExamsApi = async () => {
  const { data } = await axios.get('/api/exams');
  return data;
};

export const downloadPdfApi = async (formId, token) => {
  const res = await axios.get(`/api/form/pdf/${formId}`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob'
  });
  return res.data;
};

export const downloadAdmitCardApi = async (formId, token) => {
  const res = await axios.get(`/api/form/admit-card/pdf/${formId}`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob'
  });
  return res.data;
};

export const getSubjectsApi = async (branch, semester) => {
  const { data } = await axios.get('/api/subjects', { params: { branch, semester } });
  return data;
};

export const submitFormApi = async (exam_id, subject_ids, repeters = false) => {
  const { data } = await axios.post('/api/form/submit', { exam_id, subject_ids, repeters });
  return data;
};

export const getFormStatusApi = async () => {
  const { data } = await axios.get('/api/form/status');
  return data;
};

export const recordPaymentSuccessApi = async (form_id, razorpay_payment_id) => {
  const { data } = await axios.post('/api/form/payment/success', { form_id, razorpay_payment_id });
  return data;
};

export const createRazorpayOrderApi = async (form_id) => {
  const { data } = await axios.post('/api/form/create-order', { form_id });
  return data;
};

export const verifyRazorpayPaymentApi = async (payload) => {
  const { data } = await axios.post('/api/form/verify-payment', payload);
  return data;
};

export const getSemesterTemplatesApi = async (program_id, semester) => {
  const { data } = await axios.get('/api/admin/semester-templates', {
    params: { program_id, semester }
  });
  return data;
};

export const getStudentProfileApi = async () => {
  const { data } = await axios.get('/api/student/me');
  return data;
};

export const updateStudentProfileApi = async (profileData) => {
  const { data } = await axios.put('/api/student/profile', profileData);
  return data;
};


