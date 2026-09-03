import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getAdminExamsApi, getAdminSchedulesApi, createAdminScheduleApi } from '../api/adminApi';
import { Calendar, Clock, BookOpen, AlertCircle, CheckCircle, Search, Filter, Loader2, Save, Sparkles, Plus, Trash2, Layers, CheckSquare, Square, X } from 'lucide-react';
import axios from 'axios';

export default function ScheduleExam() {
  const navigate = useNavigate();
  const { token } = useAuth();

  // Exams
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [loadingExams, setLoadingExams] = useState(true);

  // Master Subjects Catalog (all theory subjects)
  const [allMasterSubjects, setAllMasterSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScheme, setSelectedScheme] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [viewTab, setViewTab] = useState('scheduled'); // 'scheduled' | 'catalog'

  // Selected subjects to schedule: Set or Array of subject IDs
  const [selectedSubjectIds, setSelectedSubjectIds] = useState(new Set());
  // Schedule inputs: { [subject_id]: { exam_date, start_time, end_time } }
  const [scheduleInputs, setScheduleInputs] = useState({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 1. Fetch Exams on mount
  useEffect(() => {
    const fetchExams = async () => {
      setLoadingExams(true);
      setError('');
      try {
        const data = await getAdminExamsApi();
        const activeExams = Array.isArray(data) ? data.filter(e => e.is_active !== false) : [];
        setExams(activeExams);
        if (activeExams.length > 0) {
          setSelectedExamId(String(activeExams[0].exam_id));
        }
      } catch (err) {
        console.error('Failed to fetch exams:', err);
        setError('Failed to fetch exams.');
      } finally {
        setLoadingExams(false);
      }
    };
    fetchExams();
  }, [token]);

  // 2. Fetch all master subjects (theory > 0) on mount
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoadingSubjects(true);
      try {
        const { data } = await axios.get('/api/subjects');
        // Only theory subjects have written examination timetables
        const theorySubs = Array.isArray(data)
          ? data.filter(s => (s.theory !== undefined ? s.theory > 0 : s.max_marks_endsem > 0))
          : [];
        setAllMasterSubjects(theorySubs);
      } catch (err) {
        console.error('Failed to fetch master subjects catalog:', err);
        setError('Failed to fetch master subjects catalog.');
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchCatalog();
  }, [token]);

  // 3. When selectedExamId changes, load its existing schedules
  useEffect(() => {
    if (!selectedExamId) return;

    const loadExamSchedules = async () => {
      setError('');
      setSuccess(false);
      try {
        const existingSchedules = await getAdminSchedulesApi(selectedExamId);
        const nextSelected = new Set();
        const nextInputs = {};

        if (Array.isArray(existingSchedules)) {
          existingSchedules.forEach(sch => {
            nextSelected.add(sch.subject_id);
            const formattedDate = sch.exam_date ? sch.exam_date.substring(0, 10) : '';
            const startTime = sch.start_time ? sch.start_time.substring(0, 5) : '';
            const endTime = sch.end_time ? sch.end_time.substring(0, 5) : '';

            nextInputs[sch.subject_id] = {
              exam_date: formattedDate,
              start_time: startTime,
              end_time: endTime
            };
          });
        }

        setSelectedSubjectIds(nextSelected);
        setScheduleInputs(nextInputs);

        // If no schedules exist yet for this exam, switch view tab to catalog to let user pick subjects
        if (nextSelected.size === 0) {
          setViewTab('catalog');
        } else {
          setViewTab('scheduled');
        }
      } catch (err) {
        console.error('Failed to load existing schedules:', err);
      }
    };

    loadExamSchedules();
  }, [selectedExamId, token]);

  // Auto-dismiss success alert
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Unique Schemes and Departments for Filter Dropdowns
  const uniqueSchemes = useMemo(() => {
    const s = new Set();
    allMasterSubjects.forEach(sub => {
      if (sub.scheme_detail) s.add(sub.scheme_detail);
    });
    return Array.from(s).sort();
  }, [allMasterSubjects]);

  const uniqueDepartments = useMemo(() => {
    const d = new Set();
    allMasterSubjects.forEach(sub => {
      if (sub.branch) d.add(sub.branch);
    });
    return Array.from(d).sort();
  }, [allMasterSubjects]);

  // Filter master subjects based on Search, Scheme, and Department
  const filteredCatalog = useMemo(() => {
    return allMasterSubjects.filter(sub => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        sub.subject_code.toLowerCase().includes(term) ||
        sub.subject_name.toLowerCase().includes(term) ||
        (sub.branch && sub.branch.toLowerCase().includes(term)) ||
        (sub.scheme_detail && sub.scheme_detail.toLowerCase().includes(term));

      const matchScheme = selectedScheme === 'ALL' || sub.scheme_detail === selectedScheme;
      const matchDept = selectedDepartment === 'ALL' || sub.branch === selectedDepartment;

      return matchSearch && matchScheme && matchDept;
    });
  }, [allMasterSubjects, searchTerm, selectedScheme, selectedDepartment]);

  // Filter scheduled subjects that are selected
  const scheduledSubjectsList = useMemo(() => {
    return allMasterSubjects.filter(sub => selectedSubjectIds.has(sub.subject_id));
  }, [allMasterSubjects, selectedSubjectIds]);

  // Handle Input Changes
  const handleInputChange = (subjectId, field, value) => {
    setScheduleInputs(prev => ({
      ...prev,
      [subjectId]: {
        ...(prev[subjectId] || { exam_date: '', start_time: '', end_time: '' }),
        [field]: value
      }
    }));
  };

  // Toggle subject selection in catalog
  const toggleSubject = (subjectId) => {
    setSelectedSubjectIds(prev => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  // Select all filtered catalog subjects
  const selectAllFiltered = () => {
    setSelectedSubjectIds(prev => {
      const next = new Set(prev);
      filteredCatalog.forEach(sub => next.add(sub.subject_id));
      return next;
    });
  };

  // Deselect all filtered catalog subjects
  const deselectAllFiltered = () => {
    setSelectedSubjectIds(prev => {
      const next = new Set(prev);
      filteredCatalog.forEach(sub => next.delete(sub.subject_id));
      return next;
    });
  };

  // Apply time preset (e.g. 10:00 - 13:00) to all scheduled subjects
  const applyTimePreset = (startTime, endTime) => {
    setScheduleInputs(prev => {
      const next = { ...prev };
      scheduledSubjectsList.forEach(sub => {
        next[sub.subject_id] = {
          ...(next[sub.subject_id] || { exam_date: '' }),
          start_time: startTime,
          end_time: endTime
        };
      });
      return next;
    });
  };

  // Save schedules
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    if (!selectedExamId) {
      setError('Please select an examination first.');
      setSaving(false);
      return;
    }

    const schedulesPayload = [];
    let hasIncomplete = false;

    selectedSubjectIds.forEach(subId => {
      const input = scheduleInputs[subId] || {};
      const { exam_date, start_time, end_time } = input;
      if (exam_date || start_time || end_time) {
        if (!exam_date || !start_time || !end_time) {
          hasIncomplete = true;
        } else {
          schedulesPayload.push({
            subject_id: parseInt(subId, 10),
            exam_date,
            start_time,
            end_time
          });
        }
      }
    });

    if (hasIncomplete) {
      setError('Please complete Date, Start Time, and End Time for all scheduled subjects.');
      setSaving(false);
      return;
    }

    if (schedulesPayload.length === 0) {
      setError('No date/time schedules to save. Please enter Exam Date, Start Time, and End Time for selected subjects.');
      setSaving(false);
      return;
    }

    try {
      await createAdminScheduleApi(parseInt(selectedExamId, 10), schedulesPayload);
      setSuccess(true);
      setViewTab('scheduled');
    } catch (err) {
      console.error('Save schedules error:', err);
      setError(err.response?.data?.message || 'Failed to save schedules.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="container" style={{ paddingBottom: '4rem', paddingTop: '2rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ color: '#002147', fontWeight: 800, margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={24} /> Schedule Examination
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
              Select subjects by scheme or search keywords, assign theory exam dates and time parameters.
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
        {success && <div className="alert success" style={{ marginBottom: '1.5rem', background: '#d1fae5', color: '#065f46', border: '1px solid #10b981', padding: '1rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} /> Exam schedules saved successfully!</div>}

        {/* 1. Exam Selector Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Select Examination Cycle
          </label>
          {loadingExams ? (
            <div style={{ padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#f8fafc', color: 'var(--text-muted)' }}>
              Loading exams...
            </div>
          ) : exams.length === 0 ? (
            <div style={{ padding: '0.6rem 0.8rem', border: '1px solid #fecaca', borderRadius: '4px', background: '#fef2f2', color: '#dc2626' }}>
              No active exams found in system.
            </div>
          ) : (
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '1rem', fontWeight: 600, background: 'white', color: '#002147' }}
            >
              <option value="" disabled>-- Select Examination --</option>
              {exams.map(ex => (
                <option key={ex.exam_id} value={ex.exam_id}>
                  {ex.exam_name} ({ex.exam_code})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 2. Navigation Tabs & Filters Bar */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', marginBottom: '1.5rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
            {/* View Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setViewTab('scheduled')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 700,
                  cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                  background: viewTab === 'scheduled' ? '#002147' : '#f1f5f9',
                  color: viewTab === 'scheduled' ? '#ffffff' : '#475569'
                }}
              >
                📅 Selected for Timetable ({selectedSubjectIds.size})
              </button>

              <button
                type="button"
                onClick={() => setViewTab('catalog')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 700,
                  cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                  background: viewTab === 'catalog' ? '#002147' : '#f1f5f9',
                  color: viewTab === 'catalog' ? '#ffffff' : '#475569'
                }}
              >
                🔍 Browse &amp; Add Subjects ({allMasterSubjects.length})
              </button>
            </div>

            {/* Quick Actions for scheduled view */}
            {viewTab === 'scheduled' && scheduledSubjectsList.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Sparkles size={13} color="#2563eb" /> Fill Time:
                </span>
                <button
                  type="button"
                  onClick={() => applyTimePreset('10:00', '13:00')}
                  style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '0.2rem 0.55rem', fontSize: '0.75rem', fontWeight: 600, color: '#1e40af', cursor: 'pointer' }}
                >
                  10:00 AM - 01:00 PM
                </button>
                <button
                  type="button"
                  onClick={() => applyTimePreset('14:30', '17:30')}
                  style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '0.2rem 0.55rem', fontSize: '0.75rem', fontWeight: 600, color: '#1e40af', cursor: 'pointer' }}
                >
                  02:30 PM - 05:30 PM
                </button>
              </div>
            )}
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr', gap: '1rem' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search subject code, title (e.g. Physics, Chemistry, Math)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.2rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.88rem' }}
              />
            </div>

            {/* Scheme Filter */}
            <div>
              <select
                value={selectedScheme}
                onChange={(e) => setSelectedScheme(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', background: 'white' }}
              >
                <option value="ALL">All Schemes</option>
                {uniqueSchemes.map(sch => (
                  <option key={sch} value={sch}>{sch}</option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', background: 'white' }}
              >
                <option value="ALL">All Departments</option>
                {uniqueDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* 3. Main Content View */}
        {viewTab === 'catalog' ? (
          /* ── CATALOG BROWSER VIEW (Add / Select Subjects) ── */
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ color: '#002147', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  Master Subject Catalog ({filteredCatalog.length} subjects found)
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0.2rem 0 0 0' }}>
                  Check the theory subjects you want to schedule for this examination cycle.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.35rem 0.7rem', fontSize: '0.78rem', fontWeight: 600, color: '#002147', cursor: 'pointer' }}
                >
                  Select All Filtered
                </button>
                <button
                  type="button"
                  onClick={deselectAllFiltered}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.35rem 0.7rem', fontSize: '0.78rem', fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}
                >
                  Deselect All
                </button>
                <button
                  type="button"
                  onClick={() => setViewTab('scheduled')}
                  style={{ background: '#002147', color: 'white', border: 'none', borderRadius: '4px', padding: '0.35rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Done Selecting → Set Dates ({selectedSubjectIds.size})
                </button>
              </div>
            </div>

            {loadingSubjects ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading master subjects catalog...</div>
            ) : filteredCatalog.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No theory subjects found matching the filter criteria.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '0.75rem', maxHeight: '520px', overflowY: 'auto', paddingRight: '0.3rem' }}>
                {filteredCatalog.map(sub => {
                  const isChecked = selectedSubjectIds.has(sub.subject_id);
                  return (
                    <div
                      key={sub.subject_id}
                      onClick={() => toggleSubject(sub.subject_id)}
                      style={{
                        border: isChecked ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: isChecked ? '#eff6ff' : '#ffffff',
                        borderRadius: '6px', padding: '0.85rem 1rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                        transition: 'all 0.15s', boxShadow: isChecked ? '0 2px 4px rgba(37,99,235,0.1)' : 'none'
                      }}
                    >
                      <div style={{ marginTop: '0.15rem' }}>
                        {isChecked ? (
                          <div style={{ width: '18px', height: '18px', background: '#2563eb', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle size={14} color="white" />
                          </div>
                        ) : (
                          <div style={{ width: '18px', height: '18px', border: '2px solid #cbd5e1', borderRadius: '4px' }} />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, color: '#002147', fontSize: '0.9rem' }}>{sub.subject_code}</span>
                          <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 600 }}>
                            TH: {sub.theory}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600, marginTop: '0.2rem', lineHeight: 1.2 }}>
                          {sub.subject_name}
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem', fontSize: '0.72rem' }}>
                          <span style={{ background: 'rgba(0,33,71,0.06)', color: '#002147', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 600 }}>
                            {sub.branch || 'Common'}
                          </span>
                          <span style={{ background: '#f8fafc', color: '#64748b', padding: '0.1rem 0.4rem', borderRadius: '3px', border: '1px solid #e2e8f0' }}>
                            {sub.scheme_detail || 'CBCGS-HME'}
                          </span>
                          <span style={{ color: '#94a3b8', marginLeft: 'auto' }}>{sub.credit} cr</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── SCHEDULED TIMETABLE MATRIX VIEW (Set Dates & Times) ── */
          <form onSubmit={handleSave} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ color: '#002147', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  Exam Timetable Schedule ({scheduledSubjectsList.length} subjects)
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0.2rem 0 0 0' }}>
                  Assign the exam date, start time, and end time for each theory subject in this examination.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewTab('catalog')}
                style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '0.4rem 0.8rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Plus size={14} /> Add More Subjects from Catalog
              </button>
            </div>

            {scheduledSubjectsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                <BookOpen size={40} style={{ margin: '0 auto 0.75rem auto', color: '#cbd5e1' }} />
                <h4 style={{ color: '#334155', margin: '0 0 0.5rem 0' }}>No Subjects Selected for this Exam</h4>
                <p style={{ fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
                  Click below to browse the Master Subject Catalog and pick the theory subjects for this exam.
                </p>
                <button
                  type="button"
                  onClick={() => setViewTab('catalog')}
                  style={{ background: '#002147', color: 'white', border: 'none', borderRadius: '4px', padding: '0.6rem 1.2rem', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Browse Master Subjects Catalog →
                </button>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#002147', fontWeight: 'bold' }}>
                        <th style={{ padding: '0.8rem 1rem', width: '14%' }}>Code</th>
                        <th style={{ padding: '0.8rem 1rem', width: '28%' }}>Subject Name</th>
                        <th style={{ padding: '0.8rem 1rem', width: '14%' }}>Department / Scheme</th>
                        <th style={{ padding: '0.8rem 1rem', width: '17%' }}>Exam Date</th>
                        <th style={{ padding: '0.8rem 1rem', width: '11%' }}>Start Time</th>
                        <th style={{ padding: '0.8rem 1rem', width: '11%' }}>End Time</th>
                        <th style={{ padding: '0.8rem 1rem', width: '5%', textAlign: 'center' }}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledSubjectsList.map(sub => {
                        const input = scheduleInputs[sub.subject_id] || { exam_date: '', start_time: '', end_time: '' };
                        const isFilled = Boolean(input.exam_date && input.start_time && input.end_time);

                        return (
                          <tr key={sub.subject_id} style={{ borderBottom: '1px solid #e2e8f0', background: isFilled ? '#f0fdf4' : 'transparent' }}>
                            <td style={{ padding: '0.9rem 1rem', fontWeight: 800, color: '#002147' }}>
                              {sub.subject_code}
                            </td>
                            <td style={{ padding: '0.9rem 1rem' }}>
                              <div style={{ fontWeight: 600, color: '#1e293b' }}>{sub.subject_name}</div>
                              {isFilled && (
                                <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                                  <CheckCircle size={11} /> Ready
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              <div style={{ fontWeight: 600, color: '#002147' }}>{sub.branch || 'Common'}</div>
                              <div style={{ color: '#94a3b8', marginTop: '0.1rem' }}>{sub.scheme_detail}</div>
                            </td>
                            <td style={{ padding: '0.7rem' }}>
                              <input
                                type="date"
                                value={input.exam_date}
                                onChange={(e) => handleInputChange(sub.subject_id, 'exam_date', e.target.value)}
                                style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', background: 'white' }}
                              />
                            </td>
                            <td style={{ padding: '0.7rem' }}>
                              <input
                                type="time"
                                value={input.start_time}
                                onChange={(e) => handleInputChange(sub.subject_id, 'start_time', e.target.value)}
                                style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', background: 'white' }}
                              />
                            </td>
                            <td style={{ padding: '0.7rem' }}>
                              <input
                                type="time"
                                value={input.end_time}
                                onChange={(e) => handleInputChange(sub.subject_id, 'end_time', e.target.value)}
                                style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', background: 'white' }}
                              />
                            </td>
                            <td style={{ padding: '0.7rem', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => toggleSubject(sub.subject_id)}
                                title="Remove from exam schedule"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.3rem', borderRadius: '4px' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                              >
                                <X size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    width: '100%', padding: '0.9rem', fontSize: '1rem',
                    background: saving ? '#94a3b8' : '#002147', color: 'white',
                    fontWeight: 'bold', border: 'none', borderRadius: '4px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    transition: 'background 0.2s'
                  }}
                >
                  <Save size={18} />
                  {saving ? 'Saving Exam Schedule Settings...' : `Save Exam Schedule (${scheduledSubjectsList.length} Subjects)`}
                </button>
              </>
            )}

          </form>
        )}

      </div>
    </Layout>
  );
}
