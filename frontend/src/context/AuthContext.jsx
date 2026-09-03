import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { loginApi, registerApi, refreshStudentApi } from '../features/auth/api/authApi';

// Synchronously initialize the token from localStorage on module load
const initialToken = localStorage.getItem('eas_token');
if (initialToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]     = useState(() => localStorage.getItem('eas_token'));
  const [student, setStudent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eas_student')); }
    catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  // Attach auth header to all axios requests
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = useCallback(async (email, password, type = 'student') => {
    setLoading(true);
    try {
      const data = await loginApi(email, password, type);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      localStorage.setItem('eas_token',   data.token);
      localStorage.setItem('eas_student', JSON.stringify(data.student));
      setToken(data.token);
      setStudent(data.student);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (formData) => {
    setLoading(true);
    try {
      const data = await registerApi(formData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      localStorage.setItem('eas_token',   data.token);
      localStorage.setItem('eas_student', JSON.stringify(data.student));
      setToken(data.token);
      setStudent(data.student);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('eas_token');
    localStorage.removeItem('eas_student');
    setToken(null);
    setStudent(null);
  }, []);

  const refreshStudent = useCallback(async () => {
    try {
      const data = await refreshStudentApi();
      setStudent(data);
      localStorage.setItem('eas_student', JSON.stringify(data));
    } catch {
      logout();
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ token, student, loading, login, register, logout, refreshStudent }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
