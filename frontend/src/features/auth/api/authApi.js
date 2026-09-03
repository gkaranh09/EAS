import axios from 'axios';

export const loginApi = async (email, password, type = 'student') => {
  const endpoint = (type === 'faculty' || type === 'employee') ? '/api/auth/employee/login' : '/api/auth/login';
  const { data } = await axios.post(endpoint, { email, password });
  return data;
};

export const registerApi = async (formData) => {
  const { data } = await axios.post('/api/auth/register', formData);
  return data;
};

export const refreshStudentApi = async () => {
  const { data } = await axios.get('/api/student/me');
  return data;
};
