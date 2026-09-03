import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getAdminExamsApi, createAdminExamApi, toggleExamStatusApi } from '../api/adminApi';
import { FilePlus2, AlertCircle } from 'lucide-react';

export default function CreateExam() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [formData, setFormData] = useState({
    exam_code: '',
    exam_name: '',
    from_date: '',
    deadline_date: '',
    late_deadline: '',
    form_fees: 0,
    late_fees: 500,
    exam_type: 'regular'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Exam list states
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await createAdminExamApi(formData);
      setSuccess(true);
      setFormData({
        exam_code: '',
        exam_name: '',
        from_date: '',
        deadline_date: '',
        late_deadline: '',
        form_fees: 0,
        late_fees: 500,
        exam_type: 'regular'
      });
      fetchExams(); // Refresh the list of exams
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create exam.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (examId) => {
    try {
      await toggleExamStatusApi(examId);
      fetchExams(); // Refresh the list
    } catch (err) {
      alert('Failed to toggle exam status.');
    }
  };

  return (
    <Layout>
      <div className="container" style={{ paddingBottom: '4rem', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ color: '#002147', fontWeight: 800, margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FilePlus2 size={24} /> Create & Manage Exams
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Exam Code</label>
                <input
                  type="text"
                  name="exam_code"
                  value={formData.exam_code}
                  onChange={handleChange}
                  placeholder="e.g. COMP-SEM3-REG-2026"
                  required
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Exam Type</label>
                <select
                  name="exam_type"
                  value={formData.exam_type}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                >
                  <option value="regular">Regular</option>
                  <option value="ATKT">ATKT</option>
                  <option value="supplementary">Supplementary</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Exam Name</label>
              <input
                type="text"
                name="exam_name"
                value={formData.exam_name}
                onChange={handleChange}
                placeholder="e.g. B.E. Computer Engineering Semester III Regular Examination"
                required
                style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Start Date</label>
                <input
                  type="date"
                  name="from_date"
                  value={formData.from_date}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Deadline Date</label>
                <input
                  type="date"
                  name="deadline_date"
                  value={formData.deadline_date}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Late Deadline Date</label>
                <input
                  type="date"
                  name="late_deadline"
                  value={formData.late_deadline}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Form Fees (INR)</label>
                <input
                  type="number"
                  name="form_fees"
                  value={formData.form_fees}
                  onChange={handleChange}
                  min="0"
                  required
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Late Fees (INR)</label>
                <input
                  type="number"
                  name="late_fees"
                  value={formData.late_fees}
                  onChange={handleChange}
                  min="0"
                  required
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '1rem', fontSize: '1rem', background: '#002147', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              {loading ? 'Creating...' : 'Create Examination'}
            </button>
          </form>
        </div>

        {/* Existing Exams Section */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h3 style={{ color: '#002147', fontSize: '1.2rem', fontWeight: 700, marginTop: 0, marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Active Schedules & Management</h3>
          
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
                    <th style={{ padding: '0.8rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map(ex => (
                    <tr key={ex.exam_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem', fontWeight: 600, color: '#002147' }}>{ex.exam_code}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{ex.exam_name}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          background: ex.is_active ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
                          color: ex.is_active ? '#16a34a' : '#dc2626', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '12px', 
                          fontWeight: 'bold',
                          fontSize: '0.78rem',
                          textTransform: 'uppercase'
                        }}>
                          {ex.is_active ? 'Open' : 'Closed'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(ex.exam_id)}
                          style={{
                            background: ex.is_active ? '#dc2626' : '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            width: '80px'
                          }}
                        >
                          {ex.is_active ? 'Close' : 'Open'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
