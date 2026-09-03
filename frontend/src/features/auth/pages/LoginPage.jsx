import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../../layouts/Layout.jsx';
import { AlertCircle, GraduationCap, Briefcase, Loader2 } from 'lucide-react';

const GoogleIcon = () => (
  <svg className="google-logo-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

export default function LoginPage() {
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [userType, setUserType] = useState('student'); // 'student' | 'faculty'
  const [error, setError] = useState('');
  const [departmentsList, setDepartmentsList] = useState([]);
  const [programsList, setProgramsList] = useState([]);
  const [form, setForm] = useState({
    surname: '',
    first_name: '',
    father_name: '',
    mother_name: '',
    full_name: '',
    email: '1234567890@tcetmumbai.in', // pre-fill student demo
    password: 'password123',
    department: 'Computer Engineering',
    department_id: '1',
    program: 'Bachelor of Engineering - Computer Engineering',
    program_id: '1',
    admission_year: '2023',
    current_year: 'SE',
    current_semester: '3',
    role: 'Coordinator',
  });

  useEffect(() => {
    const fetchDeptsAndProgs = async () => {
      try {
        const [deptsRes, progsRes] = await Promise.all([
          axios.get('/api/programs/departments'),
          axios.get('/api/programs')
        ]);
        setDepartmentsList(deptsRes.data || []);
        setProgramsList(progsRes.data || []);
      } catch (err) {
        console.error('Failed to load departments and programs:', err);
      }
    };
    fetchDeptsAndProgs();
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const EMAIL_REGEX = /^\d{10}@tcetmumbai\.in$/i;
    if (!EMAIL_REGEX.test(form.email.trim())) {
      setError('Email must be a 10-digit number followed by @tcetmumbai.in (e.g. 1234567890@tcetmumbai.in)');
      return;
    }

    let result;
    if (mode === 'login') {
      result = await login(form.email, form.password, userType);
    } else {
      // Registration is strictly for Students (All employees/admins are registered by Exam Center Head)
      if (!form.surname || !form.first_name || !form.father_name || !form.mother_name || !form.email || !form.password || !form.department_id || !form.program_id || !form.admission_year || !form.current_year || !form.current_semester) {
        setError('Please fill in all name and registration fields.');
        return;
      }

      const combinedName = [form.surname, form.first_name, form.father_name, form.mother_name]
        .filter(Boolean).join(' ').trim();

      result = await register({
        surname: form.surname,
        first_name: form.first_name,
        father_name: form.father_name,
        mother_name: form.mother_name,
        full_name: combinedName,
        email: form.email,
        password: form.password,
        department_id: form.department_id,
        program_id: form.program_id,
        department: form.department,
        program: form.program,
        admission_year: form.admission_year,
        current_year: form.current_year,
        current_semester: form.current_semester
      });
    }

    if (result.success) {
      const loggedInUser = JSON.parse(localStorage.getItem('eas_student'));
      if (loggedInUser && (loggedInUser.is_faculty || loggedInUser.is_employee)) {
        window.location.href = '/admin/dashboard';
      } else {
        window.location.href = '/dashboard';
      }
    } else {
      setError(result.message);
    }
  };

  const handleGoogleLogin = () => {
    if (userType === 'student') {
      setForm({
        ...form,
        email: '1234567890@tcetmumbai.in',
        password: 'password123',
      });
      setError('Google authentication active. Click LOGIN to proceed with student demo credentials.');
    } else {
      setForm({
        ...form,
        email: '9876543210@tcetmumbai.in',
        password: 'password123',
      });
      setError('Google authentication active. Click LOGIN to proceed with employee demo credentials.');
    }
  };

  const handleTabChange = (type) => {
    setUserType(type);
    setError('');
    if (type === 'student') {
      setForm({
        full_name: '',
        email: '1234567890@tcetmumbai.in',
        password: 'password123',
        address: '',
        category: '',
        department: 'Computer Engineering',
        role: 'coordinator'
      });
    } else {
      setForm({
        full_name: '',
        email: '9876543210@tcetmumbai.in',
        password: 'password123',
        address: '',
        category: '',
        department: 'Computer Engineering',
        role: 'coordinator'
      });
    }
  };

  return (
    <Layout>
      <div className="login-split-container">

        {/* ── Left Pane: Navy Banner ─────────────────────────────── */}
        <div className="login-left-banner">
          <div className="login-left-content">
            <span className="login-left-badge">Secure Access</span>
            <h1 className="login-left-title">
              TCET Exam<br />
              <span>Processing System</span>
            </h1>
            <p className="login-left-desc">
              Bridging academic administration and student forms seamlessly. Manage and submit registration parameters, track fee invoices, and download admit cards efficiently.
            </p>
          </div>

          <div className="login-left-footer">
            {mode === 'login' ? (
              <>
                New student?{' '}
                <a
                  href="#register"
                  id="switch-to-register"
                  onClick={(e) => {
                    e.preventDefault();
                    setUserType('student');
                    setMode('register');
                    setError('');
                  }}
                >
                  Student Registration →
                </a>
              </>
            ) : (
              <>
                Already registered?{' '}
                <a
                  href="#login"
                  id="switch-to-login"
                  onClick={(e) => {
                    e.preventDefault();
                    setMode('login');
                    setError('');
                  }}
                >
                  Sign In →
                </a>
              </>
            )}
          </div>
        </div>

        {/* ── Right Pane: White Form Panel ───────────────────────── */}
        <div className="login-right-panel">
          <div className="login-panel-inner">

            <h2 className="login-panel-title">
              {mode === 'login' ? 'Account Login' : 'Student Registration'}
            </h2>
            <p className="login-panel-subtitle">
              {mode === 'login'
                ? 'Access the examination processing portal with your institutional credentials.'
                : 'Create your TCET student profile to submit examination forms and download admit cards.'}
            </p>

            {/* Error message */}
            {error && (
              <div className="alert error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
                <AlertCircle size={18} style={{ marginRight: '0.5rem', flexShrink: 0 }} /> {error}
              </div>
            )}

            {/* Form Tabs (Only shown in Login mode) */}
            {mode === 'login' && (
              <div className="login-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  className={`login-tab-btn ${userType === 'student' ? 'active' : ''}`}
                  onClick={() => handleTabChange('student')}
                  style={{ flex: 1, padding: '0.6rem', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', background: userType === 'student' ? '#002147' : '#ffffff', color: userType === 'student' ? '#ffffff' : '#002147', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <GraduationCap size={18} /> Student
                </button>
                <button
                  type="button"
                  className={`login-tab-btn ${userType === 'faculty' ? 'active' : ''}`}
                  onClick={() => handleTabChange('faculty')}
                  style={{ flex: 1, padding: '0.6rem', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', background: userType === 'faculty' ? '#002147' : '#ffffff', color: userType === 'faculty' ? '#ffffff' : '#002147', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Briefcase size={18} /> Employee / Admin
                </button>
              </div>
            )}

            {/* Google SSO Login (Temporarily hidden until OAuth is integrated)
          <button type="button" className="google-btn" onClick={handleGoogleLogin}>
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>

          <div className="divider-text">OR ENTER YOUR DETAILS BELOW</div>
          */}

            {/* Credentials Form */}
            <form className="login-form" onSubmit={handleSubmit} id="auth-form">

              {mode === 'register' && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="surname">Surname</label>
                      <input
                        id="surname"
                        name="surname"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Gupta / Sharma"
                        value={form.surname}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="first_name">First / Own Name</label>
                      <input
                        id="first_name"
                        name="first_name"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Rahul / Ritesh"
                        value={form.first_name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="father_name">Father's / Husband's Name</label>
                      <input
                        id="father_name"
                        name="father_name"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Rajesh"
                        value={form.father_name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="mother_name">Mother's Name</label>
                      <input
                        id="mother_name"
                        name="mother_name"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Sitara / Sunita"
                        value={form.mother_name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="text"
                  className="form-input"
                  placeholder={userType === 'student' ? '1234567890@tcetmumbai.in' : '9876543210@tcetmumbai.in'}
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" htmlFor="password">Password</label>
                  {mode === 'login' && (
                    <span
                      className="forgot-password-link"
                      onClick={() => setError('Password reset instructions will be sent to your registered email.')}
                    >
                      Forgot Password?
                    </span>
                  )}
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>

              {mode === 'register' && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="student_department">Department</label>
                    <select
                      id="student_department"
                      name="department_id"
                      className="form-select"
                      value={form.department_id || '1'}
                      onChange={(e) => {
                        const deptId = e.target.value;
                        const deptObj = departmentsList.find(d => String(d.department_id) === String(deptId));
                        const filteredProgs = programsList.filter(p => String(p.department_id) === String(deptId));
                        const firstProg = filteredProgs[0] ? filteredProgs[0].program_id : '';
                        setForm(prev => ({
                          ...prev,
                          department_id: deptId,
                          department: deptObj ? deptObj.department_name : prev.department,
                          program_id: firstProg,
                          program: filteredProgs[0] ? filteredProgs[0].program_name : ''
                        }));
                      }}
                      required
                    >
                      {departmentsList.map(dept => (
                        <option key={dept.department_id} value={dept.department_id}>
                          {dept.department_name} ({dept.department_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="student_program">Program</label>
                    <select
                      id="student_program"
                      name="program_id"
                      className="form-select"
                      value={form.program_id || '1'}
                      onChange={(e) => {
                        const progId = e.target.value;
                        const progObj = programsList.find(p => String(p.program_id) === String(progId));
                        setForm(prev => ({
                          ...prev,
                          program_id: progId,
                          program: progObj ? progObj.program_name : prev.program
                        }));
                      }}
                      required
                    >
                      {programsList
                        .filter(p => !form.department_id || String(p.department_id) === String(form.department_id))
                        .map(prog => (
                          <option key={prog.program_id} value={prog.program_id}>
                            {prog.program_name}
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="admission_year">Admission Year</label>
                      <select
                        id="admission_year"
                        name="admission_year"
                        className="form-select"
                        value={form.admission_year}
                        onChange={handleChange}
                        required
                      >
                        {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(yr => (
                          <option key={yr} value={String(yr)}>{yr}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="current_year">Current Year</label>
                      <select
                        id="current_year"
                        name="current_year"
                        className="form-select"
                        value={form.current_year}
                        onChange={handleChange}
                        required
                      >
                        <option value="FE">FE – First Year</option>
                        <option value="SE">SE – Second Year</option>
                        <option value="TE">TE – Third Year</option>
                        <option value="BE">BE – Final Year</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="current_semester">Semester</label>
                      <select
                        id="current_semester"
                        name="current_semester"
                        className="form-select"
                        value={form.current_semester}
                        onChange={handleChange}
                        required
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                          <option key={s} value={String(s)}>Sem {s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <button
                id="auth-submit-btn"
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                style={{ background: '#002147', borderRadius: '4px', marginTop: '1.5rem', fontWeight: 'bold' }}
                disabled={loading}
              >
                {loading
                  ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Loader2 className="animate-spin" size={18} /> Please wait…
                    </span>
                  )
                  : mode === 'login' ? 'LOGIN' : 'CREATE STUDENT ACCOUNT'}
              </button>
            </form>

            {/* Helper notes */}
            {mode === 'login' ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2rem' }}>
                Demo credentials: <strong style={{ color: 'var(--text-secondary)' }}>{userType === 'student' ? '1234567890@tcetmumbai.in' : '9876543210@tcetmumbai.in'}</strong> / <strong style={{ color: 'var(--text-secondary)' }}>password123</strong>
              </p>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '1.5rem' }}>
                Faculty / Staff accounts are managed & registered exclusively by the <strong>Exam Center Head</strong>.
              </p>
            )}

          </div>
        </div>

      </div>
    </Layout>
  );
}
