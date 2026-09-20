import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getStudentProfileApi, updateStudentProfileApi, getProfileStatusApi } from '../api/studentApi';
import { getCloudinaryUrl, validateImageSize, MAX_IMAGE_SIZE_KB } from '../../../utils/imageUtils';
import { 
  User, Lock, CheckCircle, AlertCircle, ArrowLeft, Save, Loader2, 
  Shield, BookOpen, Phone, MapPin, Edit3, X, RotateCcw,
  Check, Camera, UploadCloud, CheckCircle2, AlertTriangle
} from 'lucide-react';

export default function ProfilePage() {
  const { refreshStudent } = useAuth();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [completeness, setCompleteness] = useState(null);

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
    abc_id: '000000000000',
    profile_image: 'v1789934033/download.jpg'
  });

  const [originalProfile, setOriginalProfile] = useState(null);

  const loadProfileData = async () => {
    try {
      const [data, statusRes] = await Promise.all([
        getStudentProfileApi(),
        getProfileStatusApi().catch(() => null)
      ]);

      const nameParts = (data.full_name || '').trim().split(/\s+/);
      const surname = data.surname || nameParts[0] || '';
      const first_name = data.first_name || nameParts[1] || '';
      const father_name = data.father_name || nameParts[2] || '';
      const mother_name = data.mother_name || nameParts.slice(3).join(' ') || '';

      const initialData = {
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
        full_name: data.full_name || [surname, first_name, father_name, mother_name].filter(Boolean).join(' ').trim(),
        full_name_devnagari: data.full_name_devnagari || 'नाम',
        contact_number: data.contact_number || '',
        address: data.address || '',
        course: data.course || 'CBCGS-HME 2023',
        gender: data.gender || 'Male',
        category: data.category || 'open',
        student_type: data.student_type || 'student',
        pwd: !!data.pwd,
        abc_id: data.abc_id || '000000000000',
        profile_image: data.profile_image || 'v1789934033/download.jpg'
      };

      setProfile(initialData);
      setOriginalProfile(initialData);
      if (statusRes) {
        setCompleteness(statusRes);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load student profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setProfile(prev => {
      const next = { ...prev, [name]: val };
      // Keep full_name dynamically in sync if individual name parts change
      if (['surname', 'first_name', 'father_name', 'mother_name'].includes(name)) {
        next.full_name = [
          name === 'surname' ? val : next.surname,
          name === 'first_name' ? val : next.first_name,
          name === 'father_name' ? val : next.father_name,
          name === 'mother_name' ? val : next.mother_name
        ].filter(Boolean).join(' ').trim();
      }
      return next;
    });
    setError('');
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 100 KB file size validation
    const validation = validateImageSize(file);
    if (!validation.valid) {
      setError(validation.error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      setProfile(prev => ({
        ...prev,
        profile_image: base64Data
      }));
      setSuccessMsg(`Photo selected (${(file.size / 1024).toFixed(1)} KB <= ${MAX_IMAGE_SIZE_KB} KB limit). Click "Save Changes" to apply.`);
    };
    reader.readAsDataURL(file);
  };

  const handleCancel = () => {
    if (originalProfile) {
      setProfile({ ...originalProfile });
    }
    setIsEditing(false);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasChanges = () => {
    if (!originalProfile) return false;
    const editableKeys = [
      'surname', 'first_name', 'father_name', 'mother_name',
      'full_name_devnagari', 'contact_number', 'address',
      'course', 'gender', 'category', 'student_type', 'pwd',
      'abc_id', 'profile_image'
    ];
    return editableKeys.some(k => originalProfile[k] !== profile[k]);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    const combinedFullName = [profile.surname, profile.first_name, profile.father_name, profile.mother_name]
      .filter(Boolean)
      .join(' ')
      .trim() || profile.full_name.trim();

    if (!combinedFullName) {
      setError('Student Name is required (Surname, First Name, Father Name, Mother Name).');
      return;
    }

    if (profile.abc_id && profile.abc_id.trim().length !== 12) {
      setError('ABC ID must be exactly 12 digits (e.g. 124756391470).');
      return;
    }

    setSaving(true);
    try {
      const res = await updateStudentProfileApi({
        full_name: combinedFullName,
        surname: profile.surname,
        first_name: profile.first_name,
        father_name: profile.father_name,
        mother_name: profile.mother_name,
        full_name_devnagari: profile.full_name_devnagari,
        contact_number: profile.contact_number,
        address: profile.address,
        course: profile.course,
        gender: profile.gender,
        category: profile.category,
        student_type: profile.student_type,
        pwd: profile.pwd,
        abc_id: profile.abc_id,
        profile_image: profile.profile_image
      });

      const updated = res.student || res;
      if (updated) {
        const nameParts = (updated.full_name || combinedFullName).trim().split(/\s+/);
        const surname = updated.surname || nameParts[0] || '';
        const first_name = updated.first_name || nameParts[1] || '';
        const father_name = updated.father_name || nameParts[2] || '';
        const mother_name = updated.mother_name || nameParts.slice(3).join(' ') || '';

        const newProfileState = {
          student_id: updated.student_id || profile.student_id,
          email: updated.email || profile.email,
          department_name: updated.department_name || updated.department || profile.department_name,
          program_name: updated.program_name || updated.program || profile.program_name,
          admission_year: updated.admission_year || profile.admission_year,
          current_year: updated.current_year || profile.current_year,
          current_semester: updated.current_semester || profile.current_semester,
          roll_no: updated.roll_no || profile.roll_no,
          division: updated.division || profile.division,

          surname,
          first_name,
          father_name,
          mother_name,
          full_name: updated.full_name || combinedFullName,
          full_name_devnagari: updated.full_name_devnagari || profile.full_name_devnagari,
          contact_number: updated.contact_number || '',
          address: updated.address || '',
          course: updated.course || profile.course,
          gender: updated.gender || profile.gender,
          category: updated.category || profile.category,
          student_type: updated.student_type || profile.student_type,
          pwd: !!updated.pwd,
          abc_id: updated.abc_id || profile.abc_id,
          profile_image: updated.profile_image || profile.profile_image
        };

        setProfile(newProfileState);
        setOriginalProfile(newProfileState);
      }

      // Re-fetch completeness status
      const updatedStatus = await getProfileStatusApi().catch(() => null);
      if (updatedStatus) {
        setCompleteness(updatedStatus);
      }

      if (refreshStudent) {
        await refreshStudent();
      }

      setIsEditing(false);
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

  const categoryLabelMap = {
    open: 'OPEN (General)',
    obc: 'OBC (Other Backward Class)',
    st: 'ST (Scheduled Tribe)',
    sc: 'SC (Scheduled Caste)',
    nt: 'NT (Nomadic Tribe)',
    dt: 'DT (Denotified Tribe)',
    sbc: 'SBC (Special Backward Class)'
  };

  const isProfileComplete = completeness ? completeness.complete : true;

  return (
    <Layout>
      <div style={{ padding: '2rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '880px' }}>
          
          {/* Header & Back Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
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
              onMouseEnter={e => e.currentTarget.style.color = '#002147'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>

            {/* Editing indicator in subheader */}
            {isEditing && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#fef3c7',
                color: '#92400e',
                fontSize: '0.82rem',
                fontWeight: 700,
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                border: '1px solid #fde68a'
              }}>
                <Edit3 size={13} /> Editing Mode Active
              </span>
            )}
          </div>

          {/* Top Hero Banner with Avatar */}
          <div style={{
            background: 'linear-gradient(135deg, #002147 0%, #0a3666 100%)',
            borderRadius: '12px',
            padding: '1.75rem 2rem',
            color: '#ffffff',
            marginBottom: '1.75rem',
            boxShadow: '0 4px 16px rgba(0, 33, 71, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.25rem',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, minWidth: '280px' }}>
              
              {/* Circular Avatar Container with Photo Upload Action */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  id="student-profile-photo"
                  src={getCloudinaryUrl(profile.profile_image)}
                  alt={profile.full_name || 'Student Photo'}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://res.cloudinary.com/dvix6mmnt/image/upload/v1789934033/download.jpg';
                  }}
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #ffffff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    backgroundColor: '#ffffff'
                  }}
                />

                {/* Upload Button Overlay */}
                <button
                  id="upload-photo-btn"
                  type="button"
                  title="Update Profile Photo (Max 100 KB)"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: '2px solid #ffffff',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Camera size={14} />
                </button>

                {/* Hidden File Input (Enforcing Max 100 KB) */}
                <input
                  ref={fileInputRef}
                  id="profile-image-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  style={{ display: 'none' }}
                  onChange={handleImageFileChange}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
                    {profile.full_name || 'Student Profile'}
                  </h1>
                </div>
                {profile.full_name_devnagari && profile.full_name_devnagari !== 'नाम' && (
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.98rem', color: '#cbd5e1', fontWeight: 600 }}>
                    {profile.full_name_devnagari}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
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

            {/* Top Action Button in Hero Banner */}
            <div>
              {!isEditing ? (
                <button
                  id="edit-profile-top-btn"
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setSuccessMsg('');
                    setError('');
                  }}
                  style={{
                    background: '#ffffff',
                    color: '#002147',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                  }}
                >
                  <Edit3 size={16} color="#002147" /> Edit Profile
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    id="cancel-edit-top-btn"
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '6px',
                      padding: '0.55rem 0.95rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'background 0.2s'
                    }}
                  >
                    <X size={15} /> Cancel
                  </button>
                  <button
                    id="save-edit-top-btn"
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    style={{
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.55rem 1.15rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                    }}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin" size={15} /> Saving…
                      </>
                    ) : (
                      <>
                        <Check size={15} /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Profile Completeness Checklist / Alert Banner */}
          {completeness && (
            <div style={{
              background: isProfileComplete ? '#f0fdf4' : '#fffbeb',
              border: isProfileComplete ? '1.5px solid #bbf7d0' : '1.5px solid #fde68a',
              borderRadius: '8px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  {isProfileComplete ? (
                    <CheckCircle2 size={22} color="#16a34a" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle size={22} color="#d97706" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isProfileComplete ? '#15803d' : '#92400e' }}>
                      {isProfileComplete 
                        ? '✓ Profile 100% Complete – Exam Application Unlocked' 
                        : '⚠️ Incomplete Profile Details – Exam Forms Blocked'}
                    </div>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.84rem', color: isProfileComplete ? '#166534' : '#b45309' }}>
                      {isProfileComplete
                        ? 'All mandatory identity and academic credentials are in order. You are eligible to apply for active semester examinations.'
                        : 'You must fill in all required fields below before the examination cell permits exam form submission.'}
                    </p>
                    {!isProfileComplete && completeness.missingLabels?.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                        {completeness.missingLabels.map((lbl, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fca5a5',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            Missing: {lbl}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {!isProfileComplete && !isEditing && (
                  <button
                    type="button"
                    onClick={() => { setIsEditing(true); setSuccessMsg(''); setError(''); }}
                    style={{
                      background: '#d97706',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Edit3 size={14} /> Complete Now
                  </button>
                )}
              </div>
            </div>
          )}

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
                <div className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, color: '#002147' }}>
                  <Shield size={18} color="#002147" /> Academic & Registration Records
                </div>
                <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Lock size={11} /> Locked at Registration
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: '#64748b' }}>
                    Student ID <Lock size={12} color="#94a3b8" />
                  </label>
                  <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#334155', fontWeight: 700, fontSize: '0.9rem' }}>
                    {profile.student_id || '—'}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: '#64748b' }}>
                    Roll Number <Lock size={12} color="#94a3b8" />
                  </label>
                  <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#002147', fontWeight: 700, fontSize: '0.9rem' }}>
                    {profile.roll_no || profile.student_id || '—'}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: '#64748b' }}>
                    Division <Lock size={12} color="#94a3b8" />
                  </label>
                  <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#002147', fontWeight: 700, fontSize: '0.9rem' }}>
                    Division {profile.division || 'A'}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: '#64748b' }}>
                    Official Email <Lock size={12} color="#94a3b8" />
                  </label>
                  <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}>
                    {profile.email || '—'}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: '#64748b' }}>
                    Department <Lock size={12} color="#94a3b8" />
                  </label>
                  <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}>
                    {profile.department_name || '—'}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: '#64748b' }}>
                    Program <Lock size={12} color="#94a3b8" />
                  </label>
                  <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}>
                    {profile.program_name || '—'}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: '#64748b' }}>
                    Admission Year <Lock size={12} color="#94a3b8" />
                  </label>
                  <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}>
                    {profile.admission_year || '—'}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: '#64748b' }}>
                    Current Year & Semester <Lock size={12} color="#94a3b8" />
                  </label>
                  <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}>
                    Year {profile.current_year || 2} (Semester {profile.current_semester || 3})
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={13} /> Admission parameters are permanently recorded and cannot be changed here.
              </div>
            </div>

            {/* ── Section 2: Personal Information (Editable in Edit Mode) ── */}
            <div className="glass-card animate-fadeInUp" style={{ marginBottom: '1.5rem', animationDelay: '0.1s', border: isEditing ? '1.5px solid #3b82f6' : '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <div className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, color: '#002147' }}>
                  <User size={18} color="#2563eb" /> Personal & Contact Details
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => { setIsEditing(true); setSuccessMsg(''); setError(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.2rem 0.5rem'
                    }}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                )}
              </div>

              {!isEditing ? (
                /* ── Personal Details: VIEW MODE ── */
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ background: '#fafaf9', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Surname</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{profile.surname || '—'}</div>
                    </div>

                    <div style={{ background: '#fafaf9', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>First / Own Name</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{profile.first_name || '—'}</div>
                    </div>

                    <div style={{ background: '#fafaf9', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Father's / Husband's Name</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{profile.father_name || '—'}</div>
                    </div>

                    <div style={{ background: '#fafaf9', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Mother's Name</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: profile.mother_name ? '#0f172a' : '#ef4444' }}>
                        {profile.mother_name || 'Missing (Required for Forms)'}
                      </div>
                    </div>

                    <div style={{ background: '#fafaf9', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Full Name (Devnagari / हिन्दी)</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{profile.full_name_devnagari || '—'}</div>
                    </div>

                    <div style={{ background: '#fafaf9', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Contact Number</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: profile.contact_number ? '#0f172a' : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Phone size={14} color={profile.contact_number ? '#2563eb' : '#ef4444'} /> {profile.contact_number || 'Missing (Required for Forms)'}
                      </div>
                    </div>

                    <div style={{ background: '#fafaf9', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Gender</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{profile.gender || 'Male'}</div>
                    </div>
                  </div>

                  <div style={{ background: '#fafaf9', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Residential Address</div>
                    <div style={{ fontSize: '0.92rem', color: profile.address ? '#334155' : '#ef4444', display: 'flex', alignItems: 'flex-start', gap: '0.4rem', lineHeight: 1.5 }}>
                      <MapPin size={15} color={profile.address ? '#ef4444' : '#ef4444'} style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                      <span>{profile.address || 'Missing (Required for Exam Forms)'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Personal Details: EDIT MODE ── */
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    
                    <div className="form-group">
                      <label className="form-label" htmlFor="surname">
                        Surname <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        id="surname"
                        name="surname"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Sharma / Patil"
                        value={profile.surname}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="first_name">
                        First / Own Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        id="first_name"
                        name="first_name"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Rahul / Sneha"
                        value={profile.first_name}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="father_name">
                        Father's / Husband's Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        id="father_name"
                        name="father_name"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Rajesh"
                        value={profile.father_name}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="mother_name">
                        Mother's Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        id="mother_name"
                        name="mother_name"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Sunita"
                        value={profile.mother_name}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="full_name_devnagari">Full Name (Devnagari / हिन्दी)</label>
                      <input
                        id="full_name_devnagari"
                        name="full_name_devnagari"
                        type="text"
                        className="form-input"
                        placeholder="e.g. राहुल राजेश शर्मा"
                        value={profile.full_name_devnagari}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="contact_number">
                        Contact / Mobile Number (10 digits) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        id="contact_number"
                        name="contact_number"
                        type="tel"
                        className="form-input"
                        placeholder="10-digit mobile number"
                        value={profile.contact_number}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="gender">
                        Gender <span style={{ color: '#ef4444' }}>*</span>
                      </label>
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

                  {/* Dynamic Combined Name Preview */}
                  <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    padding: '0.65rem 1rem',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '0.82rem', color: '#0369a1', fontWeight: 600 }}>
                      Generated Full Name for Marksheets & Hall Tickets:
                    </span>
                    <strong style={{ fontSize: '0.92rem', color: '#0c4a6e' }}>
                      {profile.full_name || [profile.surname, profile.first_name, profile.father_name, profile.mother_name].filter(Boolean).join(' ') || '(Please enter name parts)'}
                    </strong>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="address">
                      Residential Address <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      rows={2}
                      className="form-input"
                      placeholder="Enter your complete residential address..."
                      value={profile.address}
                      onChange={handleChange}
                      style={{ resize: 'vertical' }}
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Section 3: Academic Scheme, Social Category & Identification ── */}
            <div className="glass-card animate-fadeInUp" style={{ marginBottom: '1.5rem', animationDelay: '0.15s', border: isEditing ? '1.5px solid #3b82f6' : '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <div className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, color: '#002147' }}>
                  <BookOpen size={18} color="#059669" /> Scheme, Category & ABC ID
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => { setIsEditing(true); setSuccessMsg(''); setError(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#059669',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.2rem 0.5rem'
                    }}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                )}
              </div>

              {!isEditing ? (
                /* ── Scheme & Category: VIEW MODE ── */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div style={{ background: '#fafaf9', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Course Scheme</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{profile.course || 'CBCGS-HME 2023'}</div>
                  </div>

                  <div style={{ background: '#fafaf9', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>ABC ID (12-digit)</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: (profile.abc_id && profile.abc_id !== '000000000000') ? '#002147' : '#ef4444', letterSpacing: '0.5px' }}>
                      {profile.abc_id || 'Missing 12-digit ABC ID'}
                    </div>
                  </div>

                  <div style={{ background: '#fafaf9', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Social Category</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                      {categoryLabelMap[profile.category?.toLowerCase()] || profile.category?.toUpperCase() || 'OPEN'}
                    </div>
                  </div>

                  <div style={{ background: '#fafaf9', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Student Type</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                      {profile.student_type === 'exstudent' ? 'Ex-Student / Alumni' : 'Regular Student'}
                    </div>
                  </div>

                  <div style={{ background: '#fafaf9', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Person with Disability (PWD)</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: profile.pwd ? '#d97706' : '#059669' }}>
                      {profile.pwd ? 'Yes (PWD Category)' : 'No (Standard)'}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Scheme & Category: EDIT MODE ── */
                <div>
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
                      <label className="form-label" htmlFor="abc_id">
                        ABC ID (12 Digits) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        id="abc_id"
                        name="abc_id"
                        type="text"
                        maxLength={12}
                        className="form-input"
                        placeholder="12-digit ABC ID e.g. 124756391470"
                        value={profile.abc_id}
                        onChange={handleChange}
                        required
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
              )}
            </div>

            {/* Submit / Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                {!isEditing ? (
                  <Link to="/dashboard" className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ArrowLeft size={16} /> Return to Dashboard
                  </Link>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: hasChanges() ? '#d97706' : '#64748b', fontWeight: 600 }}>
                    {hasChanges() ? '● You have unsaved changes' : 'No changes made yet'}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {!isEditing ? (
                  <button
                    id="edit-profile-btn"
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setSuccessMsg('');
                      setError('');
                    }}
                    className="btn btn-primary btn-lg"
                    style={{ background: '#002147', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
                  >
                    <Edit3 size={18} /> Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      id="cancel-profile-btn"
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="btn btn-ghost"
                      style={{ borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <RotateCcw size={16} /> Cancel
                    </button>
                    <button
                      id="save-profile-btn"
                      type="submit"
                      className="btn btn-primary btn-lg"
                      disabled={saving}
                      style={{ background: '#002147', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem' }}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="animate-spin" size={18} /> Saving Changes…
                        </>
                      ) : (
                        <>
                          <Save size={18} /> Save Changes
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

          </form>
        </div>
      </div>
    </Layout>
  );
}
