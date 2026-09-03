import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getStudentProfileApi, updateStudentProfileApi } from '../api/studentApi';
import { 
  User, Lock, CheckCircle, AlertCircle, ArrowLeft, Save, Loader2, 
  Shield, BookOpen, GraduationCap, Phone, MapPin, Building, CreditCard, Sparkles, Check
} from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { student: authStudent, refreshStudent } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [profile, setProfile] = useState({
    // Locked / Non-editable fields
    student_id: '',
    email: '',
    department_name: '',
    program_name: '',
    admission_year: '',
    current_year: '',
    current_semester: '',
    roll_no: '',
    division: 'A',

    // Editable fields
    surname: '',
    first_name: '',
    father_name: '',
    mother_name: '',
    full_name: '',
    full_name_devnagari: 'नाम',
    contact_number: '',
    address: '',
    course: 'CBCGS-HME 2023',
    gender: 'Male',
    category: 'open',
    student_type: 'student',
    pwd: false,
    abc_id: '000000000000'
  });

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await getStudentProfileApi();
            const nameParts = (data.full_name || '').trim().split(/\s+/);
            const surname = nameParts[0] || '';
            const first_name = nameParts[1] || '';
            const father_name = nameParts[2] || '';
            const mother_name = nameParts.slice(3).join(' ') || '';

            setProfile({
              student_id: data.student_id || '',
              email: data.email || '',
              department_name: data.department_name || data.department || '',
              program_name: data.program_name || data.program || '',
              admission_year: data.admission_year || '',
              current_year: data.current_year || '',
              current_semester: data.current_semester || '',
              roll_no: data.roll_no || data.student_id || '',
              division: data.division || 'A',

              surname,
              first_name,
              father_name,
              mother_name,
              full_name: data.full_name || '',
              full_name_devnagari: data.full_name_devnagari || 'नाम',
              contact_number: data.contact_number || '',
              address: data.address || '',
              course: data.course || 'CBCGS-HME 2023',
              gender: data.gender || 'Male',
              category: data.category || 'open',
              student_type: data.student_type || 'student',
              pwd: !!data.pwd,
              abc_id: data.abc_id || '000000000000'
            });
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Failed to load student profile.');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const combinedFullName = profile.full_name || [profile.surname, profile.first_name, profile.father_name, profile.mother_name].filter(Boolean).join(' ').trim();

    if (!combinedFullName) {
      setError('Student Name is required.');
      return;
    }

    if (profile.abc_id && profile.abc_id.trim().length !== 12) {
      setError('ABC ID must be exactly 12 digits (e.g. 000000000000).');
      return;
    }

    setSaving(true);
    try {
      await updateStudentProfileApi({
        full_name: combinedFullName,
        full_name_devnagari: profile.full_name_devnagari,
        contact_number: profile.contact_number,
        address: profile.address,
        course: profile.course,
        gender: profile.gender,
        category: profile.category,
        student_type: profile.student_type,
        pwd: profile.pwd,
        abc_id: profile.abc_id
      });

      if (refreshStudent) {
        await refreshStudent();
      }

      setSuccessMsg('Profile updated successfully!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Update profile error:', err);
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="page-wrapper">
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading student profile…</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '2rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '840px' }}>
          
          {/* Header & Back Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <Link
              to="/dashboard"
              id="back-to-dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: 600,
                transition: 'color 0.2s'
              }}
              onMouseEnter={e => e.target.style.color = '#002147'}
              onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
          </div>

          {/* Top Hero Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #002147 0%, #0a3666 100%)',
            borderRadius: '10px',
            padding: '1.75rem',
            color: '#ffffff',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 12px rgba(0, 33, 71, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#f8fafc',
                color: '#002147',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 800,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}>
                {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
                  {profile.full_name || 'Student Profile'}
                </h1>
                {profile.full_name_devnagari && profile.full_name_devnagari !== 'नाम' && (
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.95rem', color: '#cbd5e1', fontWeight: 600 }}>
                    {profile.full_name_devnagari}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  <span style={{ background: 'rgba(255,255,255,0.18)', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700 }}>
                    ID: {profile.student_id}
                  </span>
                  <span style={{ background: '#2563eb', color: '#ffffff', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700 }}>
                    Roll No: {profile.roll_no || profile.student_id}
                  </span>
                  <span style={{ background: '#10b981', color: '#ffffff', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 800 }}>
                    Div: {profile.division || 'A'}
                  </span>
                  <span style={{ background: 'rgba(255,255,255,0.18)', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.78rem' }}>
                    {profile.email}
                  </span>
                  <span style={{ background: '#f59e0b', color: '#78350f', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 800 }}>
                    {profile.current_year ? `Year ${profile.current_year}` : 'Year 2'} - Sem {profile.current_semester || '3'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="alert error" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {successMsg && (
            <div className="alert success" style={{ marginBottom: '1.25rem', background: '#d1fae5', color: '#065f46', border: '1px solid #10b981', padding: '1rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={18} color="#059669" /> {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} id="student-profile-form">

            {/* ── Section 1: Locked Admission & Registration Credentials ── */}
            <div className="glass-card animate-fadeInUp" style={{ marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <div className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={18} color="#002147" /> Academic & Registration Records
                </div>
                <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Lock size={11} /> Locked at Registration
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Student ID <Lock size={12} color="#94a3b8" />
                  </label>
                  <input
                    type="text"
                    value={profile.student_id}
                    disabled
                    className="form-input"
                    style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed', fontWeight: 600 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Roll Number <Lock size={12} color="#94a3b8" />
                  </label>
                  <input
                    type="text"
                    value={profile.roll_no || profile.student_id}
                    disabled
                    className="form-input"
                    style={{ background: '#f8fafc', color: '#002147', cursor: 'not-allowed', fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Division <Lock size={12} color="#94a3b8" />
                  </label>
                  <input
                    type="text"
                    value={profile.division || 'A'}
                    disabled
                    className="form-input"
                    style={{ background: '#f8fafc', color: '#002147', cursor: 'not-allowed', fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Official Email <Lock size={12} color="#94a3b8" />
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="form-input"
                    style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed', fontWeight: 600 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Department <Lock size={12} color="#94a3b8" />
                  </label>
                  <input
                    type="text"
                    value={profile.department_name}
                    disabled
                    className="form-input"
                    style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Program <Lock size={12} color="#94a3b8" />
                  </label>
                  <input
                    type="text"
                    value={profile.program_name}
                    disabled
                    className="form-input"
                    style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Admission Year <Lock size={12} color="#94a3b8" />
                  </label>
                  <input
                    type="text"
                    value={profile.admission_year}
                    disabled
                    className="form-input"
                    style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed', fontWeight: 600 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Current Year & Semester <Lock size={12} color="#94a3b8" />
                  </label>
                  <input
                    type="text"
                    value={`Year ${profile.current_year || 2} (Semester ${profile.current_semester || 3})`}
                    disabled
                    className="form-input"
                    style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed', fontWeight: 600 }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={13} /> Admission parameters are permanently recorded and cannot be changed here.
              </div>
            </div>

            {/* ── Section 2: Personal Information (Editable) ── */}
            <div className="glass-card animate-fadeInUp" style={{ marginBottom: '1.5rem', animationDelay: '0.1s' }}>
              <div className="section-title" style={{ marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={18} color="#2563eb" /> Personal Details
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="surname">Surname</label>
                  <input
                    id="surname"
                    name="surname"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Gupta / Sharma"
                    value={profile.surname}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="first_name">First / Own Name</label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rahul / Ritesh"
                    value={profile.first_name}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="father_name">Father's / Husband's Name</label>
                  <input
                    id="father_name"
                    name="father_name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rajesh"
                    value={profile.father_name}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="mother_name">Mother's Name</label>
                  <input
                    id="mother_name"
                    name="mother_name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Sitara / Sunita"
                    value={profile.mother_name}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="full_name_devnagari">Full Name (Devnagari / हिन्दी)</label>
                  <input
                    id="full_name_devnagari"
                    name="full_name_devnagari"
                    type="text"
                    className="form-input"
                    placeholder="e.g. राहुल शर्मा"
                    value={profile.full_name_devnagari}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="contact_number">Contact / Mobile Number</label>
                  <input
                    id="contact_number"
                    name="contact_number"
                    type="tel"
                    className="form-input"
                    placeholder="10-digit mobile number"
                    value={profile.contact_number}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="gender">Gender</label>
                  <select
                    id="gender"
                    name="gender"
                    className="form-select"
                    value={profile.gender || 'Male'}
                    onChange={handleChange}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="address">Residential Address</label>
                <textarea
                  id="address"
                  name="address"
                  rows={2}
                  className="form-input"
                  placeholder="Enter your complete residential address..."
                  value={profile.address}
                  onChange={handleChange}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            {/* ── Section 3: Academic Scheme, Social Category & Identification ── */}
            <div className="glass-card animate-fadeInUp" style={{ marginBottom: '1.5rem', animationDelay: '0.15s' }}>
              <div className="section-title" style={{ marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={18} color="#059669" /> Scheme, Category & Identification
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="course">Course Scheme</label>
                  <input
                    id="course"
                    name="course"
                    type="text"
                    className="form-input"
                    placeholder="e.g. CBCGS-HME 2023"
                    value={profile.course}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="category">Social Category</label>
                  <select
                    id="category"
                    name="category"
                    className="form-select"
                    value={profile.category || 'open'}
                    onChange={handleChange}
                  >
                    <option value="open">OPEN (General)</option>
                    <option value="obc">OBC (Other Backward Class)</option>
                    <option value="st">ST (Scheduled Tribe)</option>
                    <option value="sc">SC (Scheduled Caste)</option>
                    <option value="nt">NT (Nomadic Tribe)</option>
                    <option value="dt">DT (Denotified Tribe)</option>
                    <option value="sbc">SBC (Special Backward Class)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="student_type">Student Type</label>
                  <select
                    id="student_type"
                    name="student_type"
                    className="form-select"
                    value={profile.student_type || 'student'}
                    onChange={handleChange}
                  >
                    <option value="student">Regular Student</option>
                    <option value="exstudent">Ex-Student / Alumni</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="abc_id">ABC ID (12 Digits)</label>
                  <input
                    id="abc_id"
                    name="abc_id"
                    type="text"
                    maxLength={12}
                    className="form-input"
                    placeholder="12-digit Academic Bank of Credits ID"
                    value={profile.abc_id}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* PWD Checkbox */}
              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  id="pwd"
                  name="pwd"
                  type="checkbox"
                  checked={profile.pwd}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#002147' }}
                />
                <label htmlFor="pwd" style={{ cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#002147', margin: 0 }}>
                  Person with Disability (PWD)
                </label>
              </div>
            </div>

            {/* Submit Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <Link to="/dashboard" className="btn btn-ghost">
                Cancel
              </Link>
              <button
                id="save-profile-btn"
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={saving}
                style={{ background: '#002147', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Saving Changes…
                  </>
                ) : (
                  <>
                    <Save size={18} /> Save Profile
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </Layout>
  );
}
