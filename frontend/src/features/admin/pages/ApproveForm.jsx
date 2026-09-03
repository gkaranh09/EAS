import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getAdminExamsApi, getAdminFormsApi, approveFormsApi } from '../api/adminApi';
import { UserCheck, AlertCircle, CheckCircle, Search, Filter, Inbox, Check, X, Shield, Clock, RotateCcw } from 'lucide-react';

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

  // Action: Approve or Revoke Selected Checkboxes
  const handleBatchAction = async (setApprovedTarget) => {
    if (selectedFormIds.length === 0) {
      setError(`Please select at least one form to ${setApprovedTarget ? 'approve' : 'revoke'}.`);
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const data = await approveFormsApi({
        form_ids: selectedFormIds,
        set_approved: setApprovedTarget
      });
      setSuccessMsg(data.message || `Successfully updated ${selectedFormIds.length} form(s).`);
      fetchForms();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${setApprovedTarget ? 'approve' : 'revoke'} selected forms.`);
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Approve All or Revoke All Matching Current Filters
  const handleFilterWideAction = async (setApprovedTarget) => {
    const examLabel = selectedExamId 
      ? exams.find(e => String(e.exam_id) === String(selectedExamId))?.exam_code || 'selected exam'
      : 'all exams';
    const branchLabel = selectedBranch !== 'ALL' ? selectedBranch : 'all branches';

    const actionText = setApprovedTarget ? 'approve' : 'revoke approval for';
    const confirmMsg = `Are you sure you want to ${actionText} ALL application forms for ${examLabel} under ${branchLabel}?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const data = await approveFormsApi({
        approve_all: true,
        exam_id: selectedExamId || undefined,
        branch: selectedBranch !== 'ALL' ? selectedBranch : undefined,
        set_approved: setApprovedTarget
      });
      setSuccessMsg(data.message || `Successfully executed bulk ${setApprovedTarget ? 'approval' : 'revocation'}.`);
      fetchForms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to execute bulk action.');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Single Row Action (Approve or Revoke)
  const handleSingleAction = async (formId, setApprovedTarget) => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await approveFormsApi({
        form_ids: [formId],
        set_approved: setApprovedTarget
      });
      setSuccessMsg(`Form #${formId} ${setApprovedTarget ? 'approved' : 'approval revoked'}.`);
      fetchForms();
    } catch (err) {
      setError('Failed to update form approval status.');
    } finally {
      setActionLoading(false);
    }
  };

  const isAllSelected = forms.length > 0 && selectedFormIds.length === forms.length;

  return (
    <Layout>
      <div className="admin-container" style={{ paddingBottom: '4rem', paddingTop: '2rem' }}>
        
        {/* Header Title Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ color: '#002147', fontWeight: 800, margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={24} /> Approve Student Forms
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
              Review pending form applications or manage previously approved student forms.
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
            <Clock size={18} /> Pending Approval
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
            <CheckCircle size={18} /> Approved Forms
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
                Search Student
              </label>
              <input
                type="text"
                placeholder="Name or email..."
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
            {activeTab === 'pending' ? 'Unapproved' : 'Approved'} Forms: <strong>{forms.length}</strong> (Selected: {selectedFormIds.length})
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {activeTab === 'pending' ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleBatchAction(true)}
                  disabled={actionLoading || selectedFormIds.length === 0}
                  style={{ padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Check size={16} /> Approve Selected ({selectedFormIds.length})
                </button>

                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={() => handleFilterWideAction(true)}
                  disabled={actionLoading || forms.length === 0}
                  style={{ padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#16a34a', borderColor: '#16a34a', color: '#ffffff' }}
                >
                  <Shield size={16} /> Approve All (Filtered)
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleBatchAction(false)}
                  disabled={actionLoading || selectedFormIds.length === 0}
                  style={{ padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#dc2626', borderColor: '#dc2626', color: '#ffffff' }}
                >
                  <RotateCcw size={16} /> Revoke Selected ({selectedFormIds.length})
                </button>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => handleFilterWideAction(false)}
                  disabled={actionLoading || forms.length === 0}
                  style={{ padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderColor: '#dc2626', color: '#dc2626' }}
                >
                  <X size={16} /> Revoke All (Filtered)
                </button>
              </>
            )}
          </div>

        </div>

        {/* Applications Table */}
        <div className="table-responsive-wrapper" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#002147', fontWeight: 'bold' }}>
                <th style={{ padding: '1rem', width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    disabled={forms.length === 0}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '1rem', minWidth: '80px' }}>Form ID</th>
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
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #cbd5e1', borderTopColor: '#002147', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ margin: '0.5rem 0 0 0' }}>Fetching {activeTab} forms...</p>
                  </td>
                </tr>
              ) : forms.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}><Inbox size={32} /></div>
                    <p style={{ margin: 0 }}>No {activeTab === 'pending' ? 'unapproved' : 'approved'} student forms found matching selected criteria.</p>
                  </td>
                </tr>
              ) : (
                forms.map(form => {
                  const isChecked = selectedFormIds.includes(form.form_id);
                  return (
                    <tr key={form.form_id} style={{ borderBottom: '1px solid #f1f5f9', background: isChecked ? '#f8fafc' : 'transparent', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(form.form_id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 'bold', color: '#002147' }}>#{form.form_id}</td>
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
                            onClick={() => handleSingleAction(form.form_id, true)}
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
                            <Check size={12} /> Approve
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleSingleAction(form.form_id, false)}
                            style={{
                              background: '#fff1f2',
                              color: '#e11d48',
                              border: '1px solid #fecdd3',
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
                            <RotateCcw size={12} /> Revoke Approval
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </Layout>
  );
}
