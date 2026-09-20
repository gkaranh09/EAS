import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getAdminExamsApi, createAdminExamApi, toggleExamStatusApi } from '../api/adminApi';
import { FilePlus2, AlertCircle, Link2, ChevronDown, X } from 'lucide-react';

const EXAM_TYPE_COLORS = {
  regular: { bg: '#dbeafe', color: '#1d4ed8', label: 'Regular' },
  supplementary: { bg: '#fef3c7', color: '#b45309', label: 'Supplementary' },
  atkt: { bg: '#fee2e2', color: '#dc2626', label: 'ATKT' }
};

const currentYear = new Date().getFullYear();

const getTypeCode = (type) => {
  if (type === 'regular') return 'REG';
  if (type === 'supplementary') return 'SUPP';
  if (type === 'atkt') return 'ATKT';
  return (type || 'REG').toUpperCase();
};

const buildExamCode = (type, term, year) => {
  return `${getTypeCode(type)}-${term || 'ODD'}-${year || currentYear}`;
};

export default function CreateExam() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [formData, setFormData] = useState({
    exam_type: 'regular',
    semester_term: 'ODD',
    exam_year: String(currentYear),
    exam_code: buildExamCode('regular', 'ODD', String(currentYear)),
    exam_name: '',
    from_date: '',
    deadline_date: '',
    late_deadline1: '',
    late_deadline2: '',
    form_fees: 0,
    late_fees1: 100,
    late_fees2: 500,
    referenced_exam_ids: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);

  const fetchExams = async () => {
    try {
      const data = await getAdminExamsApi();
      setExams(data);
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    } finally {
      setLoadingExams(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      // Auto-form the exam code when exam_type, semester_term, or exam_year changes
      if (name === 'exam_type' || name === 'semester_term' || name === 'exam_year') {
        const nextType = name === 'exam_type' ? value : prev.exam_type;
        const nextTerm = name === 'semester_term' ? value : (prev.semester_term || 'ODD');
        const nextYear = name === 'exam_year' ? value : (prev.exam_year || String(currentYear));
        updated.exam_code = buildExamCode(nextType, nextTerm, nextYear);
      }

      // Reset references when exam type changes to regular
      if (name === 'exam_type' && value === 'regular') {
        updated.referenced_exam_ids = [];
      }
      return updated;
    });
  };

  const toggleReference = (examId) => {
    setFormData(prev => {
      const exists = prev.referenced_exam_ids.includes(examId);
      return {
        ...prev,
        referenced_exam_ids: exists
          ? prev.referenced_exam_ids.filter(id => id !== examId)
          : [...prev.referenced_exam_ids, examId]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (['supplementary', 'atkt'].includes(formData.exam_type) && formData.referenced_exam_ids.length === 0) {
      setError(`${formData.exam_type === 'supplementary' ? 'Supplementary' : 'ATKT'} exams must reference at least one source exam.`);
      setLoading(false);
      return;
    }

    try {
      await createAdminExamApi(formData);
      setSuccess(true);
      setFormData({
        exam_type: 'regular',
        semester_term: 'ODD',
        exam_year: String(currentYear),
        exam_code: buildExamCode('regular', 'ODD', String(currentYear)),
        exam_name: '',
        from_date: '',
        deadline_date: '',
        late_deadline1: '',
        late_deadline2: '',
        form_fees: 0,
        late_fees1: 100,
        late_fees2: 500,
        referenced_exam_ids: []
      });
      fetchExams();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create exam.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (examId) => {
    try {
      await toggleExamStatusApi(examId);
      fetchExams();
    } catch (err) {
      alert('Failed to toggle exam status.');
    }
  };

  const needsReference = ['supplementary', 'atkt'].includes(formData.exam_type);
  // Eligible exams to reference (exclude itself, only regular for supp; any for atkt)
  const eligibleForReference = formData.exam_type === 'supplementary'
    ? exams.filter(e => e.exam_type === 'regular')
    : exams.filter(e => ['supplementary', 'atkt', 'regular'].includes(e.exam_type));

  const refLabel = formData.exam_type === 'supplementary'
    ? 'Reference Regular Exam(s) — Students who failed these exams become eligible'
    : 'Reference Source Exam(s) — Students must have failed ALL of these to be eligible';

  return (
    <Layout>
      <div className="container" style={{ paddingBottom: '4rem', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ color: '#002147', fontWeight: 800, margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FilePlus2 size={24} /> Create &amp; Manage Exams
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
              Register new examinations or toggle active schedules.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/admin/dashboard')}
            style={{ borderColor: '#cbd5e1', color: '#002147', fontWeight: 'bold' }}
          >
            ← Back to Console
          </button>
        </div>


        {error && <div className="alert error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={16} /> {error}</div>}
        {success && <div className="alert success" style={{ marginBottom: '1.5rem', background: '#d1fae5', color: '#065f46', border: '1px solid #10b981', padding: '1rem', borderRadius: '6px' }}>✓ Exam created successfully!</div>}

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', marginBottom: '3rem' }}>
          <h3 style={{ color: '#002147', fontSize: '1.2rem', fontWeight: 700, marginTop: 0, marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Create New Examination</h3>
          <form onSubmit={handleSubmit}>
            
            {/* 1. Exam Configuration Dropdowns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Exam Type</label>
                <select
                  name="exam_type"
                  value={formData.exam_type}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white' }}
                >
                  <option value="regular">Regular (REG)</option>
                  <option value="supplementary">Supplementary (SUPP)</option>
                  <option value="atkt">ATKT (ATKT)</option>
                </select>
                {needsReference && (
                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.78rem', color: '#b45309' }}>
                    ⚠️ Students must fail ALL referenced exams to see this form.
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Semester Term</label>
                <select
                  name="semester_term"
                  value={formData.semester_term}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white' }}
                >
                  <option value="ODD">ODD (Sem 1, 3, 5, 7)</option>
                  <option value="EVEN">EVEN (Sem 2, 4, 6, 8)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Examination Year</label>
                <select
                  name="exam_year"
                  value={formData.exam_year}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white' }}
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029</option>
                  <option value="2030">2030</option>
                </select>
              </div>
            </div>

            {/* 2. Exam Code & Exam Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Exam Code</label>
                <input
                  type="text"
                  name="exam_code"
                  value={formData.exam_code}
                  onChange={handleChange}
                  placeholder="e.g. REG-ODD-2026"
                  required
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 700, color: '#002147' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Exam Name</label>
                <input
                  type="text"
                  name="exam_name"
                  value={formData.exam_name}
                  onChange={handleChange}
                  placeholder="e.g. REGULAR END SEMESTER EXAM 2026"
                  required
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
            </div>

            {/* ── Reference Exam Picker (only for supp/atkt) ── */}
            {needsReference && (
              <div style={{ marginBottom: '1.5rem', border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '6px', padding: '1rem 1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#92400e', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                  <Link2 size={16} /> {refLabel}
                </label>

                {formData.referenced_exam_ids.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    {formData.referenced_exam_ids.map(refId => {
                      const ex = exams.find(e => e.exam_id === refId);
                      return (
                        <span key={refId} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#002147', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600 }}>
                          {ex?.exam_code || refId}
                          <button type="button" onClick={() => toggleReference(refId)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0', lineHeight: 1 }}>
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {eligibleForReference.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>
                    No eligible source exams found. Create a {formData.exam_type === 'supplementary' ? 'regular' : 'supplementary/ATKT'} exam first.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {eligibleForReference.map(ex => {
                      const checked = formData.referenced_exam_ids.includes(ex.exam_id);
                      const tc = EXAM_TYPE_COLORS[ex.exam_type] || EXAM_TYPE_COLORS.regular;
                      return (
                        <label key={ex.exam_id} style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem',
                          border: `1px solid ${checked ? '#002147' : '#e2e8f0'}`,
                          borderRadius: '5px', cursor: 'pointer',
                          background: checked ? '#eff6ff' : '#fff',
                          transition: 'all 0.15s'
                        }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleReference(ex.exam_id)}
                            style={{ accentColor: '#002147', width: '15px', height: '15px' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#002147' }}>{ex.exam_code}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {ex.exam_name?.substring(0, 40)}{ex.exam_name?.length > 40 ? '…' : ''}
                            </div>
                            <span style={{ background: tc.bg, color: tc.color, fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.3rem', borderRadius: '3px', textTransform: 'uppercase' }}>
                              {tc.label}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Start Date</label>
                <input type="date" name="from_date" value={formData.from_date} onChange={handleChange} required style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Deadline Date</label>
                <input type="date" name="deadline_date" value={formData.deadline_date} onChange={handleChange} required style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Late Deadline 1</label>
                <input type="date" name="late_deadline1" value={formData.late_deadline1} onChange={handleChange} required style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Late Deadline 2</label>
                <input type="date" name="late_deadline2" value={formData.late_deadline2} onChange={handleChange} required style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Form Fees (INR)</label>
                <input type="number" name="form_fees" value={formData.form_fees} onChange={handleChange} min="0" required style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Late Fees 1 (INR)</label>
                <input type="number" name="late_fees1" value={formData.late_fees1} onChange={handleChange} min="0" required style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Late Fees 2 (INR)</label>
                <input type="number" name="late_fees2" value={formData.late_fees2} onChange={handleChange} min="0" required style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
            </div>

            <button
              type="submit"
              id="create-exam-btn"
              disabled={loading}
              style={{ width: '100%', padding: '1rem', fontSize: '1rem', background: '#002147', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              {loading ? 'Creating…' : 'Create Examination'}
            </button>
          </form>
        </div>

        {/* Existing Exams Section */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h3 style={{ color: '#002147', fontSize: '1.2rem', fontWeight: 700, marginTop: 0, marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Active Schedules &amp; Management</h3>

          {loadingExams ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Loading active schedules...</div>
          ) : exams.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No examinations created yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontWeight: 'bold', color: '#002147' }}>
                    <th style={{ padding: '0.8rem 1rem' }}>Code</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Name</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Type</th>
                    <th style={{ padding: '0.8rem 1rem' }}>References</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map(ex => {
                    const tc = EXAM_TYPE_COLORS[ex.exam_type] || EXAM_TYPE_COLORS.regular;
                    return (
                      <tr key={ex.exam_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: 600, color: '#002147' }}>{ex.exam_code}</td>
                        <td style={{ padding: '0.9rem 1rem', color: 'var(--text-secondary)' }}>{ex.exam_name}</td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{ background: tc.bg, color: tc.color, padding: '0.2rem 0.5rem', borderRadius: '12px', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase' }}>
                            {tc.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', fontSize: '0.78rem', color: '#64748b', maxWidth: '220px' }}>
                          {Array.isArray(ex.referenced_exams) && ex.referenced_exams.length > 0
                            ? ex.referenced_exams.map(r => (
                              <span key={r.exam_id} style={{ display: 'inline-block', background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.4rem', borderRadius: '3px', marginRight: '0.25rem', marginBottom: '0.2rem', fontSize: '0.72rem', fontWeight: 600 }}>
                                {r.exam_code}
                              </span>
                            ))
                            : <span style={{ color: '#cbd5e1' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{
                            background: ex.is_active ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                            color: ex.is_active ? '#16a34a' : '#dc2626',
                            padding: '0.2rem 0.5rem', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.78rem', textTransform: 'uppercase'
                          }}>
                            {ex.is_active ? 'Open' : 'Closed'}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(ex.exam_id)}
                            style={{ background: ex.is_active ? '#dc2626' : '#16a34a', color: '#ffffff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', width: '80px' }}
                          >
                            {ex.is_active ? 'Close' : 'Open'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
