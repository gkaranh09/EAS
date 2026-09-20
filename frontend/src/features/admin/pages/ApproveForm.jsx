import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getAdminExamsApi, getAdminFormsApi, approveFormsApi, checkScheduleHealthApi } from '../api/adminApi';
import { UserCheck, AlertCircle, CheckCircle, Search, Filter, Inbox, Check, X, Shield, Clock, Lock, Activity, Copy, CheckCheck, ExternalLink, AlertTriangle } from 'lucide-react';
import axios from 'axios';

export default function ApproveForm() {
  const navigate = useNavigate();
  const { token } = useAuth();

  // Tab State: 'pending' (is_approved=false) vs 'approved' (is_approved=true)
  const [activeTab, setActiveTab] = useState('pending');

  // Filter States
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [programsList, setProgramsList] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [search, setSearch] = useState('');

  // Data & Loading States
  const [forms, setForms] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingForms, setLoadingForms] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Selection State
  const [selectedFormIds, setSelectedFormIds] = useState([]);

  // Alert States
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Schedule Health Modal State
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // 1. Fetch available exams and programs on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [examsData, progsRes] = await Promise.all([
          getAdminExamsApi(),
          axios.get('/api/programs')
        ]);
        setExams(examsData || []);
        setProgramsList(progsRes.data || []);
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      } finally {
        setLoadingExams(false);
      }
    };
    fetchInitialData();
  }, [token]);

  // 2. Fetch forms based on active tab & filters
  const fetchForms = async () => {
    setLoadingForms(true);
    setError('');
    try {
      const params = {
        is_approved: activeTab === 'pending' ? 'false' : 'true'
      };
      if (selectedExamId) params.exam_id = selectedExamId;
      if (selectedBranch && selectedBranch !== 'ALL') params.branch = selectedBranch;
      if (search) params.search = search;

      const data = await getAdminFormsApi(params);
      setForms(data);
      setSelectedFormIds([]); // Reset selection when list updates
    } catch (err) {
      setError('Failed to fetch student application forms.');
    } finally {
      setLoadingForms(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [activeTab, selectedExamId, selectedBranch, search, token]);

  // Handle Select All Checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedFormIds(forms.map(f => f.form_id));
    } else {
      setSelectedFormIds([]);
    }
  };

  // Handle Single Checkbox Toggle
  const handleToggleSelect = (formId) => {
    setSelectedFormIds(prev =>
      prev.includes(formId) ? prev.filter(id => id !== formId) : [...prev, formId]
    );
  };

  // Action: Approve Selected Checkboxes (Revocation is not permitted)
  const handleBatchAction = async () => {
    if (selectedFormIds.length === 0) {
      setError('Please select at least one form to approve.');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const data = await approveFormsApi({
        form_ids: selectedFormIds,
        set_approved: true
      });
      setSuccessMsg(data.message || `Successfully approved ${selectedFormIds.length} form(s).`);
      fetchForms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve selected forms.');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Approve All Matching Current Filters
  const handleFilterWideAction = async () => {
    const examLabel = selectedExamId 
      ? exams.find(e => String(e.exam_id) === String(selectedExamId))?.exam_code || 'selected exam'
      : 'all exams';
    const branchLabel = selectedBranch !== 'ALL' ? selectedBranch : 'all branches';

    const confirmMsg = `Are you sure you want to approve ALL application forms for ${examLabel} under ${branchLabel}? Once approved, approval cannot be revoked.`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const data = await approveFormsApi({
        approve_all: true,
        exam_id: selectedExamId || undefined,
        branch: selectedBranch !== 'ALL' ? selectedBranch : undefined,
        set_approved: true
      });
      setSuccessMsg(data.message || `Successfully executed bulk approval.`);
      fetchForms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to execute bulk approval.');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Single Row Action (Approve)
  const handleSingleAction = async (formId) => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await approveFormsApi({
        form_ids: [formId],
        set_approved: true
      });
      setSuccessMsg(`Form approved successfully.`);
      fetchForms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update form approval status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Schedule Health Check
  const handleCheckScheduleHealth = async () => {
    if (!selectedExamId) {
      setError('Please select an exam first to inspect its timetable schedule health.');
      return;
    }

    setHealthLoading(true);
    setError('');
    setHealthData(null);
    setCopiedCodes(false);
    setHealthModalOpen(true);

    try {
      const data = await checkScheduleHealthApi(selectedExamId);
      setHealthData(data);
    } catch (err) {
      console.error('Schedule health error:', err);
      setError(err.response?.data?.message || 'Failed to check schedule health for the selected exam.');
      setHealthModalOpen(false);
    } finally {
      setHealthLoading(false);
    }
  };

  const handleCopyMissingCodes = () => {
    if (!healthData?.missing_codes_text) return;
    navigator.clipboard.writeText(healthData.missing_codes_text);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2500);
  };

  const isAllSelected = forms.length > 0 && selectedFormIds.length === forms.length;

  return (
    <Layout>
      <div className="admin-container" style={{ paddingBottom: '4rem', paddingTop: '2rem' }}>
        
        {/* Header Title Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ color: '#002147', fontWeight: 800, margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={24} /> Examination Form Verification
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
              Verify student applications and grant official approvals. (Approved forms are permanently locked).
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

        {/* Tab Segment Controls */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '0.75rem 1.25rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'pending' ? '3px solid #002147' : '3px solid transparent',
              color: activeTab === 'pending' ? '#002147' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <Clock size={18} /> Pending Verification
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            style={{
              padding: '0.75rem 1.25rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'approved' ? '3px solid #16a34a' : '3px solid transparent',
              color: activeTab === 'approved' ? '#16a34a' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <CheckCircle size={18} /> Approved & Locked Forms
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="alert error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}
        {successMsg && (
          <div className="alert success" style={{ marginBottom: '1.5rem', background: '#d1fae5', color: '#065f46', border: '1px solid #10b981', padding: '1rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} /> {successMsg}
          </div>
        )}

        {/* Filters Panel */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', alignItems: 'end' }}>
            
            {/* Exam Filter */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.4rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Select Exam
              </label>
              {loadingExams ? (
                <div style={{ padding: '0.6rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Loading exams...
                </div>
              ) : (
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem' }}
                >
                  <option value="">All Exams</option>
                  {exams.map(ex => (
                    <option key={ex.exam_id} value={ex.exam_id}>
                      {ex.exam_name} ({ex.exam_code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Branch Filter */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.4rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Branch / Department
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem', background: 'white' }}
              >
                <option value="ALL">All Branches & Programs</option>
                {programsList.map(prog => (
                  <option key={prog.program_id} value={prog.program_name}>
                    {prog.program_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Filter */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.4rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Search Student / Form Code
              </label>
              <input
                type="text"
                placeholder="Name, email, ef12345678..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem' }}
              />
            </div>

            {/* Clear Button */}
            <div>
              <button 
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => { setSelectedExamId(''); setSelectedBranch('ALL'); setSearch(''); }}
                style={{ height: '38px', borderRadius: '4px', width: '100%', borderColor: '#cbd5e1', color: '#002147', fontWeight: 600 }}
              >
                Clear Filters
              </button>
            </div>

          </div>
        </div>

        {/* Action Controls Bar */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ fontSize: '0.9rem', color: '#002147', fontWeight: 600 }}>
            {activeTab === 'pending' ? 'Applications Awaiting Approval' : 'Approved Forms'}: <strong>{forms.length}</strong> {activeTab === 'pending' && `(Selected: ${selectedFormIds.length})`}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Schedule Health Button */}
            <button
              type="button"
              onClick={handleCheckScheduleHealth}
              disabled={healthLoading}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#002147',
                cursor: 'pointer'
              }}
            >
              <Activity size={15} color="#2563eb" />
              {healthLoading ? 'Scanning...' : 'Check Schedule Health'}
            </button>

            {activeTab === 'pending' ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleBatchAction}
                  disabled={actionLoading || selectedFormIds.length === 0}
                  style={{ padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Check size={16} /> Approve Selected ({selectedFormIds.length})
                </button>

                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={handleFilterWideAction}
                  disabled={actionLoading || forms.length === 0}
                  style={{ padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#16a34a', borderColor: '#16a34a', color: '#ffffff' }}
                >
                  <Shield size={16} /> Approve All (Filtered)
                </button>
              </>
            ) : (
              <div style={{
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <Lock size={14} /> Approved applications are permanently locked (Irrevocable)
              </div>
            )}
          </div>

        </div>

        {/* Applications Table */}
        <div className="table-responsive-wrapper" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#002147', fontWeight: 'bold' }}>
                {activeTab === 'pending' && (
                  <th style={{ padding: '1rem', width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      disabled={forms.length === 0}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                )}
                <th style={{ padding: '1rem', minWidth: '110px' }}>Form Code</th>
                <th style={{ padding: '1rem', minWidth: '200px' }}>Student Details</th>
                <th style={{ padding: '1rem', minWidth: '180px' }}>Branch</th>
                <th style={{ padding: '1rem', minWidth: '80px' }}>Division</th>
                <th style={{ padding: '1rem', minWidth: '180px' }}>Applied Exam</th>
                <th style={{ padding: '1rem', minWidth: '100px' }}>Payment</th>
                <th style={{ padding: '1rem', minWidth: '110px' }}>Approval Status</th>
                <th style={{ padding: '1rem', minWidth: '130px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingForms ? (
                <tr>
                  <td colSpan={activeTab === 'pending' ? '9' : '8'} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #cbd5e1', borderTopColor: '#002147', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ margin: '0.5rem 0 0 0' }}>Fetching {activeTab} forms...</p>
                  </td>
                </tr>
              ) : forms.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'pending' ? '9' : '8'} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}><Inbox size={32} /></div>
                    <p style={{ margin: 0 }}>No {activeTab === 'pending' ? 'unapproved' : 'approved'} student forms found matching selected criteria.</p>
                  </td>
                </tr>
              ) : (
                forms.map(form => {
                  const isChecked = selectedFormIds.includes(form.form_id);
                  const displayFormCode = form.form_code || `#${form.form_id}`;
                  return (
                    <tr key={form.form_id} style={{ borderBottom: '1px solid #f1f5f9', background: isChecked ? '#f8fafc' : 'transparent', transition: 'background 0.2s' }}>
                      {activeTab === 'pending' && (
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(form.form_id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                      )}
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          background: '#f1f5f9', 
                          color: '#002147', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '4px', 
                          fontFamily: 'monospace', 
                          fontWeight: 700, 
                          fontSize: '0.84rem',
                          border: '1px solid #e2e8f0'
                        }}>
                          {displayFormCode}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, color: '#002147' }}>{form.student_name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{form.student_email}</div>
                        <div style={{ marginTop: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#f1f5f9', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, color: '#002147' }}>
                          <span>Roll No:</span>
                          <span style={{ color: '#2563eb', fontWeight: 700 }}>{form.roll_no || form.student_id}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ background: 'rgba(0, 33, 71, 0.06)', color: '#002147', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {form.branch || 'General'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          background: 'rgba(59, 130, 246, 0.08)', 
                          color: '#1d4ed8', 
                          border: '1px solid rgba(59, 130, 246, 0.2)', 
                          padding: '0.2rem 0.55rem', 
                          borderRadius: '4px', 
                          fontSize: '0.78rem', 
                          fontWeight: 700 
                        }}>
                          {form.division || 'A'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 500 }}>{form.exam_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {form.exam_code}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className={`status-badge ${form.payment_status === 'paid' ? 'applied' : 'pending'}`} style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                          {form.payment_status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          background: form.is_approved ? 'rgba(22, 163, 74, 0.1)' : 'rgba(100, 116, 139, 0.1)', 
                          color: form.is_approved ? '#16a34a' : '#64748b', 
                          padding: '0.25rem 0.6rem', 
                          borderRadius: '12px', 
                          fontWeight: 'bold',
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          {form.is_approved ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {form.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {activeTab === 'pending' ? (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleSingleAction(form.form_id)}
                            style={{
                              background: '#002147',
                              color: '#ffffff',
                              border: 'none',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              fontWeight: 'bold',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <Check size={12} /> Approve Form
                          </button>
                        ) : (
                          <span style={{
                            color: '#16a34a',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            <Lock size={12} /> Locked
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Schedule Health Inspection Modal */}
        {healthModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 33, 71, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '650px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}>
              
              {/* Modal Header */}
              <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    background: healthData?.healthy ? '#dcfce7' : '#fee2e2',
                    padding: '0.45rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {healthData?.healthy ? (
                      <CheckCircle size={20} color="#16a34a" />
                    ) : (
                      <AlertTriangle size={20} color="#dc2626" />
                    )}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#002147', fontWeight: 800, fontSize: '1.1rem' }}>
                      Schedule Health Verification
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Exam: {exams.find(e => String(e.exam_id) === String(selectedExamId))?.exam_name || 'Selected Exam'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHealthModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                {healthLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>
                    <Activity size={32} className="animate-spin" style={{ margin: '0 auto 0.75rem auto', color: '#2563eb' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>Analyzing student subject applications against timetable schedule...</p>
                  </div>
                ) : healthData ? (
                  <>
                    {/* Status Banner */}
                    <div style={{
                      background: healthData.healthy ? '#f0fdf4' : '#fef2f2',
                      border: healthData.healthy ? '1px solid #bbf7d0' : '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '1rem 1.25rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem'
                    }}>
                      {healthData.healthy ? (
                        <CheckCircle size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                      ) : (
                        <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 800, color: healthData.healthy ? '#166534' : '#991b1b', fontSize: '0.95rem' }}>
                          {healthData.healthy ? '100% Timetable Health Passed' : 'Incomplete Timetable Schedule Detected'}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: healthData.healthy ? '#15803d' : '#b91c1c', marginTop: '0.2rem' }}>
                          {healthData.healthy
                            ? 'All theory subjects applied by students for this exam have full exam dates and time parameters configured.'
                            : `${healthData.missing_count} theory subject(s) selected by students currently have no exam date/time scheduled.`
                          }
                        </div>
                      </div>
                    </div>

                    {/* Stat Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Applied Subjects</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#002147' }}>{healthData.total_applied_subjects}</div>
                      </div>
                      <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '6px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#166534', textTransform: 'uppercase', fontWeight: 600 }}>Scheduled</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#16a34a' }}>{healthData.scheduled_subjects}</div>
                      </div>
                      <div style={{ background: healthData.healthy ? '#f8fafc' : '#fef2f2', padding: '0.75rem', borderRadius: '6px', border: healthData.healthy ? '1px solid #e2e8f0' : '1px solid #fee2e2', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: healthData.healthy ? 'var(--text-muted)' : '#991b1b', textTransform: 'uppercase', fontWeight: 600 }}>Unscheduled</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: healthData.healthy ? '#64748b' : '#dc2626' }}>{healthData.missing_count}</div>
                      </div>
                    </div>

                    {/* Missing Subjects Table (if any) */}
                    {!healthData.healthy && healthData.missing_subjects?.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                          <h5 style={{ margin: 0, color: '#002147', fontWeight: 700, fontSize: '0.9rem' }}>
                            Unscheduled Subjects List
                          </h5>
                          
                          <button
                            type="button"
                            onClick={handleCopyMissingCodes}
                            style={{
                              background: copiedCodes ? '#dcfce7' : '#f1f5f9',
                              color: copiedCodes ? '#166534' : '#002147',
                              border: '1px solid #cbd5e1',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '4px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            {copiedCodes ? <CheckCheck size={14} color="#16a34a" /> : <Copy size={14} />}
                            {copiedCodes ? 'Codes Copied!' : 'Copy Missing Codes'}
                          </button>
                        </div>

                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', maxHeight: '220px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#002147' }}>
                              <tr>
                                <th style={{ padding: '0.6rem 0.8rem' }}>Subject Code</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>Subject Name</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>Branch</th>
                                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>Sem</th>
                                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>Students</th>
                              </tr>
                            </thead>
                            <tbody>
                              {healthData.missing_subjects.map((sub, idx) => (
                                <tr key={sub.subject_id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'monospace', fontWeight: 700, color: '#dc2626' }}>
                                    {sub.subject_code}
                                  </td>
                                  <td style={{ padding: '0.6rem 0.8rem', fontWeight: 500, color: '#002147' }}>
                                    {sub.subject_name}
                                  </td>
                                  <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>
                                    {sub.branch}
                                  </td>
                                  <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                                    {sub.semester}
                                  </td>
                                  <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: 700 }}>
                                    {sub.student_count}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Quick Guidance Card */}
                        <div style={{ marginTop: '0.8rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px dashed #cbd5e1', fontSize: '0.8rem', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>
                            Tip: Copy the codes above and paste them into the <strong>Schedule Exam</strong> search bar to configure their timetable.
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/schedule-exam?examId=${selectedExamId}&search=${encodeURIComponent(healthData.missing_codes_text || '')}`)}
                            style={{
                              background: '#002147',
                              color: 'white',
                              border: 'none',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              flexShrink: 0
                            }}
                          >
                            <ExternalLink size={13} /> Schedule Missing Subjects
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                borderBottomLeftRadius: '12px',
                borderBottomRightRadius: '12px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem'
              }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setHealthModalOpen(false)}
                  style={{ fontWeight: 600 }}
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
