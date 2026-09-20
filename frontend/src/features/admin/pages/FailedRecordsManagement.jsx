import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getAdminExamsApi, getFailedRecordsApi, addFailedRecordsApi, deleteFailedRecordApi } from '../api/adminApi';
import {
  AlertTriangle, Users, Plus, Trash2, AlertCircle, CheckCircle, ChevronDown,
  Fingerprint, IdCard, FileSpreadsheet, Search, RefreshCw, Shield
} from 'lucide-react';

const EXAM_TYPE_COLORS = {
  regular: { bg: '#dbeafe', color: '#1d4ed8', label: 'Regular' },
  supplementary: { bg: '#fef3c7', color: '#b45309', label: 'Supplementary' },
  atkt: { bg: '#fee2e2', color: '#dc2626', label: 'ATKT' }
};

export default function FailedRecordsManagement() {
  const navigate = useNavigate();
  const { student: currentUser } = useAuth();

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [records, setRecords] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const [inputType, setInputType] = useState('student_id');
  const [rawInput, setRawInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
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
    fetchExams();
  }, []);

  const handleExamSelect = async (examId) => {
    setSelectedExamId(examId);
    setSubmitResult(null);
    setError('');
    setRawInput('');
    if (!examId) {
      setSelectedExam(null);
      setRecords([]);
      return;
    }
    const ex = exams.find(e => String(e.exam_id) === String(examId));
    setSelectedExam(ex || null);
    await loadRecords(examId);
  };

  const loadRecords = async (examId) => {
    setLoadingRecords(true);
    try {
      const data = await getFailedRecordsApi(examId);
      setRecords(data);
    } catch (err) {
      console.error('Failed to load records:', err);
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!selectedExamId) {
      setError('Please select an exam first.');
      return;
    }
    if (!rawInput.trim()) {
      setError('Please enter at least one Student ID or ABC ID.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSubmitResult(null);
    try {
      const result = await addFailedRecordsApi({
        exam_id: selectedExamId,
        input_type: inputType,
        raw_input: rawInput
      });
      setSubmitResult(result);
      setRawInput('');
      await loadRecords(selectedExamId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add records.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Remove this student from the failed records list?')) return;
    setDeletingId(recordId);
    try {
      await deleteFailedRecordApi(recordId);
      setRecords(prev => prev.filter(r => r.id !== recordId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete record.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredRecords = records.filter(r => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.student_code?.toLowerCase().includes(q) ||
      r.full_name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.abc_id?.toLowerCase().includes(q)
    );
  });

  return (
    <Layout>
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '1100px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ color: '#002147', fontWeight: 800, margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertTriangle size={24} color="#dc2626" /> Failed Records Management
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
              Register students who failed an exam — they become eligible for Supplementary / ATKT forms.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ background: '#fef3c7', color: '#b45309', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Shield size={13} /> Head &amp; Admin Only
            </div>
            <button className="btn btn-outline" onClick={() => navigate('/admin/dashboard')} style={{ borderColor: '#cbd5e1', color: '#002147', fontWeight: 'bold' }}>
              ← Back to Console
            </button>
          </div>
        </div>

        {/* Exam Selector */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            1. Select Source Exam
          </label>
          <select
            id="exam-select"
            value={selectedExamId}
            onChange={e => handleExamSelect(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
          >
            <option value="">— Select an exam —</option>
            {exams.map(ex => {
              const tc = EXAM_TYPE_COLORS[ex.exam_type] || EXAM_TYPE_COLORS.regular;
              return (
                <option key={ex.exam_id} value={ex.exam_id}>
                  [{tc.label.toUpperCase()}] {ex.exam_code} — {ex.exam_name}
                </option>
              );
            })}
          </select>

          {selectedExam && (
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ ...EXAM_TYPE_COLORS[selectedExam.exam_type] && { background: EXAM_TYPE_COLORS[selectedExam.exam_type].bg, color: EXAM_TYPE_COLORS[selectedExam.exam_type].color }, padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                {EXAM_TYPE_COLORS[selectedExam.exam_type]?.label || selectedExam.exam_type}
              </span>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{selectedExam.exam_name}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.82rem', background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700 }}>
                {records.length} record{records.length !== 1 ? 's' : ''} in list
              </span>
            </div>
          )}
        </div>

        {selectedExamId && (
          <>
            {/* Add Records Panel */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>
              <h3 style={{ color: '#002147', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1.25rem 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                2. Add Students to Failed List
              </h3>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              {submitResult && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    <CheckCircle size={16} color="#16a34a" /> {submitResult.message}
                  </div>
                  {submitResult.not_found?.length > 0 && (
                    <div style={{ marginTop: '0.4rem', color: '#b45309' }}>
                      ⚠️ Not found in system: {submitResult.not_found.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* Input Type Tabs */}
              <div style={{ display: 'flex', gap: '0', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', width: 'fit-content' }}>
                {[
                  { id: 'student_id', icon: <IdCard size={15} />, label: 'By Student ID' },
                  { id: 'abc_id', icon: <Fingerprint size={15} />, label: 'By ABC ID' },
                  { id: 'csv', icon: <FileSpreadsheet size={15} />, label: 'Upload CSV', disabled: true }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => !opt.disabled && setInputType(opt.id)}
                    title={opt.disabled ? 'Coming Soon' : ''}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.6rem 1rem', border: 'none', cursor: opt.disabled ? 'not-allowed' : 'pointer',
                      fontSize: '0.83rem', fontWeight: 600,
                      background: inputType === opt.id && !opt.disabled ? '#002147' : '#f8fafc',
                      color: opt.disabled ? '#9ca3af' : inputType === opt.id ? '#fff' : '#475569',
                      borderRight: '1px solid #e2e8f0', transition: 'all 0.15s'
                    }}
                  >
                    {opt.icon} {opt.label}
                    {opt.disabled && <span style={{ fontSize: '0.65rem', background: '#e2e8f0', color: '#9ca3af', padding: '0.05rem 0.3rem', borderRadius: '4px', marginLeft: '0.2rem' }}>Soon</span>}
                  </button>
                ))}
              </div>

              <form onSubmit={handleAdd}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    {inputType === 'student_id'
                      ? 'Paste Student IDs (separated by space or comma):'
                      : 'Paste 12-digit ABC IDs (separated by space or comma):'}
                  </label>
                  <textarea
                    id="failed-ids-input"
                    value={rawInput}
                    onChange={e => setRawInput(e.target.value)}
                    placeholder={inputType === 'student_id'
                      ? 'e.g. S1234567890, S1234567891 S1234567892'
                      : 'e.g. 123456789012, 123456789013 123456789014'
                    }
                    rows={4}
                    style={{
                      width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px',
                      resize: 'vertical', fontFamily: 'monospace', fontSize: '0.88rem', lineHeight: 1.6
                    }}
                  />
                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                    Separate IDs using space or comma. Duplicates are automatically skipped.
                  </p>
                </div>

                <button
                  type="submit"
                  id="add-failed-records-btn"
                  disabled={submitting || !rawInput.trim()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: submitting ? '#94a3b8' : '#002147', color: '#fff',
                    border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px',
                    cursor: submitting || !rawInput.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: '0.9rem'
                  }}
                >
                  <Plus size={16} />
                  {submitting ? 'Adding…' : 'Add to Failed List'}
                </button>
              </form>
            </div>

            {/* Records Table */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem 2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <h3 style={{ color: '#002147', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  <Users size={18} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
                  Failed Students List ({records.length})
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="text"
                      placeholder="Search by name, ID, email…"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      style={{ padding: '0.5rem 0.75rem 0.5rem 2rem', border: '1px solid #e2e8f0', borderRadius: '5px', fontSize: '0.83rem', width: '220px' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => loadRecords(selectedExamId)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '5px', background: '#f8fafc', cursor: 'pointer', fontSize: '0.83rem', color: '#475569' }}
                  >
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>
              </div>

              {loadingRecords ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Loading records…</div>
              ) : filteredRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <Users size={40} color="#e2e8f0" style={{ marginBottom: '0.75rem' }} />
                  <p style={{ color: '#94a3b8', margin: 0, fontWeight: 600 }}>
                    {records.length === 0 ? 'No failed records yet. Add students above.' : 'No records match your search.'}
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', textAlign: 'left', fontWeight: 700, color: '#002147', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Student ID</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Full Name</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                        <th style={{ padding: '0.75rem 1rem' }}>ABC ID</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Program</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Added By</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Added On</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#002147', fontFamily: 'monospace', fontSize: '0.82rem' }}>{r.student_code}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{r.full_name || '—'}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>{r.email || '—'}</td>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>{r.abc_id || '—'}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem', maxWidth: '160px' }}>{r.program || '—'}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>{r.added_by_name || 'System'}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                            {r.added_at ? new Date(r.added_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id)}
                              disabled={deletingId === r.id}
                              title="Remove from failed list"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                background: '#fef2f2', color: '#dc2626',
                                border: '1px solid #fca5a5', padding: '0.3rem 0.6rem',
                                borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700
                              }}
                            >
                              <Trash2 size={13} />
                              {deletingId === r.id ? '…' : 'Remove'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
