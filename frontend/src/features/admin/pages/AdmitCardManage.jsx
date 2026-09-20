import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { 
  getAdminExamsApi, 
  getAdminFormsApi, 
  admitCardFormsApi, 
  downloadPdfApi, 
  downloadAdmitCardPdfApi,
  checkScheduleHealthApi
} from '../api/adminApi';
import { 
  CreditCard, AlertCircle, CheckCircle, Search, Filter, Check, X, 
  Inbox, Clock, Send, Eye, Download, FileCheck, RotateCcw, Shield, 
  Activity, Copy, CheckCheck, ExternalLink, AlertTriangle 
} from 'lucide-react';
import axios from 'axios';

export default function AdmitCardManage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  // Tab State: 'pending' (admit_card_released=false) vs 'released' (admit_card_released=true)
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

  // 2. Fetch approved forms based on active tab & filters
  const fetchForms = async () => {
    setLoadingForms(true);
    setError('');
    try {
      const params = {
        is_approved: 'true', // Admit cards are only for approved forms
        admit_card_released: activeTab === 'pending' ? 'false' : 'true'
      };
      if (selectedExamId) params.exam_id = selectedExamId;
      if (selectedBranch && selectedBranch !== 'ALL') params.branch = selectedBranch;
      if (search) params.search = search;

      const data = await getAdminFormsApi(params);
      setForms(data);
      setSelectedFormIds([]); // Reset selection when list updates
    } catch (err) {
      setError('Failed to fetch approved student forms for admit cards.');
    } finally {
      setLoadingForms(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [activeTab, selectedExamId, selectedBranch, search, token]);

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

  // Action: Release or Revoke Selected Checkboxes
  const handleBatchAction = async (setReleasedTarget) => {
    if (selectedFormIds.length === 0) {
      setError(`Please select at least one form to ${setReleasedTarget ? 'release' : 'revoke'} admit card.`);
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const data = await admitCardFormsApi({
        form_ids: selectedFormIds,
        set_released: setReleasedTarget
      });
      setSuccessMsg(data.message || `Successfully updated admit card status for ${selectedFormIds.length} form(s).`);
      fetchForms();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to update admit card status.`);
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Release All or Revoke All Matching Current Filters
  const handleFilterWideAction = async (setReleasedTarget) => {
    const examLabel = selectedExamId 
      ? exams.find(e => String(e.exam_id) === String(selectedExamId))?.exam_code || 'selected exam'
      : 'all exams';
    const branchLabel = selectedBranch !== 'ALL' ? selectedBranch : 'all branches';

    const actionText = setReleasedTarget ? 'release admit cards for' : 'revoke admit cards for';
    const confirmMsg = `Are you sure you want to ${actionText} ALL approved application forms for ${examLabel} under ${branchLabel}?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const data = await admitCardFormsApi({
        release_all: true,
        exam_id: selectedExamId || undefined,
        branch: selectedBranch !== 'ALL' ? selectedBranch : undefined,
        set_released: setReleasedTarget
      });
      setSuccessMsg(data.message || `Successfully executed filter-wide admit card action.`);
      fetchForms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to execute filter-wide admit card action.');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Single Row Action (Release or Revoke)
  const handleSingleAction = async (formId, setReleasedTarget) => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await admitCardFormsApi({
        form_ids: [formId],
        set_released: setReleasedTarget
      });
      setSuccessMsg(`Admit card ${setReleasedTarget ? 'released' : 'revoked'} successfully.`);
      fetchForms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update admit card status.');
    } finally {
      setActionLoading(false);
    }
  };

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
      const data = await downloadAdmitCardPdfApi(formId, token);
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

  const isAllSelected = forms.length > 0 && selectedFormIds.length === forms.length;
  const currentExamObj = exams.find(e => String(e.exam_id) === String(selectedExamId));

  return (
    <Layout>
      <div className="admin-container" style={{ paddingBottom: '4rem', paddingTop: '2rem' }}>
        
        {/* Header Title Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ color: '#002147', fontWeight: 800, margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCheck size={24} /> Admit Card Management
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
              Filter approved student forms by Department & Exam to verify schedule health and release official Admit Cards.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/admin/dashboard')}
              style={{ borderColor: '#cbd5e1', color: '#002147', fontWeight: 'bold' }}
            >
              ← Back to Console
            </button>
          </div>
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
            <Clock size={18} /> Pending Release
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('released')}
            style={{
              padding: '0.75rem 1.25rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'released' ? '3px solid #16a34a' : '3px solid transparent',
              color: activeTab === 'released' ? '#16a34a' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <CheckCircle size={18} /> Released Admit Cards
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', alignItems: 'end' }}>
            
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

            {/* Action Buttons: Check Schedule Health & Clear */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button"
                className="btn btn-primary"
                onClick={handleCheckScheduleHealth}
                disabled={!selectedExamId || healthLoading}
                title={!selectedExamId ? 'Select an exam to check schedule health' : 'Scan timetable schedules for all applied subjects'}
                style={{
                  height: '38px', 
                  borderRadius: '4px', 
                  flex: 1, 
                  fontWeight: 700, 
                  fontSize: '0.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  background: selectedExamId ? '#0f766e' : '#94a3b8',
                  borderColor: selectedExamId ? '#0f766e' : '#94a3b8'
                }}
              >
                <Activity size={15} /> Check Schedule Health
              </button>

              <button 
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => { setSelectedExamId(''); setSelectedBranch('ALL'); setSearch(''); }}
                style={{ height: '38px', borderRadius: '4px', borderColor: '#cbd5e1', color: '#002147', fontWeight: 600 }}
              >
                Clear
              </button>
            </div>

          </div>
        </div>

        {/* Action Controls Bar */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ fontSize: '0.9rem', color: '#002147', fontWeight: 600 }}>
            {activeTab === 'pending' ? 'Approved Forms Pending Release' : 'Released Admit Cards'}: <strong>{forms.length}</strong> (Selected: {selectedFormIds.length})
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
                  <Check size={16} /> Release Selected ({selectedFormIds.length})
                </button>

                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={() => handleFilterWideAction(true)}
                  disabled={actionLoading || forms.length === 0}
                  style={{ padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#16a34a', borderColor: '#16a34a', color: '#ffffff' }}
                >
                  <Shield size={16} /> Release All (Filtered)
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
                <th style={{ padding: '1rem', minWidth: '110px' }}>Form Code</th>
                <th style={{ padding: '1rem', minWidth: '200px' }}>Student Details</th>
                <th style={{ padding: '1rem', minWidth: '180px' }}>Branch</th>
                <th style={{ padding: '1rem', minWidth: '80px' }}>Division</th>
                <th style={{ padding: '1rem', minWidth: '180px' }}>Applied Exam</th>
                <th style={{ padding: '1rem', minWidth: '100px' }}>Form Status</th>
                <th style={{ padding: '1rem', minWidth: '110px' }}>Admit Card</th>
                <th style={{ padding: '1rem', minWidth: '130px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingForms ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #cbd5e1', borderTopColor: '#002147', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ margin: '0.5rem 0 0 0' }}>Fetching approved forms for admit card management...</p>
                  </td>
                </tr>
              ) : forms.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}><Inbox size={32} /></div>
                    <p style={{ margin: 0 }}>No approved student forms found matching selected Exam & Branch filters.</p>
                  </td>
                </tr>
              ) : (
                forms.map(form => {
                  const isChecked = selectedFormIds.includes(form.form_id);
                  const displayFormCode = form.form_code || `#${form.form_id}`;
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
                        <span style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          Approved
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          background: form.admit_card_released ? 'rgba(22, 163, 74, 0.1)' : 'rgba(234, 179, 8, 0.1)', 
                          color: form.admit_card_released ? '#16a34a' : '#b45309', 
                          padding: '0.25rem 0.6rem', 
                          borderRadius: '12px', 
                          fontWeight: 'bold',
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          {form.admit_card_released ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {form.admit_card_released ? 'Released' : 'Pending Release'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            type="button"
                            title="Download Form PDF"
                            onClick={() => handleDownloadPdf(form.form_id)}
                            style={{
                              background: '#f1f5f9',
                              color: '#002147',
                              border: '1px solid #cbd5e1',
                              padding: '0.4rem 0.6rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <CreditCard size={12} /> Form PDF
                          </button>

                          {form.admit_card_released && (
                            <button
                              type="button"
                              title="Download Admit Card PDF"
                              onClick={() => handleDownloadAdmitCard(form.form_id)}
                              style={{
                                background: '#f0fdf4',
                                color: '#16a34a',
                                border: '1px solid #bbf7d0',
                                padding: '0.4rem 0.6rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontWeight: '600',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <FileCheck size={12} /> Admit Card
                            </button>
                          )}

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
                              <Check size={12} /> Release Admit Card
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
                              <RotateCcw size={12} /> Revoke Admit Card
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── SCHEDULE HEALTH VERIFICATION MODAL ───────────────────────── */}
        {healthModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0'
            }}>
              
              {/* Modal Header */}
              <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    background: healthData?.healthy ? '#dcfce7' : '#fef3c7',
                    color: healthData?.healthy ? '#16a34a' : '#d97706',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#002147', fontWeight: 800 }}>
                      Timetable Schedule Health
                    </h3>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Exam: <strong>{currentExamObj?.exam_name || 'Selected Exam'}</strong> ({currentExamObj?.exam_code})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHealthModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '0.3rem',
                    borderRadius: '4px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '1.5rem' }}>
                {healthLoading ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #cbd5e1', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Cross-referencing student applications against exam schedules...
                    </p>
                  </div>
                ) : healthData ? (
                  <>
                    {/* Status Banner */}
                    {healthData.healthy ? (
                      <div style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        padding: '1.25rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem'
                      }}>
                        <CheckCircle size={24} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <h4 style={{ margin: 0, color: '#166534', fontSize: '1rem', fontWeight: 700 }}>
                            Schedule Health: 100% Complete & Ready!
                          </h4>
                          <p style={{ margin: '0.3rem 0 0 0', color: '#15803d', fontSize: '0.85rem', lineHeight: 1.4 }}>
                            All <strong>{healthData.total_applied_subjects}</strong> distinct theory subjects applied by students for this exam have verified dates and timings configured in the timetable. Admit cards can be safely generated and released.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        padding: '1.25rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem'
                      }}>
                        <AlertTriangle size={24} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <h4 style={{ margin: 0, color: '#92400e', fontSize: '1rem', fontWeight: 700 }}>
                            Action Required: {healthData.missing_count} Subject(s) Missing Exam Schedules
                          </h4>
                          <p style={{ margin: '0.3rem 0 0 0', color: '#b45309', fontSize: '0.85rem', lineHeight: 1.4 }}>
                            Students have submitted applications for the subjects listed below, but their exam date or start/end timings have not been scheduled yet.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Stats Pill Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Applied Subjects</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#002147' }}>{healthData.total_applied_subjects}</div>
                      </div>
                      <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '6px', border: '1px solid #dcfce7', textAlign: 'center' }}>
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
                            Tip: Copy the codes above and paste them into the <strong>Schedule Exam</strong> page search bar to configure their timetable.
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
                {healthData?.healthy && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setHealthModalOpen(false);
                      handleFilterWideAction(true);
                    }}
                    style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <CheckCircle size={15} /> Release Admit Cards Now
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
