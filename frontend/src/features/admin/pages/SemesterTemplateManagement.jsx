import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getTemplatesApi, createTemplateApi, updateTemplateApi, deleteTemplateApi } from '../api/adminApi';
import { Layers, ArrowLeft, Plus, Trash2, Edit3, ChevronDown, ChevronUp, AlertCircle, Check, Star, ToggleLeft, ToggleRight, Search, GripVertical, X } from 'lucide-react';
import { ProgramSelect } from '../../../components/common/LookupSelect';

export default function SemesterTemplateManagement() {
  const navigate = useNavigate();
  const { token } = useAuth();

  // ── Filter State ──
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');

  // ── Template List State ──
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  // ── Modal State ──
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null); // null = create mode
  const [modalForm, setModalForm] = useState({
    template_name: '',
    self_choice: false,
    is_default: false,
    groups: [{ group_label: '', subject_ids: [] }]
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // ── Available Subjects (for the subject picker) ──
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  // ── Delete Confirmation ──
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Expanded template cards ──
  const [expandedId, setExpandedId] = useState(null);

  // Fetch programs and all subjects on mount (enabling all subjects across all departments and semesters)
  useEffect(() => {
    const fetchInitialData = async () => {
      setSubjectsLoading(true);
      try {
        const [programsRes, subjectsRes] = await Promise.all([
          axios.get('/api/programs'),
          axios.get('/api/subjects')
        ]);
        setPrograms(programsRes.data);
        setAvailableSubjects(subjectsRes.data);
      } catch (err) {
        console.error('Error fetching initial programs/subjects:', err);
      } finally {
        setSubjectsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Load templates
  const loadTemplates = async () => {
    if (!selectedProgramId || !selectedSemester) {
      setError('Please select a program and semester first.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    setHasLoaded(true);
    try {
      const data = await getTemplatesApi(selectedProgramId, selectedSemester);
      setTemplates(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load templates.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-clear success messages
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  // ── Modal Helpers ──
  const openCreateModal = () => {
    setEditingTemplate(null);
    setModalForm({
      template_name: '',
      self_choice: false,
      is_default: false,
      groups: [{ group_label: '', subject_ids: [] }]
    });
    setModalError('');
    setShowModal(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setModalForm({
      template_name: template.template_name,
      self_choice: template.self_choice,
      is_default: template.is_default,
      groups: template.groups.map(g => ({
        group_label: g.group_label || '',
        subject_ids: g.subjects.map(s => s.subject_id)
      }))
    });
    setModalError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setModalError('');
  };

  // ── Group Management ──
  const addGroup = () => {
    setModalForm(prev => ({
      ...prev,
      groups: [...prev.groups, { group_label: '', subject_ids: [] }]
    }));
  };

  const removeGroup = (idx) => {
    setModalForm(prev => ({
      ...prev,
      groups: prev.groups.filter((_, i) => i !== idx)
    }));
  };

  const updateGroupLabel = (idx, value) => {
    setModalForm(prev => {
      const groups = [...prev.groups];
      groups[idx] = { ...groups[idx], group_label: value };
      return { ...prev, groups };
    });
  };

  const toggleSubjectInGroup = (groupIdx, subjectId) => {
    setModalForm(prev => {
      const groups = [...prev.groups];
      const current = groups[groupIdx].subject_ids;
      if (current.includes(subjectId)) {
        groups[groupIdx] = { ...groups[groupIdx], subject_ids: current.filter(id => id !== subjectId) };
      } else {
        groups[groupIdx] = { ...groups[groupIdx], subject_ids: [...current, subjectId] };
      }
      return { ...prev, groups };
    });
  };

  const moveGroup = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= modalForm.groups.length) return;
    setModalForm(prev => {
      const groups = [...prev.groups];
      [groups[idx], groups[newIdx]] = [groups[newIdx], groups[idx]];
      return { ...prev, groups };
    });
  };

  // ── Save Template ──
  const handleSaveTemplate = async () => {
    setModalError('');
    if (!modalForm.template_name.trim()) {
      setModalError('Template name is required.');
      return;
    }
    if (modalForm.groups.length === 0) {
      setModalError('At least one subject group is required.');
      return;
    }
    for (let i = 0; i < modalForm.groups.length; i++) {
      if (modalForm.groups[i].subject_ids.length === 0) {
        setModalError(`Group ${i + 1} must have at least one subject selected.`);
        return;
      }
    }

    setModalLoading(true);
    try {
      const payload = {
        program_id: parseInt(selectedProgramId, 10),
        semester: parseInt(selectedSemester, 10),
        template_name: modalForm.template_name.trim(),
        self_choice: modalForm.self_choice,
        is_default: modalForm.is_default,
        groups: modalForm.groups.map(g => ({
          group_label: g.group_label.trim() || null,
          subject_ids: g.subject_ids
        }))
      };

      if (editingTemplate) {
        await updateTemplateApi(editingTemplate.template_id, payload);
        setSuccessMsg('Template updated successfully!');
      } else {
        await createTemplateApi(payload);
        setSuccessMsg('Template created successfully!');
      }
      closeModal();
      loadTemplates();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save template.');
    } finally {
      setModalLoading(false);
    }
  };

  // ── Delete Template ──
  const handleDelete = async (templateId) => {
    setDeleteLoading(true);
    try {
      await deleteTemplateApi(templateId);
      setSuccessMsg('Template deleted successfully!');
      setDeleteConfirm(null);
      loadTemplates();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete template.');
      setDeleteConfirm(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Helper to get subject name by id
  const getSubjectLabel = (subjectId) => {
    const s = availableSubjects.find(sub => sub.subject_id === subjectId);
    if (!s) return `Subject #${subjectId}`;
    const dept = s.branch || '';
    const scheme = s.scheme_detail || '';
    const extra = [dept, scheme].filter(Boolean).join(' • ');
    return `${s.subject_code} – ${s.subject_name}${extra ? ` (${extra})` : ''}`;
  };

  const addMultipleSubjectsToGroup = (groupIdx, subjectIdsToAdd) => {
    setModalForm(prev => {
      const groups = [...prev.groups];
      const currentSet = new Set(groups[groupIdx].subject_ids);
      subjectIdsToAdd.forEach(id => currentSet.add(id));
      groups[groupIdx] = { ...groups[groupIdx], subject_ids: Array.from(currentSet) };
      return { ...prev, groups };
    });
  };

  const removeMultipleSubjectsFromGroup = (groupIdx, subjectIdsToRemove) => {
    setModalForm(prev => {
      const groups = [...prev.groups];
      const removeSet = new Set(subjectIdsToRemove);
      groups[groupIdx] = {
        ...groups[groupIdx],
        subject_ids: groups[groupIdx].subject_ids.filter(id => !removeSet.has(id))
      };
      return { ...prev, groups };
    });
  };

  return (
    <Layout>
      <div className="container" style={{ paddingBottom: '4rem', paddingTop: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ color: '#002147', fontWeight: 800, margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={24} /> Semester Templates
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
              Create and manage pre-defined subject structures for each semester &amp; program.
            </p>
          </div>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/admin/dashboard')}
            style={{ borderColor: '#cbd5e1', color: '#002147', fontWeight: 'bold' }}>
            <ArrowLeft size={14} style={{ marginRight: '0.3rem' }} /> Back to Console
          </button>
        </div>

        {/* Success / Error Messages */}
        {error && <div className="alert error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={16} /> {error}</div>}
        {successMsg && <div className="alert success" style={{ marginBottom: '1.5rem', background: '#d1fae5', color: '#065f46', border: '1px solid #10b981', padding: '1rem', borderRadius: '6px' }}>✓ {successMsg}</div>}

        {/* Filter Bar */}
        <div style={{
          background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem',
          marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end'
        }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.4rem', fontSize: '0.82rem' }}>Program</label>
            <ProgramSelect
              value={selectedProgramId}
              onChange={(e) => { setSelectedProgramId(e.target.value); setHasLoaded(false); setTemplates([]); }}
              placeholder="Select Program"
            />
          </div>

          <div style={{ width: '140px' }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.4rem', fontSize: '0.82rem' }}>Semester</label>
            <select value={selectedSemester} onChange={(e) => { setSelectedSemester(e.target.value); setHasLoaded(false); setTemplates([]); }}
              style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.88rem', background: 'white' }}>
              <option value="">Select</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>

          <button type="button" onClick={loadTemplates} disabled={!selectedProgramId || !selectedSemester || loading}
            style={{
              padding: '0.6rem 1.2rem', background: '#002147', color: 'white', border: 'none', borderRadius: '4px',
              fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', height: '38px',
              opacity: (!selectedProgramId || !selectedSemester) ? 0.5 : 1
            }}>
            {loading ? 'Loading...' : 'Load Templates'}
          </button>

          {hasLoaded && selectedProgramId && selectedSemester && (
            <button type="button" onClick={openCreateModal}
              style={{
                padding: '0.6rem 1.2rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '4px',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', height: '38px',
                display: 'flex', alignItems: 'center', gap: '0.3rem'
              }}>
              <Plus size={16} /> New Template
            </button>
          )}
        </div>

        {/* Templates List */}
        {hasLoaded && !loading && templates.length === 0 && (
          <div style={{
            background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '3rem',
            textAlign: 'center', color: '#94a3b8'
          }}>
            <Layers size={40} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: '1rem' }}>No templates found for this program & semester.</p>
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem' }}>Click "New Template" to create one.</p>
          </div>
        )}

        {templates.map(template => (
          <div key={template.template_id} style={{
            background: '#ffffff', border: template.is_default ? '2px solid #f59e0b' : '1px solid #e2e8f0',
            borderRadius: '8px', marginBottom: '1rem', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)', transition: 'box-shadow 0.2s'
          }}>
            {/* Template Header */}
            <div style={{
              padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer', background: expandedId === template.template_id ? '#f8fafc' : 'transparent'
            }}
              onClick={() => setExpandedId(expandedId === template.template_id ? null : template.template_id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#002147', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {template.template_name}
                    {template.is_default && (
                      <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 800 }}>
                        <Star size={10} style={{ marginRight: '0.15rem' }} />DEFAULT
                      </span>
                    )}
                    {template.self_choice && (
                      <span style={{ fontSize: '0.65rem', background: '#ede9fe', color: '#6d28d9', border: '1px solid #c4b5fd', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 800 }}>
                        SELF-CHOICE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                    {template.groups.length} group{template.groups.length !== 1 ? 's' : ''} •{' '}
                    {template.groups.reduce((acc, g) => acc + g.subjects.length, 0)} total subject entries
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); openEditModal(template); }}
                  style={{
                    background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px',
                    padding: '0.35rem 0.65rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                  }}>
                  <Edit3 size={12} /> Edit
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(template.template_id); }}
                  style={{
                    background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px',
                    padding: '0.35rem 0.65rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                  }}>
                  <Trash2 size={12} /> Delete
                </button>
                {expandedId === template.template_id ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
              </div>
            </div>

            {/* Expanded Detail */}
            {expandedId === template.template_id && (
              <div style={{ borderTop: '1px solid #e2e8f0', padding: '1rem 1.25rem' }}>
                {template.groups.map((group, gIdx) => (
                  <div key={group.group_id} style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px',
                    padding: '0.75rem', marginBottom: gIdx < template.groups.length - 1 ? '0.5rem' : 0
                  }}>
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                      {group.group_label
                        ? <span style={{ color: '#7c3aed' }}>⚡ {group.group_label}</span>
                        : <span style={{ color: '#16a34a' }}>✓ Mandatory</span>
                      }
                      {group.subjects.length > 1 && !group.group_label && (
                        <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: '0.5rem' }}>(multiple subjects)</span>
                      )}
                      {group.subjects.length > 1 && group.group_label && (
                        <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: '0.5rem' }}>(pick 1 of {group.subjects.length})</span>
                      )}
                    </div>
                    {group.subjects.map(sub => (
                      <div key={sub.subject_id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.35rem 0', fontSize: '0.82rem', color: '#334155', borderBottom: '1px solid #f1f5f9'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: '#002147' }}>{sub.subject_code}</span>
                          <span>–</span>
                          <span style={{ color: '#1e293b' }}>{sub.subject_name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                          {sub.branch && (
                            <span style={{ background: 'rgba(0,33,71,0.06)', color: '#002147', padding: '0.1rem 0.4rem', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 600 }}>
                              {sub.branch}
                            </span>
                          )}
                          {sub.scheme_detail && (
                            <span style={{ background: '#f8fafc', color: '#64748b', padding: '0.1rem 0.4rem', borderRadius: '3px', fontSize: '0.72rem', border: '1px solid #e2e8f0' }}>
                              {sub.scheme_detail}
                            </span>
                          )}
                          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{sub.credit} cr</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

      </div>

      {/* ══════════════════ Create / Edit Modal ══════════════════ */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          zIndex: 1000, padding: '2rem', overflowY: 'auto'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '8px', maxWidth: '720px', width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', margin: '2rem 0'
          }}>
            {/* Modal Header */}
            <div style={{
              background: '#002147', color: '#ffffff', padding: '1.25rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} /> {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h3>
              <button onClick={closeModal}
                style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', maxHeight: '65vh', overflowY: 'auto' }}>
              {modalError && (
                <div className="alert error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                  <AlertCircle size={14} /> {modalError}
                </div>
              )}

              {/* Template Name */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Template Name *</label>
                <input type="text" value={modalForm.template_name} onChange={(e) => setModalForm(prev => ({ ...prev, template_name: e.target.value }))}
                  placeholder='e.g. "Regular Track", "Internship Track"'
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem' }}
                />
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}
                  onClick={() => setModalForm(prev => ({ ...prev, is_default: !prev.is_default }))}>
                  {modalForm.is_default
                    ? <ToggleRight size={22} color="#f59e0b" />
                    : <ToggleLeft size={22} color="#94a3b8" />}
                  <span style={{ fontWeight: 600, color: modalForm.is_default ? '#b45309' : '#64748b' }}>Default Template</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}
                  onClick={() => setModalForm(prev => ({ ...prev, self_choice: !prev.self_choice }))}>
                  {modalForm.self_choice
                    ? <ToggleRight size={22} color="#7c3aed" />
                    : <ToggleLeft size={22} color="#94a3b8" />}
                  <span style={{ fontWeight: 600, color: modalForm.self_choice ? '#6d28d9' : '#64748b' }}>Allow Self-Choice</span>
                </label>
              </div>

              {/* Subject Groups */}
              <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontWeight: 700, color: '#002147', fontSize: '0.85rem' }}>Subject Groups</label>
                <button type="button" onClick={addGroup} style={{
                  background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '4px',
                  padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '0.25rem'
                }}>
                  <Plus size={12} /> Add Group
                </button>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.5 }}>
                Each group represents a "slot" in the template. Leave the label empty for mandatory subjects. 
                Add a label like "Professional Elective 1" for elective groups where the student picks one.
                If a group has multiple subjects, the student will choose one from the options.
              </div>

              {modalForm.groups.map((group, idx) => (
                <div key={idx} style={{
                  border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem', marginBottom: '0.75rem',
                  background: '#fafbfc'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* Reorder buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        <button type="button" onClick={() => moveGroup(idx, -1)} disabled={idx === 0}
                          style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', padding: 0, opacity: idx === 0 ? 0.3 : 1 }}>
                          <ChevronUp size={14} color="#64748b" />
                        </button>
                        <button type="button" onClick={() => moveGroup(idx, 1)} disabled={idx === modalForm.groups.length - 1}
                          style={{ background: 'none', border: 'none', cursor: idx === modalForm.groups.length - 1 ? 'default' : 'pointer', padding: 0, opacity: idx === modalForm.groups.length - 1 ? 0.3 : 1 }}>
                          <ChevronDown size={14} color="#64748b" />
                        </button>
                      </div>

                      <span style={{ fontWeight: 700, color: '#002147', fontSize: '0.82rem' }}>Group {idx + 1}</span>
                    </div>

                    {modalForm.groups.length > 1 && (
                      <button type="button" onClick={() => removeGroup(idx)} style={{
                        background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px',
                        padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                        display: 'inline-flex', alignItems: 'center', gap: '0.2rem'
                      }}>
                        <X size={10} /> Remove
                      </button>
                    )}
                  </div>

                  {/* Group Label */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '0.3rem', fontSize: '0.78rem' }}>
                      Group Label <span style={{ fontWeight: 400, color: '#94a3b8' }}>(leave empty for mandatory)</span>
                    </label>
                    <input type="text" value={group.group_label} onChange={(e) => updateGroupLabel(idx, e.target.value)}
                      placeholder='e.g. "Professional Elective 1", "Open Elective"'
                      style={{ width: '100%', padding: '0.5rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem' }}
                    />
                  </div>

                  {/* Subject Picker */}
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '0.3rem', fontSize: '0.78rem' }}>
                      Subjects *
                    </label>
                    <SubjectPicker
                      groupIdx={idx}
                      selectedIds={group.subject_ids}
                      availableSubjects={availableSubjects}
                      subjectsLoading={subjectsLoading}
                      onToggleSubject={toggleSubjectInGroup}
                      onAddMultipleSubjects={addMultipleSubjectsToGroup}
                      onRemoveMultipleSubjects={removeMultipleSubjectsFromGroup}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'flex-end', gap: '0.75rem'
            }}>
              <button type="button" onClick={closeModal} className="btn btn-outline"
                style={{ borderColor: '#cbd5e1', color: '#64748b', fontWeight: 600, borderRadius: '4px' }}>
                Cancel
              </button>
              <button type="button" onClick={handleSaveTemplate} disabled={modalLoading}
                style={{
                  padding: '0.6rem 1.5rem', background: '#002147', color: 'white', border: 'none',
                  borderRadius: '4px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                  opacity: modalLoading ? 0.6 : 1
                }}>
                {modalLoading ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
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
                Delete Template?
              </h3>
              <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                This will permanently delete this template and all its subject groups. This action cannot be undone.
              </p>
            </div>
            <div style={{
              padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'flex-end', gap: '0.75rem'
            }}>
              <button type="button" onClick={() => setDeleteConfirm(null)}
                style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>
                Cancel
              </button>
              <button type="button" onClick={() => handleDelete(deleteConfirm)} disabled={deleteLoading}
                style={{
                  padding: '0.5rem 1rem', background: '#dc2626', color: 'white', border: 'none',
                  borderRadius: '4px', cursor: 'pointer', fontWeight: 700, opacity: deleteLoading ? 0.6 : 1
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

// ── Top-Level Standalone Subject Picker Component ──
function SubjectPicker({
  groupIdx,
  selectedIds = [],
  availableSubjects = [],
  subjectsLoading = false,
  onToggleSubject,
  onAddMultipleSubjects,
  onRemoveMultipleSubjects
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScheme, setFilterScheme] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [open, setOpen] = useState(false);

  // Get unique departments/branches and schemes
  const uniqueDepartments = useMemo(() => {
    const set = new Set();
    availableSubjects.forEach(s => {
      if (s.branch) set.add(s.branch);
    });
    return Array.from(set).sort();
  }, [availableSubjects]);

  const uniqueSchemes = useMemo(() => {
    const set = new Set();
    availableSubjects.forEach(s => {
      if (s.scheme_detail) set.add(s.scheme_detail);
    });
    return Array.from(set).sort();
  }, [availableSubjects]);

  const filtered = useMemo(() => {
    return availableSubjects.filter(s => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        s.subject_code.toLowerCase().includes(term) ||
        s.subject_name.toLowerCase().includes(term) ||
        (s.branch && s.branch.toLowerCase().includes(term)) ||
        (s.scheme_detail && s.scheme_detail.toLowerCase().includes(term));

      const matchScheme = filterScheme === 'ALL' || s.scheme_detail === filterScheme;
      const matchDept = filterDept === 'ALL' || s.branch === filterDept;

      return matchSearch && matchScheme && matchDept;
    });
  }, [availableSubjects, searchTerm, filterScheme, filterDept]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedIds.includes(s.subject_id));

  return (
    <div style={{ position: 'relative' }}>
      {/* Selected Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem', minHeight: '28px' }}>
        {selectedIds.map(id => {
          const sub = availableSubjects.find(s => s.subject_id === id);
          return (
            <span key={id} style={{
              background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '4px',
              padding: '0.25rem 0.55rem', fontSize: '0.78rem', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
            }}>
              <span>{sub ? `${sub.subject_code} – ${sub.subject_name}` : `Subject #${id}`}</span>
              {sub?.branch && (
                <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>
                  {sub.branch}
                </span>
              )}
              <button type="button" onClick={() => onToggleSubject(groupIdx, id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e40af', fontSize: '1rem', padding: '0 0 0 2px', lineHeight: 1, display: 'flex', alignItems: 'center' }}>×</button>
            </span>
          );
        })}
        {selectedIds.length === 0 && <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>No subjects selected for this group</span>}
      </div>

      {/* Toggle Button */}
      <button type="button" onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '0.55rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '4px',
        background: open ? '#f8fafc' : 'white', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', color: '#1e293b',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500
      }}>
        <span>{open ? '▲ Close subject browser' : `▼ Browse & select subjects (${availableSubjects.length} available across all schemes/depts)`}</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div style={{
          border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '0.35rem',
          background: 'white', maxHeight: '380px', overflowY: 'auto', boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
        }}>
          {/* Search & Quick Filters Header */}
          <div style={{ padding: '0.65rem', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2 }}>
            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text" placeholder="Search by code (e.g. OEC-, PEC-), title, or scheme..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.6rem 0.45rem 2rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', background: 'white' }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Scheme:</span>
                <select
                  value={filterScheme}
                  onChange={(e) => setFilterScheme(e.target.value)}
                  style={{ padding: '0.25rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.75rem', background: 'white' }}
                >
                  <option value="ALL">All Schemes</option>
                  {uniqueSchemes.map(sch => (
                    <option key={sch} value={sch}>{sch}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Dept:</span>
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  style={{ padding: '0.25rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.75rem', background: 'white', maxWidth: '180px' }}
                >
                  <option value="ALL">All Departments</option>
                  {uniqueDepartments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: '0.73rem', fontWeight: 600 }}>
                Showing {filtered.length} of {availableSubjects.length}
              </span>
            </div>

            {/* Batch Selection Action Bar */}
            {filtered.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (allFilteredSelected) {
                      onRemoveMultipleSubjects(groupIdx, filtered.map(s => s.subject_id));
                    } else {
                      onAddMultipleSubjects(groupIdx, filtered.map(s => s.subject_id));
                    }
                  }}
                  style={{
                    background: allFilteredSelected ? '#fef2f2' : '#f0fdf4',
                    color: allFilteredSelected ? '#dc2626' : '#15803d',
                    border: `1px solid ${allFilteredSelected ? '#fca5a5' : '#86efac'}`,
                    borderRadius: '4px',
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  {allFilteredSelected ? `✕ Deselect All Filtered (${filtered.length})` : `+ Select All Filtered (${filtered.length})`}
                </button>

                <span style={{ fontSize: '0.73rem', color: '#475569', fontWeight: 600 }}>
                  {selectedIds.length} subject(s) in this group
                </span>
              </div>
            )}
          </div>

          {subjectsLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Loading all subjects...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No matching subjects found</div>
          ) : (
            filtered.map(s => {
              const isSelected = selectedIds.includes(s.subject_id);
              return (
                <div key={s.subject_id}
                  onClick={() => onToggleSubject(groupIdx, s.subject_id)}
                  style={{
                    padding: '0.55rem 0.85rem', cursor: 'pointer', fontSize: '0.82rem',
                    background: isSelected ? '#eff6ff' : 'transparent',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '3px', flexShrink: 0,
                      border: isSelected ? '2px solid #2563eb' : '2px solid #cbd5e1',
                      background: isSelected ? '#2563eb' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isSelected && <Check size={10} color="white" />}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, color: '#002147' }}>{s.subject_code}</span>
                      <span style={{ color: '#334155', marginLeft: '0.4rem' }}>{s.subject_name}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                    {s.branch && (
                      <span style={{ background: 'rgba(0,33,71,0.06)', color: '#002147', padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 600, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.branch}>
                        {s.branch}
                      </span>
                    )}
                    {s.scheme_detail && (
                      <span style={{ background: '#f8fafc', color: '#64748b', padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.72rem', border: '1px solid #e2e8f0' }}>
                        {s.scheme_detail}
                      </span>
                    )}
                    <span style={{ color: '#94a3b8', fontSize: '0.72rem', minWidth: '32px', textAlign: 'right' }}>{s.credit} cr</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
