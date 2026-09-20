import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { loginApi, registerApi, refreshStudentApi, logoutApi } from '../features/auth/api/authApi';

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

  const logout = useCallback(async (notifyBackend = true) => {
    if (notifyBackend && token) {
      try {
        await logoutApi();
      } catch (err) {
        // Ignore backend logout errors if network fails or session already killed
      }
    }
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('eas_token');
    localStorage.removeItem('eas_student');
    setToken(null);
    setStudent(null);
  }, [token]);

  // Setup Axios interceptor to catch session displacement / deactivation
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        const data = error.response?.data;
        const code = data?.code;

        // Skip auth errors on login/register endpoints so login forms can display error messages
        const isAuthEndpoint = error.config?.url?.includes('/api/auth/login') || error.config?.url?.includes('/api/auth/register');

        if (!isAuthEndpoint && (status === 401 || status === 403)) {
          if (code === 'SESSION_SUPERSEDED') {
            logout(false);
            alert(data.message || 'Session expired: Your account was logged in from another device.');
            window.location.href = '/login';
          } else if (code === 'ACCOUNT_DEACTIVATED') {
            logout(false);
            alert(data.message || 'Your account has been deactivated. Please contact the administrator.');
            window.location.href = '/login';
          } else if (code === 'INVALID_TOKEN' || code === 'TOKEN_EXPIRED' || code === 'NO_TOKEN') {
            logout(false);
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  // Real-time Active Session Verification: Heartbeat & Window Focus Check
  useEffect(() => {
    if (!token) return;

    const checkSessionActivity = async () => {
      try {
        await axios.get('/api/auth/session/verify');
      } catch (err) {
        // Interceptor will automatically handle 401 SESSION_SUPERSEDED
      }
    };

    // 1. Check immediately when user switches back to this tab
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        checkSessionActivity();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 2. Periodic background check every 10 seconds
    const interval = setInterval(checkSessionActivity, 10000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      clearInterval(interval);
    };
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
      const status = err.response?.status;
      const retryAfter = err.response?.headers?.['retry-after'] || err.response?.data?.retryAfter;
      return { 
        success: false, 
        status,
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : null,
        message: err.response?.data?.message || 'Login failed' 
      };
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
      const status = err.response?.status;
      const retryAfter = err.response?.headers?.['retry-after'] || err.response?.data?.retryAfter;
      return { 
        success: false, 
        status,
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : null,
        message: err.response?.data?.message || 'Registration failed' 
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStudent = useCallback(async () => {
    try {
      const data = await refreshStudentApi();
      setStudent(data);
      localStorage.setItem('eas_student', JSON.stringify(data));
    } catch {
      logout(false);
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
