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

export const logoutApi = async () => {
  try {
    const { data } = await axios.post('/api/auth/logout');
    return data;
  } catch (err) {
    // Ignore logout errors if session already dead
    return { success: true };
  }
};
