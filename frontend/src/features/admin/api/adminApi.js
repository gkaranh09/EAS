import axios from 'axios';

// =======================
// EMPLOYEES
// =======================
export const getEmployeesApi = async () => (await axios.get('/api/admin/employees')).data;
export const addEmployeeApi = async (data) => (await axios.post('/api/admin/employees', data)).data;
export const toggleActiveApi = async (id, active) => (await axios.patch(`/api/admin/employees/${id}/toggle-active`, { active })).data;
export const updateRoleApi = async (id, role) => (await axios.patch(`/api/admin/employees/${id}/role`, { role })).data;

// =======================
// EXAMS & SUBJECTS
// =======================
export const getAdminExamsApi = async () => (await axios.get('/api/admin/exams')).data;
export const createAdminExamApi = async (data) => (await axios.post('/api/admin/exams', data)).data;
export const toggleExamStatusApi = async (id) => (await axios.patch(`/api/admin/exams/${id}/toggle-status`, {})).data;

export const createAdminSubjectApi = async (data) => (await axios.post('/api/admin/subjects', data)).data;
export const getSubjectsByBranchSemApi = async (branch, semester) => {
  return (await axios.get(`/api/subjects?branch=${encodeURIComponent(branch)}&semester=${semester}`)).data;
};

// =======================
// SCHEDULES
// =======================
export const getAdminSchedulesApi = async (exam_id, branch, semester) => {
  const params = { exam_id };
  if (branch && branch !== 'ALL' && branch !== 'undefined') params.branch = branch;
  if (semester && semester !== 'undefined') params.semester = semester;
  return (await axios.get('/api/admin/schedules', { params })).data;
};
export const createAdminScheduleApi = async (exam_id, schedules) => (await axios.post('/api/admin/schedules', { exam_id, schedules })).data;

// =======================
// FORMS & ADMIT CARDS
// =======================
export const getAdminFormsApi = async (params = {}) => (await axios.get('/api/admin/forms', { params })).data;
export const getAdminFormSubjectsApi = async (formId) => (await axios.get(`/api/admin/forms/${formId}/subjects`)).data;
export const approveFormsApi = async (data) => (await axios.post('/api/admin/forms/approve', data)).data;
export const admitCardFormsApi = async (data) => (await axios.post('/api/admin/forms/admit-card', data)).data;
export const downloadPdfApi = async (formId, token) => {
  return (await axios.get(`/api/form/pdf/${formId}`, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' })).data;
};
export const downloadAdmitCardPdfApi = async (formId, token) => {
  return (await axios.get(`/api/form/admit-card/pdf/${formId}`, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' })).data;
};

// =======================
// DASHBOARD & ANALYTICS
// =======================
export const getAdminStatsApi = async () => (await axios.get('/api/admin/stats')).data;
export const getAdminCountAnalysisApi = async (examId) => (await axios.get(`/api/admin/count-analysis/${examId}`)).data;

// =======================
// SEMESTER TEMPLATES
// =======================
export const getTemplatesApi = async (program_id, semester) =>
  (await axios.get(`/api/admin/semester-templates?program_id=${program_id}&semester=${semester}`)).data;
export const getTemplateByIdApi = async (id) =>
  (await axios.get(`/api/admin/semester-templates/${id}`)).data;
export const createTemplateApi = async (data) =>
  (await axios.post('/api/admin/semester-templates', data)).data;
export const updateTemplateApi = async (id, data) =>
  (await axios.put(`/api/admin/semester-templates/${id}`, data)).data;
export const deleteTemplateApi = async (id) =>
  (await axios.delete(`/api/admin/semester-templates/${id}`)).data;

