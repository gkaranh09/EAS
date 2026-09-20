import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getHoldListApi, addToHoldListApi, updateHoldStatusApi, bulkUnrestrictApi, deleteHoldRecordApi } from '../api/adminApi';
import {
  Shield, ArrowLeft, Plus, Search, RefreshCw, AlertCircle, CheckCircle,
  Lock, Unlock, Trash2, Users, Fingerprint, IdCard, X, Check, AlertTriangle
} from 'lucide-react';

export default function HoldListManagement() {
  const navigate = useNavigate();
  const { student: currentUser } = useAuth();
  const roleLower = currentUser?.role?.toLowerCase() || '';
  const isAdmin = ['admin', 'head', 'administrator'].includes(roleLower);

  // ── List State ──
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Filters ──
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('true'); // 'true' | 'false' | 'all'

  // ── Add Panel ──
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [inputType, setInputType] = useState('student_id');
  const [rawInput, setRawInput] = useState('');
  const [addRemark, setAddRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addResult, setAddResult] = useState(null);

  // ── Multi-select for bulk unrestrict ──
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkRemark, setBulkRemark] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // ── Single unrestrict modal ──
  const [unrestrictModal, setUnrestrictModal] = useState(null); // { id, student_code, full_name }
  const [unrestrictRemark, setUnrestrictRemark] = useState('');
  const [unrestrictLoading, setUnrestrictLoading] = useState(false);

  // ── Delete confirm ──
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch hold list
  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getHoldListApi({ restricted: statusFilter, search: searchTerm || undefined });
      setRecords(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch hold list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter]);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  // ── Add to Hold List ──
  const handleAdd = async () => {
    if (!rawInput.trim()) return;
    setSubmitting(true);
    setAddResult(null);
    setError('');
    try {
      const result = await addToHoldListApi({
        input_type: inputType,
        raw_input: rawInput.trim(),
        remark: addRemark.trim() || 'Others'
      });
      setAddResult(result);
      setSuccessMsg(result.message);
      setRawInput('');
      setAddRemark('');
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add students to hold list.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Single Unrestrict ──
  const handleUnrestrict = async () => {
    if (!unrestrictModal) return;
    setUnrestrictLoading(true);
    try {
      await updateHoldStatusApi(unrestrictModal.id, {
        restricted: false,
        remark: unrestrictRemark.trim() || 'Unrestricted by admin'
      });
      setSuccessMsg(`${unrestrictModal.full_name} has been unrestricted.`);
      setUnrestrictModal(null);
      setUnrestrictRemark('');
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unrestrict.');
    } finally {
      setUnrestrictLoading(false);
    }
  };

  // ── Re-restrict (for lifted records) ──
  const handleReRestrict = async (record) => {
    try {
      await updateHoldStatusApi(record.id, { restricted: true, remark: 'Re-restricted by admin' });
      setSuccessMsg(`${record.full_name} has been re-restricted.`);
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to re-restrict.');
    }
  };

  // ── Bulk Unrestrict ──
  const handleBulkUnrestrict = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const result = await bulkUnrestrictApi(
        Array.from(selectedIds),
        bulkRemark.trim() || 'Unrestricted by admin'
      );
      setSuccessMsg(result.message);
      setSelectedIds(new Set());
      setBulkRemark('');
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to bulk unrestrict.');
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      await deleteHoldRecordApi(id);
      setSuccessMsg('Hold record permanently deleted.');
      setDeleteConfirm(null);
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete.');
      setDeleteConfirm(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Checkbox helpers ──
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const restrictedRecords = records.filter(r => r.restricted);
  const toggleSelectAll = () => {
    if (selectedIds.size === restrictedRecords.length && restrictedRecords.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(restrictedRecords.map(r => r.id)));
    }
  };

  const activeCount = records.filter(r => r.restricted).length;
  const liftedCount = records.filter(r => !r.restricted).length;

  return (
    <Layout>
      <div className="container" style={{ paddingBottom: '4rem', paddingTop: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ color: '#002147', fontWeight: 800, margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={24} color="#dc2626" /> Student Hold List
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
              Manage restricted students — held students cannot submit any exam forms.
            </p>
          </div>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/admin/dashboard')}
            style={{ borderColor: '#cbd5e1', color: '#002147', fontWeight: 'bold' }}>
            <ArrowLeft size={14} style={{ marginRight: '0.3rem' }} /> Back to Console
          </button>
        </div>

        {/* Messages */}
        {error && <div className="alert error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={16} /> {error}</div>}
        {successMsg && <div className="alert success" style={{ marginBottom: '1.5rem', background: '#d1fae5', color: '#065f46', border: '1px solid #10b981', padding: '1rem', borderRadius: '6px' }}>✓ {successMsg}</div>}

        {/* Stats Bar */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem 1.5rem', flex: '1 1 180px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Lock size={20} color="#dc2626" />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626' }}>{activeCount}</div>
              <div style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 600 }}>Currently Restricted</div>
            </div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem 1.5rem', flex: '1 1 180px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Unlock size={20} color="#16a34a" />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>{liftedCount}</div>
              <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>Previously Lifted</div>
            </div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem 1.5rem', flex: '1 1 180px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={20} color="#475569" />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#002147' }}>{records.length}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Total Records</div>
            </div>
          </div>
        </div>

        {/* ── ADD TO HOLD LIST PANEL ── (Admin/Head only) */}
        {isAdmin && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1.5rem', overflow: 'hidden' }}>
            <div
              onClick={() => setShowAddPanel(!showAddPanel)}
              style={{
                padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', background: showAddPanel ? '#fef2f2' : '#ffffff', transition: 'background 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#dc2626', fontSize: '0.95rem' }}>
                <Plus size={18} /> Add Students to Hold List
              </div>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{showAddPanel ? '▲ Collapse' : '▼ Expand'}</span>
            </div>

            {showAddPanel && (
              <div style={{ padding: '1.25rem', borderTop: '1px solid #fecaca' }}>
                {/* Input Type Toggle */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                    Identify Students By
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={() => setInputType('student_id')}
                      style={{
                        padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                        border: inputType === 'student_id' ? '2px solid #002147' : '1px solid #cbd5e1',
                        background: inputType === 'student_id' ? '#002147' : '#ffffff',
                        color: inputType === 'student_id' ? '#ffffff' : '#475569',
                        display: 'flex', alignItems: 'center', gap: '0.3rem'
                      }}>
                      <Fingerprint size={14} /> Student ID
                    </button>
                    <button type="button" onClick={() => setInputType('abc_id')}
                      style={{
                        padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                        border: inputType === 'abc_id' ? '2px solid #002147' : '1px solid #cbd5e1',
                        background: inputType === 'abc_id' ? '#002147' : '#ffffff',
                        color: inputType === 'abc_id' ? '#ffffff' : '#475569',
                        display: 'flex', alignItems: 'center', gap: '0.3rem'
                      }}>
                      <IdCard size={14} /> ABC ID
                    </button>
                  </div>
                </div>

                {/* Raw Input */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                    Paste {inputType === 'abc_id' ? 'ABC IDs' : 'Student IDs'} <span style={{ color: '#94a3b8', fontWeight: 400 }}>(separated by comma or space)</span>
                  </label>
                  <textarea
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder={inputType === 'abc_id' ? 'e.g. 123456789012, 987654321098 210987654321' : 'e.g. STU001, STU002 STU003'}
                    rows={3}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.88rem', fontFamily: 'monospace', resize: 'vertical' }}
                  />
                </div>

                {/* Remark */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                    Remark / Reason <span style={{ color: '#94a3b8', fontWeight: 400 }}>(default: "Others")</span>
                  </label>
                  <input
                    type="text"
                    value={addRemark}
                    onChange={(e) => setAddRemark(e.target.value)}
                    placeholder="e.g. Library dues pending, Disciplinary action, Fee default..."
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.88rem' }}
                  />
                </div>

                <button type="button" onClick={handleAdd} disabled={submitting || !rawInput.trim()}
                  style={{
                    padding: '0.65rem 1.5rem', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px',
                    fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                    opacity: (submitting || !rawInput.trim()) ? 0.5 : 1
                  }}>
                  <Lock size={16} /> {submitting ? 'Adding...' : 'Add to Hold List'}
                </button>

                {/* Add Result */}
                {addResult && (
                  <div style={{ marginTop: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.85rem', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 700, color: '#002147', marginBottom: '0.4rem' }}>Result:</div>
                    <div style={{ color: '#16a34a' }}>✓ {addResult.inserted} student(s) added/updated</div>
                    {addResult.not_found && addResult.not_found.length > 0 && (
                      <div style={{ color: '#dc2626', marginTop: '0.3rem' }}>
                        ✗ Not found: {addResult.not_found.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── FILTER & SEARCH BAR ── */}
        <div style={{
          background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem 1.25rem',
          marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end'
        }}>
          <div style={{ flex: '1 1 250px' }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.35rem', fontSize: '0.78rem', textTransform: 'uppercase' }}>Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, student ID, ABC ID..."
                style={{ width: '100%', padding: '0.55rem 0.8rem 0.55rem 2.2rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ width: '160px' }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.35rem', fontSize: '0.78rem', textTransform: 'uppercase' }}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
            >
              <option value="true">🔒 Restricted</option>
              <option value="false">🔓 Lifted</option>
              <option value="all">All Records</option>
            </select>
          </div>

          <button type="button" onClick={fetchRecords} disabled={loading}
            style={{
              padding: '0.55rem 1rem', background: '#002147', color: '#ffffff', border: 'none', borderRadius: '6px',
              fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', height: '38px',
              display: 'flex', alignItems: 'center', gap: '0.3rem'
            }}>
            <RefreshCw size={14} /> {loading ? 'Loading...' : 'Search'}
          </button>
        </div>

        {/* ── BULK UNRESTRICT BAR ── (shown when items selected) */}
        {isAdmin && selectedIds.size > 0 && (
          <div style={{
            background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: '8px', padding: '1rem 1.25rem',
            marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center'
          }}>
            <div style={{ fontWeight: 700, color: '#b45309', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertTriangle size={16} /> {selectedIds.size} student(s) selected
            </div>
            <input
              type="text"
              value={bulkRemark}
              onChange={(e) => setBulkRemark(e.target.value)}
              placeholder="Common remark for all (e.g. Cleared dues)"
              style={{ flex: '1 1 200px', padding: '0.5rem 0.75rem', border: '1px solid #fcd34d', borderRadius: '6px', fontSize: '0.85rem' }}
            />
            <button type="button" onClick={handleBulkUnrestrict} disabled={bulkLoading}
              style={{
                padding: '0.5rem 1rem', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem'
              }}>
              <Unlock size={14} /> {bulkLoading ? 'Processing...' : 'Unrestrict Selected'}
            </button>
            <button type="button" onClick={() => setSelectedIds(new Set())}
              style={{
                padding: '0.5rem 0.75rem', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px',
                fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem'
              }}>
              Clear Selection
            </button>
          </div>
        )}

        {/* ── RECORDS TABLE ── */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isAdmin ? '40px 1fr 1fr 1fr 1fr 120px' : '1fr 1fr 1fr 1fr',
            padding: '0.75rem 1.25rem',
            background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
            fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            {isAdmin && statusFilter === 'true' && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.size === restrictedRecords.length && restrictedRecords.length > 0}
                  onChange={toggleSelectAll}
                  style={{ width: '16px', height: '16px', accentColor: '#002147', cursor: 'pointer' }}
                />
              </div>
            )}
            {isAdmin && statusFilter !== 'true' && <div />}
            <div>Student</div>
            <div>Status & Remark</div>
            <div>Audit Trail</div>
            <div>Updated</div>
            {isAdmin && <div style={{ textAlign: 'center' }}>Actions</div>}
          </div>

          {/* Records */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading hold records...</div>
          ) : records.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <Shield size={40} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: '1rem' }}>No hold records found.</p>
            </div>
          ) : (
            records.map(record => {
              const isSelected = selectedIds.has(record.id);
              return (
                <div
                  key={record.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isAdmin ? '40px 1fr 1fr 1fr 1fr 120px' : '1fr 1fr 1fr 1fr',
                    padding: '0.85rem 1.25rem',
                    borderBottom: '1px solid #f1f5f9',
                    background: isSelected ? '#fffbeb' : (record.restricted ? '#ffffff' : '#f8fdf8'),
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'background 0.15s'
                  }}
                >
                  {/* Checkbox */}
                  {isAdmin && (
                    <div>
                      {record.restricted && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(record.id)}
                          style={{ width: '16px', height: '16px', accentColor: '#002147', cursor: 'pointer' }}
                        />
                      )}
                    </div>
                  )}

                  {/* Student Info */}
                  <div>
                    <div style={{ fontWeight: 700, color: '#002147', fontSize: '0.88rem' }}>{record.full_name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                      <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>{record.student_code}</span>
                      {record.abc_id && (
                        <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>ABC: {record.abc_id}</span>
                      )}
                    </div>
                    {record.branch && (
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>{record.branch} • Sem {record.current_semester}</div>
                    )}
                  </div>

                  {/* Status & Remark */}
                  <div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      fontSize: '0.72rem', fontWeight: 800, borderRadius: '4px', padding: '0.2rem 0.5rem',
                      background: record.restricted ? '#fee2e2' : '#d1fae5',
                      color: record.restricted ? '#dc2626' : '#047857',
                      border: `1px solid ${record.restricted ? '#fca5a5' : '#6ee7b7'}`
                    }}>
                      {record.restricted ? <><Lock size={10} /> RESTRICTED</> : <><Unlock size={10} /> LIFTED</>}
                    </span>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.3rem', fontStyle: 'italic' }}>
                      "{record.remark || 'Others'}"
                    </div>
                  </div>

                  {/* Audit Trail */}
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {record.added_by_name && (
                      <div>Added: <strong style={{ color: '#002147' }}>{record.added_by_name}</strong></div>
                    )}
                    {record.updated_by_name && record.updated_by_name !== record.added_by_name && (
                      <div>Updated: <strong style={{ color: '#002147' }}>{record.updated_by_name}</strong></div>
                    )}
                  </div>

                  {/* Updated */}
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {record.last_updated ? new Date(record.last_updated).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '—'}
                  </div>

                  {/* Actions */}
                  {isAdmin && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                      {record.restricted ? (
                        <button type="button"
                          onClick={() => { setUnrestrictModal({ id: record.id, student_code: record.student_code, full_name: record.full_name }); setUnrestrictRemark(''); }}
                          title="Unrestrict"
                          style={{
                            background: '#d1fae5', color: '#047857', border: '1px solid #6ee7b7', borderRadius: '4px',
                            padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: '0.2rem'
                          }}>
                          <Unlock size={12} /> Lift
                        </button>
                      ) : (
                        <button type="button"
                          onClick={() => handleReRestrict(record)}
                          title="Re-restrict"
                          style={{
                            background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px',
                            padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: '0.2rem'
                          }}>
                          <Lock size={12} /> Hold
                        </button>
                      )}
                      <button type="button"
                        onClick={() => setDeleteConfirm(record.id)}
                        title="Permanently delete"
                        style={{
                          background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '4px',
                          padding: '0.3rem 0.4rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center'
                        }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {!isAdmin && records.length > 0 && (
          <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertCircle size={14} /> You have read-only access to the hold list. Only Admins/Heads can add or remove holds.
          </div>
        )}

      </div>

      {/* ══════════════════ Unrestrict Confirmation Modal ══════════════════ */}
      {unrestrictModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1001, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '8px', maxWidth: '460px', width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', color: '#16a34a', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Unlock size={20} /> Unrestrict Student
              </h3>
              <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
                Lift the hold for <strong>{unrestrictModal.full_name}</strong> ({unrestrictModal.student_code})?
              </p>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.35rem', fontSize: '0.82rem' }}>
                Remark / Reason for lifting
              </label>
              <input
                type="text"
                value={unrestrictRemark}
                onChange={(e) => setUnrestrictRemark(e.target.value)}
                placeholder="e.g. Dues cleared, Issue resolved..."
                style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
              />
            </div>
            <div style={{
              padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'flex-end', gap: '0.75rem'
            }}>
              <button type="button" onClick={() => setUnrestrictModal(null)}
                style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>
                Cancel
              </button>
              <button type="button" onClick={handleUnrestrict} disabled={unrestrictLoading}
                style={{
                  padding: '0.5rem 1rem', background: '#16a34a', color: '#ffffff', border: 'none',
                  borderRadius: '6px', cursor: 'pointer', fontWeight: 700, opacity: unrestrictLoading ? 0.6 : 1
                }}>
                {unrestrictLoading ? 'Processing...' : 'Yes, Unrestrict'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ Delete Confirmation Modal ══════════════════ */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1001, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '8px', maxWidth: '420px', width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', color: '#dc2626', fontSize: '1.1rem', fontWeight: 700 }}>
                Permanently Delete Record?
              </h3>
              <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                This will permanently remove this hold record and its audit trail. This action cannot be undone.
              </p>
            </div>
            <div style={{
              padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'flex-end', gap: '0.75rem'
            }}>
              <button type="button" onClick={() => setDeleteConfirm(null)}
                style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>
                Cancel
              </button>
              <button type="button" onClick={() => handleDelete(deleteConfirm)} disabled={deleteLoading}
                style={{
                  padding: '0.5rem 1rem', background: '#dc2626', color: '#ffffff', border: 'none',
                  borderRadius: '6px', cursor: 'pointer', fontWeight: 700, opacity: deleteLoading ? 0.6 : 1
                }}>
                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
