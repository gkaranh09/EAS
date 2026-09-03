import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getExamsApi, getSubjectsApi, submitFormApi, getSemesterTemplatesApi } from '../api/studentApi';
import { 
  AlertCircle, User, Info, BookOpen, Pin, ClipboardList, Loader2, Send, Search, 
  Layers, Check, Star, Lock, Unlock, Sparkles, CheckCircle2, RefreshCw, CheckSquare, ListChecks, X, Trash2
} from 'lucide-react';

export default function ExamFormPage() {
  const { examId }  = useParams();
  const navigate    = useNavigate();
  const { student } = useAuth();

  const [exam, setExam]               = useState(null);
  const [subjects, setSubjects]       = useState([]);
  const [selected, setSelected]       = useState(new Set());
  const [repeters, setRepeters]       = useState(false);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  // Default semester based on student current_semester / current_year or default 3
  const defaultSem = useMemo(() => {
    if (student?.current_semester) return String(student.current_semester);
    const yr = String(student?.current_year || '');
    if (yr === '1' || yr === 'FE') return '1';
    if (yr === '2' || yr === 'SE' || student?.category === 'SE') return '3';
    if (yr === '3' || yr === 'TE' || student?.category === 'TE') return '5';
    if (yr === '4' || yr === 'BE' || student?.category === 'BE') return '7';
    return '3';
  }, [student?.current_semester, student?.current_year, student?.category]);

  const [semesterFilter, setSemesterFilter] = useState(defaultSem);
  const [branchFilter, setBranchFilter]     = useState('ALL');
  const [searchQuery, setSearchQuery]       = useState('');

  // ── Semester Templates State ──
  const [templates, setTemplates]                 = useState([]);
  const [loadingTemplates, setLoadingTemplates]   = useState(false);
  const [activeTemplateId, setActiveTemplateId]   = useState(null);
  const [electiveChoices, setElectiveChoices]     = useState({}); // { [groupId]: subjectId }

  // Fetch initial exam and subjects data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examsRes, subjectsRes] = await Promise.all([
          getExamsApi(),
          getSubjectsApi(),
        ]);
        const found = examsRes.find(e => String(e.exam_id) === String(examId));
        if (!found) {
          setError('Exam not found.');
          return;
        }
        if (found.apply_completed) {
          if (found.payment_status === 'paid') {
            navigate(`/form/${found.form_id}/success`, { replace: true });
          } else {
            navigate(`/form/${found.form_id}/pay`, { replace: true });
          }
          return;
        }
        setExam(found);
        setSubjects(subjectsRes);
      } catch {
        setError('Failed to load exam data. Please go back and try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [examId, navigate]);

  // Fetch semester templates whenever program or semester changes
  useEffect(() => {
    const progId = student?.program_id || 1;
    const sem = semesterFilter === 'ALL' ? defaultSem : semesterFilter;

    if (!progId || !sem) return;

    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const data = await getSemesterTemplatesApi(progId, sem);
        setTemplates(data || []);
        
        // If templates exist, default to the marked default template or the first one
        if (data && data.length > 0) {
          const defTpl = data.find(t => t.is_default) || data[0];
          applyTemplate(defTpl);
        } else {
          setActiveTemplateId(null);
          setElectiveChoices({});
        }
      } catch (err) {
        console.error('Failed to load templates:', err);
        setTemplates([]);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [student?.program_id, semesterFilter, defaultSem]);

  // Function to apply a template and auto-select its subjects
  const applyTemplate = (tpl) => {
    if (!tpl) return;
    setActiveTemplateId(tpl.template_id);

    const initialElectives = {};
    const newSelected = new Set();

    tpl.groups.forEach(group => {
      if (!group.subjects || group.subjects.length === 0) return;

      if (group.subjects.length === 1) {
        // Mandatory subject
        newSelected.add(group.subjects[0].subject_id);
      } else {
        // Multi-choice elective group: pick first option by default (or retain existing)
        const chosenId = electiveChoices[group.group_id] || group.subjects[0].subject_id;
        initialElectives[group.group_id] = chosenId;
        newSelected.add(chosenId);
      }
    });

    setElectiveChoices(initialElectives);
    setSelected(newSelected);
  };

  // Handle changing an elective subject in the active template
  const handleSelectElective = (groupId, newSubjectId) => {
    const oldSubjectId = electiveChoices[groupId];
    setElectiveChoices(prev => ({
      ...prev,
      [groupId]: newSubjectId
    }));

    setSelected(prev => {
      const next = new Set(prev);
      if (oldSubjectId) next.delete(oldSubjectId);
      next.add(newSubjectId);
      return next;
    });
  };

  // Switch to manual mode
  const handleSelectManual = () => {
    setActiveTemplateId(null);
    setElectiveChoices({});
    setSelected(new Set());
  };

  const activeTemplate = templates.find(t => t.template_id === activeTemplateId);

  const toggleSubject = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const removeSubject = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Derive available branches & semesters from loaded subjects
  const availableBranches = Array.from(new Set(subjects.map(s => s.branch).filter(Boolean)));
  const availableSemesters = Array.from(new Set(subjects.map(s => s.semester).filter(Boolean)));

  // Filter subjects by search query (subject_name or subject_code), branch, and semester for manual mode
  const filteredSubjects = subjects.filter(sub => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q === '' || 
      (sub.subject_name && sub.subject_name.toLowerCase().includes(q)) ||
      (sub.subject_code && sub.subject_code.toLowerCase().includes(q));

    const matchesBranch = branchFilter === 'ALL' || 
      (sub.branch && sub.branch.toLowerCase() === branchFilter.toLowerCase());

    const matchesSem = semesterFilter === 'ALL' || 
      (sub.semester && String(sub.semester).toLowerCase() === semesterFilter.toLowerCase());

    return matchesSearch && matchesBranch && matchesSem;
  });

  const handleSelectAllFiltered = () => {
    setSelected(prev => {
      const next = new Set(prev);
      filteredSubjects.forEach(s => next.add(s.subject_id));
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selected.size === 0) {
      setError('Please select at least one subject before submitting.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const data = await submitFormApi(parseInt(examId), Array.from(selected), repeters);
      if (data.payment_status === 'paid') {
        navigate(`/form/${data.form_id}/success`);
      } else {
        navigate(`/form/${data.form_id}/pay`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Submission failed. Please try again.';
      if (err.response?.status === 409 && err.response?.data?.form_id) {
        navigate(`/form/${err.response.data.form_id}/pay`);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const examTypeClass = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'regular') return 'regular';
    if (t === 'supplementary') return 'supplementary';
    if (t.includes('kt') || t.includes('at')) return 'kt';
    return 'repeater';
  };

  // Helper to calculate list and total credits of selected subjects
  const selectedSubjectsList = useMemo(() => {
    return subjects.filter(s => selected.has(s.subject_id));
  }, [subjects, selected]);

  const totalCredits = useMemo(() => {
    return selectedSubjectsList.reduce((sum, s) => sum + (Number(s.credit) || 0), 0);
  }, [selectedSubjectsList]);

  if (loading) {
    return (
      <Layout>
        <div className="page-wrapper">
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading exam form…</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '2rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '820px' }}>

          {/* Back link */}
          <Link
            to="/dashboard"
            id="back-to-dashboard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                     color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem',
                     marginBottom: '1.5rem', transition: 'color 0.2s' }}
            onMouseEnter={e => e.target.style.color = '#002147'}
            onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
          >
            ← Back to Dashboard
          </Link>

          {/* Step Indicator */}
          <div className="step-indicator">
            <div className="step active">
              <div className="step-circle">1</div>
              <span className="step-label">Fill Form</span>
            </div>
            <div className="step-line" />
            <div className="step">
              <div className="step-circle">2</div>
              <span className="step-label">Pay Fees</span>
            </div>
            <div className="step-line" />
            <div className="step">
              <div className="step-circle">3</div>
              <span className="step-label">Submit & PDF</span>
            </div>
          </div>

          {/* Page Header */}
          <div className="page-header">
            <h1 className="page-title">Exam Application Form</h1>
            {exam && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem' }}>
                <p className="page-subtitle">{exam.exam_name}</p>
                <span className={`exam-type-tag ${examTypeClass(exam.exam_type)}`}>{exam.exam_type}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="alert error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <form id="exam-form" onSubmit={handleSubmit}>

            {/* ── 1. Student Information ───────────────────────── */}
            <div className="glass-card animate-fadeInUp" style={{ marginBottom: '1.5rem' }}>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={18} /> Student Information
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Full Name</span>
                  <span className="info-value">{student?.full_name || '—'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email Address</span>
                  <span className="info-value">{student?.email || '—'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Program / Branch</span>
                  <span className="info-value">
                    <span className="badge-category">{student?.program || student?.department || '—'}</span>
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Year / Category</span>
                  <span className="info-value">{student?.current_year ? `Year ${student.current_year}` : 'Year 2'} (Sem {student?.current_semester || 3}) • <span className="badge-category" style={{ fontSize: '0.72rem' }}>{student?.category?.toUpperCase() || 'OPEN'}</span></span>
                </div>
              </div>

              {/* Repeater / Candidate Type Option */}
              <div style={{ marginTop: '1.25rem', padding: '0.85rem 1.15rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#002147' }}>Candidate Application Status</span>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Are you applying as an Ex-Student / Repeater candidate?</p>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 700, color: repeters ? '#b91c1c' : '#002147', background: repeters ? '#fee2e2' : '#ffffff', border: `1px solid ${repeters ? '#ef4444' : '#cbd5e1'}`, padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
                  <input
                    type="checkbox"
                    checked={repeters}
                    onChange={(e) => setRepeters(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>{repeters ? '✓ Repeater (Ex-Student)' : 'Regular Student'}</span>
                </label>
              </div>

              <div className="divider" style={{ margin: '1rem 0' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <Info size={16} /> Details pre-filled from your registered student profile.
              </div>
            </div>

            {/* ── 2. Pre-Defined Curriculum Structure ─────────── */}
            <div className="glass-card animate-fadeInUp" style={{ marginBottom: '1.5rem', border: '1.5px solid #e0e7ff', background: '#f8faff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#002147', fontSize: '1.05rem' }}>
                  <Layers size={20} color="#2563eb" />
                  Pre-Defined Curriculum Structure
                </div>

                {/* Semester Switcher */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Target Sem:</span>
                  <select
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    style={{ padding: '0.25rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#002147', background: 'white' }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={String(s)}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p style={{ fontSize: '0.84rem', color: '#475569', margin: '0 0 1rem 0', lineHeight: 1.45 }}>
                Choose a curriculum track created by your department coordinator, or select subjects manually.
              </p>

              {/* Template Options & Custom Option */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {templates.map(tpl => {
                  const isSelected = activeTemplateId === tpl.template_id;
                  return (
                    <div
                      key={tpl.template_id}
                      onClick={() => applyTemplate(tpl)}
                      style={{
                        flex: '1 1 200px',
                        cursor: 'pointer',
                        padding: '0.9rem 1.1rem',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: isSelected ? '#ffffff' : '#f1f5f9',
                        boxShadow: isSelected ? '0 4px 6px -1px rgba(37, 99, 235, 0.12)' : 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 700, color: isSelected ? '#1e40af' : '#002147', fontSize: '0.95rem' }}>
                          {tpl.template_name}
                        </span>
                        {isSelected && <CheckCircle2 size={18} color="#2563eb" />}
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                        {tpl.is_default && (
                          <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#b45309', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Star size={9} /> Default Track
                          </span>
                        )}
                        <span style={{ fontSize: '0.65rem', background: '#ecfdf5', color: '#047857', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                          {tpl.groups?.length || 0} Subject Slots
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Custom / Manual Selection Option */}
                <div
                  onClick={handleSelectManual}
                  style={{
                    flex: '1 1 180px',
                    cursor: 'pointer',
                    padding: '0.9rem 1.1rem',
                    borderRadius: '8px',
                    border: !activeTemplateId ? '2px solid #002147' : '1px solid #cbd5e1',
                    background: !activeTemplateId ? '#ffffff' : '#f8fafc',
                    boxShadow: !activeTemplateId ? '0 4px 6px -1px rgba(0, 33, 71, 0.12)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: !activeTemplateId ? '#002147' : '#475569', fontSize: '0.95rem' }}>
                      Custom / Manual
                    </span>
                    {!activeTemplateId && <CheckCircle2 size={18} color="#002147" />}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Search & choose subjects individually
                  </span>
                </div>
              </div>
            </div>

            {/* ── 3. Conditional Content based on Selection ───── */}
            {activeTemplate ? (
              /* ── COMPONENT A: TEMPLATE SUBJECTS OVERVIEW WITH ELECTIVE DROPDOWNS ── */
              <div className="glass-card animate-fadeInUp" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ListChecks size={18} color="#2563eb" />
                      Template Curriculum: {activeTemplate.template_name}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                      All mandatory subjects are included. Select your preferred options for any elective groups below.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#002147', fontWeight: 700, background: '#eff6ff', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                      {selected.size} Subjects Enrolled ({totalCredits} Credits)
                    </span>
                  </div>
                </div>

                {/* List of Template Groups & Subjects */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeTemplate.groups.map((group, gIdx) => {
                    const isMultiChoice = group.subjects && group.subjects.length > 1;
                    const selectedSubjectId = isMultiChoice
                      ? (electiveChoices[group.group_id] || group.subjects[0]?.subject_id)
                      : group.subjects[0]?.subject_id;

                    const chosenSubject = group.subjects.find(s => s.subject_id === selectedSubjectId) || group.subjects[0];

                    return (
                      <div
                        key={group.group_id || gIdx}
                        style={{
                          background: isMultiChoice ? '#fdfaff' : '#f8fafc',
                          border: isMultiChoice ? '1.5px solid #d8b4fe' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '1rem',
                        }}
                      >
                        {/* Group Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}>
                            {isMultiChoice ? (
                              <span style={{ color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Sparkles size={14} /> {group.group_label || `Elective Group ${gIdx + 1}`}
                              </span>
                            ) : (
                              <span style={{ color: '#047857', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Check size={14} /> Mandatory Course
                              </span>
                            )}
                          </div>
                          
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isMultiChoice ? '#7c3aed' : '#64748b' }}>
                            {isMultiChoice ? `Choose 1 of ${group.subjects.length} options` : 'Fixed Syllabus'}
                          </span>
                        </div>

                        {/* If multi-choice elective: Show Dropdown selector */}
                        {isMultiChoice ? (
                          <div>
                            <select
                              value={selectedSubjectId || ''}
                              onChange={(e) => handleSelectElective(group.group_id, parseInt(e.target.value, 10))}
                              style={{
                                width: '100%',
                                padding: '0.65rem 0.85rem',
                                border: '1.5px solid #a855f7',
                                borderRadius: '6px',
                                fontSize: '0.88rem',
                                background: 'white',
                                fontWeight: 700,
                                color: '#002147',
                                cursor: 'pointer',
                                marginBottom: '0.5rem'
                              }}
                            >
                              {group.subjects.map(sub => (
                                <option key={sub.subject_id} value={sub.subject_id}>
                                  {sub.subject_code} – {sub.subject_name} ({sub.credit || 0} Cr)
                                </option>
                              ))}
                            </select>

                            {/* Details of currently chosen elective */}
                            {chosenSubject && (
                              <div style={{ background: '#ffffff', border: '1px solid #e9d5ff', borderRadius: '6px', padding: '0.55rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.78rem', color: '#475569' }}>
                                <div>
                                  Selected: <strong style={{ color: '#002147' }}>{chosenSubject.subject_name}</strong>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <span className="marks-badge endsem">Credits: {chosenSubject.credit ?? 0}</span>
                                  <span className="marks-badge ise">ESE: {chosenSubject.theory ?? 0}</span>
                                  <span className="marks-badge pr">TW: {chosenSubject.term_work ?? 0}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Fixed Single Subject Display */
                          chosenSubject && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div>
                                <span style={{ fontWeight: 800, color: '#1e40af', marginRight: '0.4rem' }}>
                                  {chosenSubject.subject_code}
                                </span>
                                <span style={{ fontWeight: 600, color: '#002147', fontSize: '0.9rem' }}>
                                  {chosenSubject.subject_name}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <span className="marks-badge endsem">Credits: {chosenSubject.credit ?? 0}</span>
                                <span className="marks-badge ise">ESE: {chosenSubject.theory ?? 0}</span>
                                <span className="marks-badge pr">TW: {chosenSubject.term_work ?? 0}</span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="alert info" style={{ marginTop: '1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
                  <CheckCircle2 size={16} color="#16a34a" /> 
                  All <strong>{selected.size} subjects</strong> for this track have been automatically added to your exam form.
                </div>
              </div>
            ) : (
              /* ── COMPONENT B: CUSTOM / MANUAL SELECTION WITH LIVE SELECTED SUBJECTS REVIEW ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* ── B.1: LIVE SELECTED SUBJECTS REVIEW PANEL ── */}
                <div className="glass-card animate-fadeInUp" style={{ border: selected.size > 0 ? '1.5px solid #bfdbfe' : '1px solid #e2e8f0', background: selected.size > 0 ? '#f0f7ff' : '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ListChecks size={18} color="#2563eb" />
                      <span style={{ fontWeight: 800, color: '#002147', fontSize: '0.95rem' }}>
                        Selected Subjects Live Review
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e40af', background: '#dbeafe', padding: '0.2rem 0.55rem', borderRadius: '4px' }}>
                        {selected.size} Subjects ({totalCredits} Credits)
                      </span>
                      {selected.size > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelected(new Set())}
                          style={{
                            background: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            borderRadius: '4px',
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Trash2 size={12} /> Clear All
                        </button>
                      )}
                    </div>
                  </div>

                  {selected.size === 0 ? (
                    <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '1.25rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                      No subjects selected yet. Search and check subjects from the catalog below to add them to your form.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                      {selectedSubjectsList.map(sub => (
                        <div
                          key={sub.subject_id}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '0.55rem 0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                            <span style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.85rem' }}>
                              {sub.subject_code}
                            </span>
                            <span style={{ fontWeight: 600, color: '#002147', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {sub.subject_name}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                            <span className="marks-badge endsem" style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem' }}>{sub.credit ?? 0} Cr</span>
                            <span className="marks-badge ise" style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem' }}>ESE: {sub.theory ?? 0}</span>
                            <button
                              type="button"
                              onClick={() => removeSubject(sub.subject_id)}
                              title="Remove Subject"
                              style={{
                                background: '#f1f5f9',
                                border: 'none',
                                color: '#ef4444',
                                borderRadius: '4px',
                                width: '22px',
                                height: '22px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 'bold'
                              }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── B.2: CATALOG / SUBJECT SELECTION WITH SEARCH & FILTERS ── */}
                <div className="glass-card animate-fadeInUp">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BookOpen size={18} /> Available Subjects Catalog
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                        Search and check any subjects to include them in your exam form.
                      </p>
                    </div>
                  </div>

                  {/* ── Search & Filter Controls ─────────────────────── */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', alignItems: 'end' }}>
                      
                      {/* Search Input */}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.35rem', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Search Subject / Course ID
                        </label>
                        <div style={{ position: 'relative' }}>
                          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                          <input
                            type="text"
                            placeholder="Search by subject name or course code (e.g. CSC301, Maths)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '0.55rem 0.8rem 0.55rem 2.3rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.88rem' }}
                          />
                        </div>
                      </div>

                      {/* Branch Filter */}
                      <div>
                        <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.35rem', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Branch
                        </label>
                        <select
                          value={branchFilter}
                          onChange={(e) => setBranchFilter(e.target.value)}
                          style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}
                        >
                          <option value="ALL">All Branches</option>
                          {availableBranches.map(br => (
                            <option key={br} value={br}>{br}</option>
                          ))}
                        </select>
                      </div>

                      {/* Semester Filter */}
                      <div>
                        <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.35rem', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Semester
                        </label>
                        <select
                          value={semesterFilter}
                          onChange={(e) => setSemesterFilter(e.target.value)}
                          style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}
                        >
                          <option value="ALL">All Semesters</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                            <option key={sem} value={String(sem)}>Semester {sem}</option>
                          ))}
                        </select>
                      </div>

                    </div>

                    {/* Filter Action Buttons Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', borderTop: '1px solid #cbd5e1', paddingTop: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Showing <strong>{filteredSubjects.length}</strong> of {subjects.length} subjects
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {filteredSubjects.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={handleSelectAllFiltered}
                            style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem', borderColor: '#002147', color: '#002147', fontWeight: 600 }}
                          >
                            Select All Filtered ({filteredSubjects.length})
                          </button>
                        )}
                        {(searchQuery || branchFilter !== 'ALL' || semesterFilter !== defaultSem) && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => { setSearchQuery(''); setBranchFilter('ALL'); setSemesterFilter(defaultSem); }}
                            style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem', color: '#64748b' }}
                          >
                            Reset Filters
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Subject Checkbox Grid ────────────────────────── */}
                  {subjects.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                      No subjects available for this examination.
                    </p>
                  ) : filteredSubjects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                      <p style={{ color: '#475569', fontWeight: 600, margin: 0 }}>No subjects match your search or filter criteria.</p>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => { setSearchQuery(''); setBranchFilter('ALL'); setSemesterFilter(defaultSem); }}
                        style={{ marginTop: '0.75rem', fontSize: '0.8rem', borderColor: '#cbd5e1', color: '#002147' }}
                      >
                        Reset Search & Filters
                      </button>
                    </div>
                  ) : (
                    <div className="subject-grid">
                      {filteredSubjects.map(sub => {
                        const isSelected = selected.has(sub.subject_id);

                        return (
                          <div
                            key={sub.subject_id}
                            id={`subject-${sub.subject_id}`}
                            className={`subject-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleSubject(sub.subject_id)}
                            role="checkbox"
                            aria-checked={isSelected}
                            tabIndex={0}
                            style={{
                              cursor: 'pointer',
                              border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                            }}
                            onKeyDown={e => e.key === ' ' && toggleSubject(sub.subject_id)}
                          >
                            <div className="subject-checkbox" style={{ background: isSelected ? '#2563eb' : 'white', borderColor: isSelected ? '#2563eb' : '#cbd5e1' }}>
                              {isSelected && <span className="subject-checkbox-tick" style={{ color: 'white' }}>✓</span>}
                            </div>
                            <div className="subject-info" style={{ flex: 1 }}>
                              <div className="subject-name" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.3rem' }}>
                                <div>
                                  <span style={{ color: '#1e40af', marginRight: '0.4rem', fontWeight: '800' }}>
                                    {sub.subject_code || 'SUB'}
                                  </span>
                                  - {sub.subject_name}
                                </div>
                              </div>
                              <div className="subject-marks" style={{ marginTop: '0.35rem' }}>
                                <span className="marks-badge endsem">Credits: {sub.credit ?? 0}</span>
                                <span className="marks-badge ise">ESE: {sub.theory ?? sub.ese ?? 0}</span>
                                <span className="marks-badge pr">TW: {sub.term_work ?? 0}</span>
                                {sub.branch && <span className="marks-badge tw" style={{ background: '#f1f5f9', color: '#002147' }}>{sub.branch}</span>}
                                {sub.semester && <span className="marks-badge tw" style={{ background: '#f8fafc', color: '#475569' }}>Sem {sub.semester}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── 4. Submit & Apply ───────────────────────────── */}
            <div className="glass-card animate-fadeInUp" style={{ animationDelay: '0.2s', marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ color: '#002147' }}><ClipboardList size={28} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
                    Ready to submit?
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    By clicking <strong>Apply</strong>, your exam application with <strong>{selected.size} subjects</strong> will be recorded and a PDF form will be generated.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Link to="/dashboard" className="btn btn-ghost">
                  Cancel
                </Link>
                <button
                  id="submit-form-btn"
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={submitting || selected.size === 0}
                  style={{ background: '#002147', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Submitting…
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Apply ({selected.size} subjects)
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
