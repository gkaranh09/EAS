import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getAdminExamsApi, getAdminCountAnalysisApi } from '../api/adminApi';
import { BarChart3, AlertCircle } from 'lucide-react';

export default function CountAnalysis() {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [subjectCounts, setSubjectCounts] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const data = await getAdminExamsApi();
        setExams(data);
        if (data.length > 0) {
          setSelectedExamId(data[0].exam_id);
        }
      } catch (err) {
        setError('Failed to fetch exams.');
      } finally {
        setLoadingExams(false);
      }
    };
    fetchExams();
  }, [token]);

  useEffect(() => {
    if (!selectedExamId) return;
    const fetchCounts = async () => {
      setLoadingCounts(true);
      setError('');
      try {
        const data = await getAdminCountAnalysisApi(selectedExamId);
        setSubjectCounts(data);
      } catch (err) {
        setError('Failed to fetch count analysis.');
      } finally {
        setLoadingCounts(false);
      }
    };
    fetchCounts();
  }, [selectedExamId, token]);

  return (
    <Layout>
      <div className="container" style={{ paddingBottom: '4rem', paddingTop: '2rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ color: '#002147', fontWeight: 800, margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={24} /> Count Analysis
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
              Select an exam to view the number of students applied for each subject.
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

        {error && (
          <div className="alert error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={16} /> {error}</div>
        )}

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          
          <div style={{ marginBottom: '2rem', maxWidth: '400px' }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Target Examination
            </label>
            {loadingExams ? (
              <div style={{ padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#f8fafc', color: 'var(--text-muted)' }}>
                Loading exams...
              </div>
            ) : (
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.95rem' }}
              >
                <option value="" disabled>-- Select an Exam --</option>
                {exams.map(ex => (
                  <option key={ex.exam_id} value={ex.exam_id}>
                    {ex.exam_name} ({ex.exam_code})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="table-responsive-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
            <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#002147', fontWeight: 'bold' }}>
                  <th style={{ padding: '1rem 1.25rem', minWidth: '150px' }}>Subject Code</th>
                  <th style={{ padding: '1rem 1.25rem', minWidth: '220px' }}>Subject Name</th>
                  <th style={{ padding: '1rem 1.25rem', minWidth: '180px' }}>Branch</th>
                  <th style={{ padding: '1rem 1.25rem', minWidth: '150px', textAlign: 'right' }}>Applied Students</th>
                </tr>
              </thead>
              <tbody>
                {loadingCounts ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Calculating subject aggregates...
                    </td>
                  </tr>
                ) : subjectCounts.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No applications found for this exam yet.
                    </td>
                  </tr>
                ) : (
                  subjectCounts.map((sub, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#002147' }}>{sub.subject_code}</td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>{sub.subject_name}</td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>{sub.branch}</td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <span style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 'bold' }}>
                          {sub.applied_count}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </Layout>
  );
}
