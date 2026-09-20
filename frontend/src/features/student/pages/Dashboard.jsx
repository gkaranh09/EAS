import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getExamsApi, downloadPdfApi, downloadAdmitCardApi, getProfileStatusApi } from '../api/studentApi';
import { getCloudinaryUrl } from '../../../utils/imageUtils';
import { 
  CheckCircle, AlertCircle, FileText, CreditCard, Edit, BookOpen, 
  Inbox, User, AlertTriangle, ArrowRight, X, ShieldAlert 
} from 'lucide-react';

function ExamCard({ exam, onFillForm }) {
  const navigate = useNavigate();
  const { token } = useAuth();

  const handleDownloadPdf = async (formId) => {
    try {
      const data = await downloadPdfApi(formId, token);
      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ExamForm_${formId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download PDF error:', err);
      alert('Failed to download Exam Form PDF.');
    }
  };

  const handleDownloadAdmitCard = async (formId) => {
    try {
      const data = await downloadAdmitCardApi(formId, token);
      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AdmitCard_${formId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download Admit Card error:', err);
      alert('Failed to download Admit Card PDF.');
    }
  };

  const typeClass = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'regular') return 'regular';
    if (t === 'supplementary') return 'supplementary';
    if (t.includes('kt') || t.includes('at')) return 'kt';
    return 'repeater';
  };

  const isApplied = exam.apply_completed === true;
  const isPaid = exam.payment_status === 'paid';

  return (
    <div className="exam-card animate-fadeInUp" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
      <div className="exam-card-header">
        <div>
          <div className="exam-card-title" style={{ color: '#002147', fontSize: '1.05rem', fontWeight: '700' }}>
            {exam.exam_name}
          </div>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className={`exam-type-tag ${typeClass(exam.exam_type)}`}>
              {exam.exam_type}
            </span>
            {isApplied ? (
              <span className={`status-badge ${isPaid ? 'applied' : 'pending'}`}>
                {isPaid ? '✓ Applied' : 'Pending Payment'}
              </span>
            ) : (
              <span className="status-badge available">Open</span>
            )}
          </div>
        </div>
        {isApplied && exam.payment_status && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: 600 }}>
              Payment
            </div>
            <span className={`status-badge ${isPaid ? 'applied' : 'pending'}`}>
              {exam.payment_status}
            </span>
          </div>
        )}
      </div>

      {isApplied && (
        isPaid ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
            <div className="alert success" style={{ fontSize: '0.82rem', padding: '0.5rem 0.8rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
              <CheckCircle size={15} /> Submitted and Paid ({exam.form_code ? `Application No: ${exam.form_code}` : `Form #${exam.form_id}`}).
            </div>
            <div style={{
              fontSize: '0.82rem', padding: '0.5rem 0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: exam.is_approved ? '#f0fdf4' : '#f1f5f9',
              border: exam.is_approved ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
              color: exam.is_approved ? '#15803d' : '#475569'
            }}>
              {exam.is_approved ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              Approval Status: <strong>{exam.is_approved ? 'Approved by Faculty' : 'Pending Faculty Approval'}</strong>
            </div>
            <div style={{
              fontSize: '0.82rem', padding: '0.5rem 0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: exam.admit_card_released ? '#f0fdf4' : '#fffbeb',
              border: exam.admit_card_released ? '1px solid #bbf7d0' : '1px solid #fef3c7',
              color: exam.admit_card_released ? '#15803d' : '#b45309'
            }}>
              {exam.admit_card_released ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              Admit Card: <strong>{exam.admit_card_released ? 'Released & Ready' : 'Pending Release'}</strong>
            </div>
          </div>
        ) : (
          <div className="alert warning" style={{ fontSize: '0.82rem', padding: '0.5rem 0.8rem', background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertCircle size={15} /> Application form filled. Payment pending ({exam.form_code ? `Application No: ${exam.form_code}` : `Form #${exam.form_id}`}).
          </div>
        )
      )}

      <div className="exam-card-footer" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {isApplied ? (
          isPaid ? (
            <>
              <button
                id={`pdf-btn-${exam.exam_id}`}
                className="btn btn-success btn-sm"
                onClick={() => handleDownloadPdf(exam.form_id)}
                style={{ borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <FileText size={15} /> Download PDF
              </button>

              {exam.admit_card_released ? (
                <button
                  id={`admit-card-btn-${exam.exam_id}`}
                  className="btn btn-primary btn-sm"
                  onClick={() => handleDownloadAdmitCard(exam.form_id)}
                  style={{ borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#002147' }}
                >
                  <CreditCard size={15} /> Download Admit Card
                </button>
              ) : null}
            </>
          ) : (
            <button
              id={`pay-btn-${exam.exam_id}`}
              className="btn btn-warning btn-sm"
              onClick={() => navigate(`/form/${exam.form_id}/pay`)}
              style={{ borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <CreditCard size={15} /> Complete Payment
            </button>
          )
        ) : (
          <button
            id={`fill-form-btn-${exam.exam_id}`}
            className="btn btn-primary btn-sm"
            onClick={() => onFillForm(exam.exam_id)}
            style={{ borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Edit size={15} /> Apply Now
          </button>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { student } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileStatus, setProfileStatus] = useState(null);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);

  useEffect(() => {
    Promise.all([
      getExamsApi(),
      getProfileStatusApi().catch(err => {
        console.error('Profile status check error:', err);
        return null;
      })
    ])
      .then(([examsData, statusData]) => {
        setExams(examsData || []);
        if (statusData) {
          setProfileStatus(statusData);
        }
      })
      .catch(() => setError('Failed to load exam portal data. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const handleApplyClick = (examId) => {
    if (profileStatus && profileStatus.complete === false) {
      setShowIncompleteModal(true);
      return;
    }
    navigate(`/exam/${examId}/fill`);
  };

  const appliedCount = exams.filter(e => e.apply_completed).length;

  return (
    <Layout>
      <div className="container" style={{ padding: '1.5rem 1rem 3rem' }}>

        {/* ── Profile Incompleteness Alert Banner ── */}
        {profileStatus && profileStatus.complete === false && (
          <div style={{
            background: '#fffbeb',
            border: '1.5px solid #fde68a',
            borderRadius: '10px',
            padding: '1.1rem 1.4rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
              <AlertTriangle size={22} color="#d97706" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#92400e', fontSize: '0.98rem', display: 'block', marginBottom: '0.2rem' }}>
                  Incomplete Student Profile – Action Required
                </strong>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#b45309', lineHeight: 1.45 }}>
                  Please complete your profile details (e.g., {profileStatus.missingLabels?.slice(0, 3).join(', ') || 'Contact Number, Address, ABC ID'}) before applying for exam forms.
                </p>
              </div>
            </div>

            <Link
              to="/profile"
              id="banner-complete-profile-btn"
              className="btn btn-warning"
              style={{
                background: '#d97706',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                padding: '0.55rem 1.15rem',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                textDecoration: 'none'
              }}
            >
              Complete Profile Now <ArrowRight size={15} />
            </Link>
          </div>
        )}

        {/* ── Main Dashboard Layout ────────────────────────────── */}
        <div className="dashboard-layout-wrapper">

          {/* Vertical Side Text */}
          <div className="vertical-sidebar">
            <span className="vertical-text">TCET EXAM PORTAL</span>
            <span className="vertical-text">ESTABLISHED 2001</span>
          </div>

          {/* Main Feed Content */}
          <div className="main-content-area" style={{ width: '100%' }}>

            {/* Student Welcome Header with Avatar Photo */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img
                  src={getCloudinaryUrl(student?.profile_image)}
                  alt={student?.full_name || 'Student Photo'}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://res.cloudinary.com/dvix6mmnt/image/upload/v1789934033/download.jpg';
                  }}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #002147',
                    backgroundColor: '#f8fafc',
                    flexShrink: 0
                  }}
                />
                <div>
                  <h3 style={{ margin: 0, color: '#002147', fontSize: '1.18rem', fontWeight: 800 }}>
                    Welcome back, {student?.full_name}
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                    Student ID: <strong style={{ color: '#002147' }}>{student?.student_id || 'S1234567890'}</strong> • Roll No: <strong style={{ color: '#2563eb' }}>{student?.roll_no || student?.student_id || '1'}</strong> • Div: <strong style={{ color: '#10b981' }}>{student?.division || 'A'}</strong> • Email: {student?.email} • {student?.program || student?.department || 'Engineering'} ({student?.current_year ? `Year ${student.current_year}` : 'Year 2'} - Sem {student?.current_semester || 3})
                  </p>
                </div>
              </div>

              <Link
                to="/profile"
                id="edit-profile-dashboard-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#2563eb',
                  textDecoration: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  transition: 'all 0.2s'
                }}
              >
                <User size={14} /> My Profile
              </Link>
            </div>

            {/* Exam Portal Section */}
            <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2.5px solid #002147', paddingBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', color: '#002147', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BookOpen size={20} /> Active Exam Portal
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="badge-category" style={{ background: 'rgba(0,33,71,0.06)', color: '#002147', border: '1px solid rgba(0,33,71,0.2)' }}>
                    Total: {exams.length}
                  </span>
                  <span className="badge-category" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                    Applied: {appliedCount}
                  </span>
                </div>
              </div>

              {loading && (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Loading active exams from portal…</p>
                </div>
              )}

              {error && (
                <div className="alert error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={16} /> {error}</div>
              )}

              {!loading && !error && exams.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                  <div style={{ display: 'center', justifyContent: 'center', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                    <Inbox size={40} />
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    No active exam applications available at the moment.
                  </p>
                </div>
              )}

              {!loading && !error && exams.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {exams.map(exam => (
                    <ExamCard
                      key={exam.exam_id}
                      exam={exam}
                      onFillForm={handleApplyClick}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* ── Incomplete Profile Blocking Modal ───────────────────────── */}
      {showIncompleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 33, 71, 0.65)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '520px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            border: '1.5px solid #fde68a'
          }}>
            <div style={{
              background: '#fffbeb',
              padding: '1.5rem',
              borderBottom: '1px solid #fef3c7',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#92400e', fontWeight: 800 }}>
                    Profile Completion Required
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#b45309' }}>
                    Exam Application Gate Enforced
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIncompleteModal(false)}
                style={{ background: 'none', border: 'none', color: '#92400e', cursor: 'pointer', padding: '0.2rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                You cannot apply for exam forms until your student profile details are fully completed. The following details are missing from your record:
              </p>

              {profileStatus?.missingLabels && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem'
                }}>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>
                    {profileStatus.missingLabels.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowIncompleteModal(false)}
                  className="btn btn-ghost"
                  style={{ fontWeight: 600, fontSize: '0.88rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="modal-complete-profile-btn"
                  onClick={() => {
                    setShowIncompleteModal(false);
                    navigate('/profile');
                  }}
                  className="btn btn-primary"
                  style={{
                    background: '#002147',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1.25rem'
                  }}
                >
                  Complete Profile Details <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
