import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { 
  BookOpen, Search, Filter, RotateCcw, Building, Layers, 
  ExternalLink, Copy, Check, Sparkles, Plus, AlertCircle, 
  ArrowLeft, SlidersHorizontal, ChevronRight, Hash, GraduationCap
} from 'lucide-react';

export default function InstituteSubjects() {
  const navigate = useNavigate();
  const { token } = useAuth();

  // ── State ──
  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const [selectedDept, setSelectedDept] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedScheme, setSelectedScheme] = useState('ALL');

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // ── Fetch Departments on Mount ──
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoadingDepts(true);
      try {
        const res = await axios.get('/api/programs/departments');
        setDepartments(res.data || []);
      } catch (err) {
        console.error('Failed to load departments:', err);
      } finally {
        setLoadingDepts(false);
      }
    };
    fetchDepartments();
  }, []);

  // ── Fetch Subjects Function ──
  const fetchSubjects = useCallback(async (deptId = selectedDept, scheme = selectedScheme) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (deptId && deptId !== 'ALL') {
        const deptObj = departments.find(d => String(d.department_id) === String(deptId));
        if (deptObj) {
          params.branch = deptObj.department_name;
        }
      }
      if (scheme && scheme !== 'ALL') {
        params.scheme = scheme;
      }

      const res = await axios.get('/api/subjects', { params });
      setSubjects(res.data || []);
      setHasSearched(true);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setError('Failed to fetch subjects. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [departments, selectedDept, selectedScheme]);

  // Handle Search Trigger
  const handleSearch = (e) => {
    if (e) e.preventDefault();
    fetchSubjects(selectedDept, selectedScheme);
  };

  // Handle Clear / Reset
  const handleReset = () => {
    setSelectedDept('');
    setSearchInput('');
    setSelectedScheme('ALL');
    setSubjects([]);
    setHasSearched(false);
    setError('');
  };

  // ── Multi-Term Comma Search Filtering ──
  const searchTerms = useMemo(() => {
    if (!searchInput.trim()) return [];
    return searchInput
      .split(',')
      .map(term => term.trim().toLowerCase())
      .filter(Boolean);
  }, [searchInput]);

  const filteredSubjects = useMemo(() => {
    if (!hasSearched) return [];

    let result = subjects;

    // Filter by comma-separated search terms
    if (searchTerms.length > 0) {
      result = result.filter(sub => {
        const code = (sub.subject_code || '').toLowerCase();
        const name = (sub.subject_name || '').toLowerCase();
        const branch = (sub.branch || '').toLowerCase();
        const scheme = (sub.scheme_detail || '').toLowerCase();

        // Match if subject satisfies ANY of the comma-separated terms
        return searchTerms.some(term => 
          code.includes(term) || 
          name.includes(term) || 
          branch.includes(term) || 
          scheme.includes(term)
        );
      });
    }

    return result;
  }, [subjects, searchTerms, hasSearched]);

  // Unique Schemes available in current loaded list for scheme filter
  const schemeOptions = useMemo(() => {
    const defaultSchemes = ['CBCGS-HME 2023', 'CBCGS-H 2019', 'CBCGS-2016'];
    const loadedSchemes = subjects.map(s => s.scheme_detail).filter(Boolean);
    return Array.from(new Set([...defaultSchemes, ...loadedSchemes]));
  }, [subjects]);

  // Copy Subject Code
  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  return (
    <Layout>
      <div className="container" style={{ paddingBottom: '5rem', paddingTop: '2rem' }}>
        
        {/* ── Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span style={{ 
                background: '#e0f2fe', 
                color: '#0369a1', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                padding: '0.2rem 0.6rem', 
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                <GraduationCap size={13} /> Master Catalog
              </span>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>/</span>
              <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Institute Subjects</span>
            </div>
            <h2 style={{ color: '#002147', fontWeight: 800, margin: 0, fontSize: '1.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <BookOpen size={26} color="#002147" /> Institute Subjects Directory
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: '0.35rem 0 0 0' }}>
              Filter and search registered subjects across departments, courses, and syllabus schemes.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/institute')}
              style={{
                borderColor: '#cbd5e1',
                color: '#002147',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1rem',
                borderRadius: '6px'
              }}
            >
              <Landmark size={16} /> Institute Hub
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => window.open('/admin/create/subject', '_blank')}
              style={{
                borderColor: '#cbd5e1',
                color: '#002147',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1rem',
                borderRadius: '6px'
              }}
            >
              <Plus size={16} /> New Subject
            </button>
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

        {/* ── Filter Card ── */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '10px', 
          padding: '1.75rem', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: '#002147', fontWeight: 700, fontSize: '1rem' }}>
            <SlidersHorizontal size={18} /> Search & Filter Parameters
          </div>

          <form onSubmit={handleSearch}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              
              {/* Department Filter */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: '0.45rem', fontSize: '0.85rem' }}>
                  Department / Branch
                </label>
                <div style={{ position: 'relative' }}>
                  <Building size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    disabled={loadingDepts}
                    style={{ 
                      width: '100%', 
                      padding: '0.65rem 0.9rem 0.65rem 2.4rem', 
                      border: '1px solid #cbd5e1', 
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      background: '#fff',
                      color: '#0f172a'
                    }}
                  >
                    <option value="">-- Select Department --</option>
                    <option value="ALL">All Departments (Institute Wide)</option>
                    {departments.map(dept => (
                      <option key={dept.department_id} value={dept.department_id}>
                        {dept.department_name} ({dept.department_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-Search Input (Comma-separated) */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: '0.45rem', fontSize: '0.85rem' }}>
                  Subject Code or Name <span style={{ color: '#64748b', fontWeight: 400 }}>(Comma-separated)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="e.g. PCC-COMP-302, DBMS, Python, Data"
                    style={{ 
                      width: '100%', 
                      padding: '0.65rem 0.9rem 0.65rem 2.4rem', 
                      border: '1px solid #cbd5e1', 
                      borderRadius: '6px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              {/* Scheme Filter */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: '0.45rem', fontSize: '0.85rem' }}>
                  Curriculum Scheme
                </label>
                <div style={{ position: 'relative' }}>
                  <Layers size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <select
                    value={selectedScheme}
                    onChange={(e) => setSelectedScheme(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '0.65rem 0.9rem 0.65rem 2.4rem', 
                      border: '1px solid #cbd5e1', 
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      background: '#fff',
                      color: '#0f172a'
                    }}
                  >
                    <option value="ALL">All Schemes</option>
                    {schemeOptions.map(scheme => (
                      <option key={scheme} value={scheme}>{scheme}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* Active search tags helper */}
            {searchTerms.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Active Keywords:</span>
                {searchTerms.map((term, index) => (
                  <span 
                    key={index}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#002147',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Hash size={12} /> {term}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleReset}
                disabled={loading}
                style={{ borderColor: '#cbd5e1', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem' }}
              >
                <RotateCcw size={15} /> Reset
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ 
                  background: '#002147', 
                  borderColor: '#002147', 
                  color: '#fff', 
                  fontWeight: 700, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.45rem',
                  padding: '0.6rem 1.5rem',
                  borderRadius: '6px'
                }}
              >
                <Search size={16} /> {loading ? 'Searching...' : 'Show Subjects'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="alert error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* ── Content Area ── */}

        {/* 1. Initial State (Before User Searches) */}
        {!hasSearched && !loading && (
          <div style={{ 
            background: '#ffffff', 
            border: '2px dashed #cbd5e1', 
            borderRadius: '12px', 
            padding: '4rem 2rem', 
            textAlign: 'center',
            color: '#64748b'
          }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: '#f1f5f9', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 1.25rem',
              color: '#002147'
            }}>
              <BookOpen size={30} />
            </div>
            <h3 style={{ color: '#002147', fontWeight: 800, margin: '0 0 0.5rem', fontSize: '1.3rem' }}>
              Select Filter Criteria to View Subjects
            </h3>
            <p style={{ maxWidth: '520px', margin: '0 auto 1.75rem', fontSize: '0.92rem', color: '#64748b', lineHeight: 1.5 }}>
              Choose a specific department above, or enter one or more comma-separated subject codes (e.g. <code>PCC-COMP-302, DBMS</code>) to query the catalog.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSelectedDept('ALL');
                fetchSubjects('ALL', 'ALL');
              }}
              style={{ 
                background: '#002147', 
                color: '#fff', 
                fontWeight: 600, 
                padding: '0.65rem 1.4rem', 
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Sparkles size={16} /> View All Registered Subjects
            </button>
          </div>
        )}

        {/* 2. Loading State */}
        {loading && (
          <div style={{ 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '10px', 
            padding: '3.5rem 2rem', 
            textAlign: 'center',
            color: '#002147'
          }}>
            <div className="spinner" style={{ margin: '0 auto 1rem', width: '36px', height: '36px', border: '3px solid #f3f3f3', borderTop: '3px solid #002147', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Loading Subjects Directory...</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.35rem' }}>Fetching syllabus and evaluation criteria</div>
          </div>
        )}

        {/* 3. Search Results State */}
        {hasSearched && !loading && (
          <>
            {/* Results Status Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 800, color: '#002147', fontSize: '1.1rem' }}>
                  Search Results
                </span>
                <span style={{ 
                  background: '#002147', 
                  color: '#ffffff', 
                  fontSize: '0.78rem', 
                  fontWeight: 700, 
                  padding: '0.15rem 0.55rem', 
                  borderRadius: '999px' 
                }}>
                  {filteredSubjects.length} {filteredSubjects.length === 1 ? 'Subject' : 'Subjects'}
                </span>
              </div>
              
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Tip: Click any subject code to copy it to your clipboard.
              </div>
            </div>

            {/* No Results Found */}
            {filteredSubjects.length === 0 ? (
              <div style={{ 
                background: '#ffffff', 
                border: '1px solid #e2e8f0', 
                borderRadius: '10px', 
                padding: '3.5rem 2rem', 
                textAlign: 'center',
                color: '#64748b'
              }}>
                <AlertCircle size={36} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
                <h4 style={{ color: '#002147', fontWeight: 700, margin: '0 0 0.4rem' }}>No Subjects Found</h4>
                <p style={{ fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.25rem', color: '#64748b' }}>
                  No subject matches the current search criteria. Try modifying your keywords or changing the department.
                </p>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={handleReset}
                  style={{ borderColor: '#cbd5e1', color: '#002147', fontWeight: 600 }}
                >
                  Clear Filters & Try Again
                </button>
              </div>
            ) : (
              /* Subjects Table */
              <div style={{ 
                background: '#ffffff', 
                border: '1px solid #e2e8f0', 
                borderRadius: '10px', 
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '0.9rem 1.25rem' }}>Subject Code</th>
                        <th style={{ padding: '0.9rem 1.25rem' }}>Subject Name</th>
                        <th style={{ padding: '0.9rem 1rem' }}>Department / Branch</th>
                        <th style={{ padding: '0.9rem 1rem' }}>Scheme</th>
                        <th style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>Credits (TH / PR / TOT)</th>
                        <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center' }}>Marks Breakdown (ISE / IE / ESE / PR / TW)</th>
                        <th style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>Total Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubjects.map((sub, idx) => {
                        const totalMarks = (parseInt(sub.max_marks_ise || 0, 10)) +
                                           (parseInt(sub.max_marks_ie || 0, 10)) +
                                           (parseInt(sub.max_marks_endsem || 0, 10)) +
                                           (parseInt(sub.max_marks_pr || 0, 10)) +
                                           (parseInt(sub.max_marks_tw || 0, 10));

                        return (
                          <tr 
                            key={sub.subject_id || idx}
                            style={{ 
                              borderBottom: '1px solid #f1f5f9', 
                              background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#fafafa'}
                          >
                            
                            {/* Subject Code */}
                            <td style={{ padding: '0.9rem 1.25rem', verticalAlign: 'middle' }}>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(sub.subject_code)}
                                title="Click to copy subject code"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: '5px',
                                  fontSize: '0.83rem',
                                  fontWeight: 800,
                                  color: '#002147',
                                  fontFamily: 'monospace',
                                  cursor: 'pointer'
                                }}
                              >
                                {sub.subject_code}
                                {copiedCode === sub.subject_code ? (
                                  <Check size={13} color="#16a34a" />
                                ) : (
                                  <Copy size={13} color="#94a3b8" />
                                )}
                              </button>
                            </td>

                            {/* Subject Name */}
                            <td style={{ padding: '0.9rem 1.25rem', verticalAlign: 'middle' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                                {sub.subject_name}
                              </div>
                            </td>

                            {/* Department / Branch */}
                            <td style={{ padding: '0.9rem 1rem', verticalAlign: 'middle' }}>
                              <span style={{ 
                                background: '#f1f5f9', 
                                color: '#334155', 
                                padding: '0.25rem 0.6rem', 
                                borderRadius: '4px', 
                                fontSize: '0.78rem', 
                                fontWeight: 600,
                                display: 'inline-block'
                              }}>
                                {sub.branch || 'Common'}
                              </span>
                            </td>

                            {/* Scheme */}
                            <td style={{ padding: '0.9rem 1rem', verticalAlign: 'middle' }}>
                              <span style={{ 
                                background: '#ede9fe', 
                                color: '#6d28d9', 
                                padding: '0.2rem 0.55rem', 
                                borderRadius: '4px', 
                                fontSize: '0.78rem', 
                                fontWeight: 700 
                              }}>
                                {sub.scheme_detail || 'CBCGS-HME 2023'}
                              </span>
                            </td>

                            {/* Credits */}
                            <td style={{ padding: '0.9rem 1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.82rem', fontWeight: 600 }}>
                                <span title="Theory Credits" style={{ color: '#0369a1' }}>{sub.theory_credit || 0}</span>
                                <span style={{ color: '#cbd5e1' }}>/</span>
                                <span title="Practical/TW Credits" style={{ color: '#b45309' }}>{sub.orprtw_credit || 0}</span>
                                <span style={{ color: '#cbd5e1' }}>/</span>
                                <span title="Total Credits" style={{ fontWeight: 800, color: '#0f172a' }}>{sub.total_credit || (Number(sub.theory_credit || 0) + Number(sub.orprtw_credit || 0))}</span>
                              </div>
                            </td>

                            {/* Marks Breakdown */}
                            <td style={{ padding: '0.9rem 1.25rem', verticalAlign: 'middle', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', gap: '0.35rem', fontSize: '0.75rem' }}>
                                <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.15rem 0.4rem', borderRadius: '3px' }} title="In Semester Exam">
                                  ISE: <b>{sub.max_marks_ise ?? 20}</b>
                                </span>
                                <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.15rem 0.4rem', borderRadius: '3px' }} title="Internal Evaluation">
                                  IE: <b>{sub.max_marks_ie ?? 20}</b>
                                </span>
                                <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '0.15rem 0.4rem', borderRadius: '3px' }} title="End Semester Exam">
                                  ESE: <b>{sub.max_marks_endsem ?? 60}</b>
                                </span>
                                <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.15rem 0.4rem', borderRadius: '3px' }} title="Oral / Practical">
                                  PR: <b>{sub.max_marks_pr ?? 25}</b>
                                </span>
                                <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.15rem 0.4rem', borderRadius: '3px' }} title="Term Work">
                                  TW: <b>{sub.max_marks_tw ?? 25}</b>
                                </span>
                              </div>
                            </td>

                            {/* Total Marks */}
                            <td style={{ padding: '0.9rem 1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                              <span style={{ 
                                fontWeight: 800, 
                                color: '#002147', 
                                background: '#e0e7ff', 
                                padding: '0.25rem 0.6rem', 
                                borderRadius: '4px',
                                fontSize: '0.82rem'
                              }}>
                                {totalMarks}
                              </span>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </Layout>
  );
}
