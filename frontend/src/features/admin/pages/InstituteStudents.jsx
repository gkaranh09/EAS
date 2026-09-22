import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getInstituteStudentsApi, getInstituteDivisionsApi } from '../api/adminApi';
import { 
  GraduationCap, Search, Filter, RotateCcw, Building, Layers, 
  Copy, Check, Sparkles, AlertCircle, ArrowLeft, Landmark, 
  ChevronLeft, ChevronRight, Hash, User, Mail, Phone, BookOpen, 
  SlidersHorizontal, CheckCircle, Clock
} from 'lucide-react';

export default function InstituteStudents() {
  const navigate = useNavigate();
  const { token } = useAuth();

  // ── Lookup Data ──
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [divisions, setDivisions] = useState(['A', 'B', 'C', 'D']);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // ── Filter State ──
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('ALL');
  const [pageSize, setPageSize] = useState(50);
  const [customPageSize, setCustomPageSize] = useState('50');
  const [isCustomLimit, setIsCustomLimit] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // ── Data & Pagination State ──
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // ── Fetch Lookups on Mount ──
  useEffect(() => {
    const fetchLookups = async () => {
      setLoadingLookups(true);
      try {
        const [deptRes, progRes, divRes] = await Promise.all([
          axios.get('/api/programs/departments').catch(() => ({ data: [] })),
          axios.get('/api/programs').catch(() => ({ data: [] })),
          getInstituteDivisionsApi().catch(() => ['A', 'B', 'C', 'D'])
        ]);
        setDepartments(deptRes.data || []);
        setPrograms(progRes.data || []);
        if (divRes && divRes.length > 0) {
          setDivisions(divRes);
        }
      } catch (err) {
        console.error('Failed to load filter lookups:', err);
      } finally {
        setLoadingLookups(false);
      }
    };
    fetchLookups();
  }, []);

  // Filter programs based on selected department
  const filteredPrograms = useMemo(() => {
    if (!selectedDept || selectedDept === 'ALL') return programs;
    return programs.filter(p => String(p.department_id) === String(selectedDept));
  }, [programs, selectedDept]);

  // ── Fetch Students Function ──
  const fetchStudentsData = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const effectiveLimit = Math.max(1, parseInt(customPageSize, 10) || 50);

      const params = {
        page,
        limit: effectiveLimit,
      };

      if (selectedDept && selectedDept !== 'ALL') {
        params.department_id = selectedDept;
      }
      if (selectedProgram && selectedProgram !== 'ALL') {
        params.program_id = selectedProgram;
      }
      if (selectedDivision && selectedDivision !== 'ALL') {
        params.division = selectedDivision;
      }
      if (searchInput && searchInput.trim()) {
        params.search = searchInput.trim();
      }

      const res = await getInstituteStudentsApi(params);
      setStudents(res.students || []);
      setPagination(res.pagination || { total: 0, page: 1, limit: effectiveLimit, totalPages: 0 });
      setCurrentPage(page);
      setHasSearched(true);
    } catch (err) {
      console.error('Error loading student directory:', err);
      setError('Failed to fetch student records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedDept, selectedProgram, selectedDivision, searchInput, customPageSize]);

  // Handle Search Submission
  const handleSearch = (e) => {
    if (e) e.preventDefault();
    fetchStudentsData(1);
  };

  // Handle Page Change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== currentPage) {
      fetchStudentsData(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle Limit / Max Count Preset Change
  const handleLimitPreset = (val) => {
    setIsCustomLimit(false);
    setPageSize(val);
    setCustomPageSize(String(val));
  };

  const handleCustomLimitChange = (e) => {
    const val = e.target.value;
    setCustomPageSize(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setPageSize(num);
      setIsCustomLimit(true);
    }
  };

  // Handle Reset Filters
  const handleReset = () => {
    setSelectedDept('');
    setSelectedProgram('');
    setSelectedDivision('ALL');
    setSearchInput('');
    setPageSize(50);
    setCustomPageSize('50');
    setIsCustomLimit(false);
    setStudents([]);
    setHasSearched(false);
    setError('');
    setCurrentPage(1);
  };

  // Copy helper
  const copyToClipboard = (text, keyId) => {
    navigator.clipboard.writeText(text);
    setCopiedId(keyId);
    setTimeout(() => setCopiedId(null), 1800);
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
                <GraduationCap size={13} /> Master Directory
              </span>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>/</span>
              <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Student Roster</span>
            </div>
            <h2 style={{ color: '#002147', fontWeight: 800, margin: 0, fontSize: '1.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <GraduationCap size={28} color="#002147" /> Student Master Directory
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: '0.35rem 0 0 0' }}>
              Filter and search registered student enrollments by department, academic program, division, Student UID, and ABC ID.
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
              onClick={() => navigate('/institute/subjects')}
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
              <BookOpen size={16} /> Subjects Directory
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

        {/* ── Search & Filter Box ── */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '10px', 
          padding: '1.75rem', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: '#002147', fontWeight: 700, fontSize: '1rem' }}>
            <SlidersHorizontal size={18} /> Filter Parameters & Query Setup
          </div>

          <form onSubmit={handleSearch}>
            
            {/* ROW 1: Department, Program, Division, Max Count */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              
              {/* 1. Department */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: '0.45rem', fontSize: '0.85rem' }}>
                  Department
                </label>
                <div style={{ position: 'relative' }}>
                  <Building size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <select
                    value={selectedDept}
                    onChange={(e) => {
                      setSelectedDept(e.target.value);
                      setSelectedProgram(''); // reset program when dept changes
                    }}
                    disabled={loadingLookups}
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
                    <option value="">-- All Departments --</option>
                    {departments.map(dept => (
                      <option key={dept.department_id} value={dept.department_id}>
                        {dept.department_name} ({dept.department_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Program */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: '0.45rem', fontSize: '0.85rem' }}>
                  Program / Degree
                </label>
                <div style={{ position: 'relative' }}>
                  <Layers size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    disabled={loadingLookups}
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
                    <option value="">-- All Programs --</option>
                    {filteredPrograms.map(prog => (
                      <option key={prog.program_id} value={prog.program_id}>
                        {prog.program_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Division */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: '0.45rem', fontSize: '0.85rem' }}>
                  Division
                </label>
                <div style={{ position: 'relative' }}>
                  <Hash size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
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
                    <option value="ALL">All Divisions</option>
                    {divisions.map(div => (
                      <option key={div} value={div}>Division {div}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. Max Count / Page Size (50, 100, 200, or custom typed value) */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: '0.45rem', fontSize: '0.85rem' }}>
                  Max Count (Records Limit)
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  {[50, 100, 200].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => handleLimitPreset(cnt)}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.83rem',
                        fontWeight: 700,
                        border: '1px solid',
                        borderColor: (!isCustomLimit && pageSize === cnt) ? '#002147' : '#cbd5e1',
                        background: (!isCustomLimit && pageSize === cnt) ? '#002147' : '#f8fafc',
                        color: (!isCustomLimit && pageSize === cnt) ? '#ffffff' : '#334155',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cnt}
                    </button>
                  ))}
                  
                  {/* Custom Limit Input */}
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={customPageSize}
                    onChange={handleCustomLimitChange}
                    placeholder="Custom"
                    title="Or type custom numeric count (1 - 1000)"
                    style={{
                      width: '80px',
                      padding: '0.6rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      border: '1px solid',
                      borderColor: isCustomLimit ? '#002147' : '#cbd5e1',
                      background: isCustomLimit ? '#f0fdf4' : '#ffffff',
                      color: '#002147',
                      textAlign: 'center'
                    }}
                  />
                </div>
              </div>

            </div>

            {/* ROW 2: Search Bar at Below (Search by Student ID, ABC ID, Name, Roll No) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: '0.45rem', fontSize: '0.85rem' }}>
                Search Student ID / ABC ID / Name <span style={{ color: '#64748b', fontWeight: 400 }}>(Comma-separated multi-search supported)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Enter Student ID (e.g. 2023COMP001), 12-digit ABC ID (e.g. 123456789012), Name, Roll No..."
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem 1rem 0.75rem 2.6rem', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '7px',
                    fontSize: '0.94rem'
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleReset}
                disabled={loading}
                style={{ borderColor: '#cbd5e1', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem' }}
              >
                <RotateCcw size={15} /> Reset Filters
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
                  padding: '0.65rem 1.6rem',
                  borderRadius: '6px'
                }}
              >
                <Search size={16} /> {loading ? 'Fetching...' : 'Search Students'}
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
              <GraduationCap size={32} />
            </div>
            <h3 style={{ color: '#002147', fontWeight: 800, margin: '0 0 0.5rem', fontSize: '1.3rem' }}>
              Select Filter Parameters to Browse Students
            </h3>
            <p style={{ maxWidth: '520px', margin: '0 auto 1.75rem', fontSize: '0.92rem', color: '#64748b', lineHeight: 1.5 }}>
              Choose a department, program, or division above, or enter Student UID / ABC ID in the search bar to query student records.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSelectedDept('ALL');
                fetchStudentsData(1);
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
              <Sparkles size={16} /> View All Registered Students
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
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Loading Student Directory...</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.35rem' }}>Querying enrollments, ABC IDs, and program standings</div>
          </div>
        )}

        {/* 3. Search Results State */}
        {hasSearched && !loading && (
          <>
            {/* Status & Stats Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontWeight: 800, color: '#002147', fontSize: '1.1rem' }}>
                  Student Records
                </span>
                <span style={{ 
                  background: '#002147', 
                  color: '#ffffff', 
                  fontSize: '0.78rem', 
                  fontWeight: 700, 
                  padding: '0.15rem 0.55rem', 
                  borderRadius: '999px' 
                }}>
                  {pagination.total} Total Found
                </span>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  (Showing Page {pagination.page} of {Math.max(1, pagination.totalPages)})
                </span>
              </div>
              
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Tip: Click any Student ID or ABC ID badge to copy.
              </div>
            </div>

            {/* No Results Found */}
            {students.length === 0 ? (
              <div style={{ 
                background: '#ffffff', 
                border: '1px solid #e2e8f0', 
                borderRadius: '10px', 
                padding: '3.5rem 2rem', 
                textAlign: 'center',
                color: '#64748b'
              }}>
                <AlertCircle size={36} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
                <h4 style={{ color: '#002147', fontWeight: 700, margin: '0 0 0.4rem' }}>No Student Records Match</h4>
                <p style={{ fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.25rem', color: '#64748b' }}>
                  No students were found matching your current filter criteria or search terms. Try clearing filters.
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
              /* Students Table */
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
                        <th style={{ padding: '0.9rem 1.1rem' }}>Student ID (UID)</th>
                        <th style={{ padding: '0.9rem 1.1rem' }}>ABC ID</th>
                        <th style={{ padding: '0.9rem 1.25rem' }}>Full Name</th>
                        <th style={{ padding: '0.9rem 1.1rem' }}>Contact Info</th>
                        <th style={{ padding: '0.9rem 1rem' }}>Program & Department</th>
                        <th style={{ padding: '0.9rem 0.9rem', textAlign: 'center' }}>Sem / Year</th>
                        <th style={{ padding: '0.9rem 0.9rem', textAlign: 'center' }}>Div / Roll</th>
                        <th style={{ padding: '0.9rem 0.9rem', textAlign: 'center' }}>Admission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((stu, idx) => (
                        <tr 
                          key={stu.id || stu.student_id || idx}
                          style={{ 
                            borderBottom: '1px solid #f1f5f9', 
                            background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#fafafa'}
                        >
                          
                          {/* Student ID (UID) */}
                          <td style={{ padding: '0.9rem 1.1rem', verticalAlign: 'middle' }}>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(stu.student_id, `uid_${stu.id}`)}
                              title="Click to copy Student ID"
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
                              {stu.student_id}
                              {copiedId === `uid_${stu.id}` ? (
                                <Check size={13} color="#16a34a" />
                              ) : (
                                <Copy size={13} color="#94a3b8" />
                              )}
                            </button>
                          </td>

                          {/* ABC ID */}
                          <td style={{ padding: '0.9rem 1.1rem', verticalAlign: 'middle' }}>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(stu.abc_id, `abc_${stu.id}`)}
                              title="Click to copy 12-digit ABC ID"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                padding: '0.25rem 0.55rem',
                                borderRadius: '5px',
                                fontSize: '0.83rem',
                                fontWeight: 700,
                                color: '#166534',
                                fontFamily: 'monospace',
                                cursor: 'pointer'
                              }}
                            >
                              {stu.abc_id}
                              {copiedId === `abc_${stu.id}` ? (
                                <Check size={13} color="#16a34a" />
                              ) : (
                                <Copy size={13} color="#86efac" />
                              )}
                            </button>
                          </td>

                          {/* Full Name & Devanagari */}
                          <td style={{ padding: '0.9rem 1.25rem', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                              {stu.full_name}
                            </div>
                            {stu.full_name_devnagari && stu.full_name_devnagari !== 'नाम' && (
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                {stu.full_name_devnagari}
                              </div>
                            )}
                          </td>

                          {/* Contact Info (Email & Phone) */}
                          <td style={{ padding: '0.9rem 1.1rem', verticalAlign: 'middle' }}>
                            <div style={{ fontSize: '0.82rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Mail size={13} color="#64748b" /> {stu.email}
                            </div>
                            {stu.contact_number && (
                              <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                                <Phone size={12} color="#94a3b8" /> {stu.contact_number}
                              </div>
                            )}
                          </td>

                          {/* Program & Department */}
                          <td style={{ padding: '0.9rem 1rem', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 700, color: '#002147', fontSize: '0.85rem' }}>
                              {stu.program_name || 'Engineering Program'}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                              {stu.department_name || 'Department'}
                            </div>
                          </td>

                          {/* Sem / Year */}
                          <td style={{ padding: '0.9rem 0.9rem', verticalAlign: 'middle', textAlign: 'center' }}>
                            <span style={{ 
                              background: '#eff6ff', 
                              color: '#1d4ed8', 
                              padding: '0.2rem 0.5rem', 
                              borderRadius: '4px', 
                              fontSize: '0.78rem', 
                              fontWeight: 700 
                            }}>
                              Sem {stu.current_semester || 1}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                              Year {stu.current_year || '1'}
                            </div>
                          </td>

                          {/* Division & Roll */}
                          <td style={{ padding: '0.9rem 0.9rem', verticalAlign: 'middle', textAlign: 'center' }}>
                            <span style={{ 
                              background: '#f1f5f9', 
                              color: '#334155', 
                              padding: '0.2rem 0.5rem', 
                              borderRadius: '4px', 
                              fontSize: '0.78rem', 
                              fontWeight: 700 
                            }}>
                              Div {stu.division || 'A'}
                            </span>
                            {stu.roll_no && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                                Roll: {stu.roll_no}
                              </div>
                            )}
                          </td>

                          {/* Admission Year & Category */}
                          <td style={{ padding: '0.9rem 0.9rem', verticalAlign: 'middle', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                              {stu.admission_year || '—'}
                            </div>
                            <span style={{ 
                              fontSize: '0.7rem', 
                              textTransform: 'uppercase', 
                              color: '#64748b', 
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '3px'
                            }}>
                              {stu.category || 'OPEN'}
                            </span>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Pagination Footer ── */}
                {pagination.totalPages > 1 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '1.1rem 1.5rem', 
                    background: '#f8fafc', 
                    borderTop: '1px solid #e2e8f0',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                      Showing records <b>{((currentPage - 1) * pagination.limit) + 1}</b> to <b>{Math.min(currentPage * pagination.limit, pagination.total)}</b> of <b>{pagination.total}</b>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        style={{
                          padding: '0.45rem 0.8rem',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          background: currentPage === 1 ? '#f1f5f9' : '#ffffff',
                          color: currentPage === 1 ? '#94a3b8' : '#002147',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}
                      >
                        <ChevronLeft size={15} /> Prev
                      </button>

                      {/* Page Numbers */}
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageBtnNum = i + 1;
                        if (pagination.totalPages > 5 && currentPage > 3) {
                          pageBtnNum = currentPage - 3 + i;
                          if (pageBtnNum > pagination.totalPages) {
                            pageBtnNum = pagination.totalPages - (4 - i);
                          }
                        }
                        if (pageBtnNum <= 0 || pageBtnNum > pagination.totalPages) return null;

                        const isActive = pageBtnNum === currentPage;
                        return (
                          <button
                            key={pageBtnNum}
                            type="button"
                            onClick={() => handlePageChange(pageBtnNum)}
                            disabled={loading}
                            style={{
                              minWidth: '32px',
                              height: '32px',
                              padding: '0 0.4rem',
                              borderRadius: '5px',
                              border: '1px solid',
                              borderColor: isActive ? '#002147' : '#cbd5e1',
                              background: isActive ? '#002147' : '#ffffff',
                              color: isActive ? '#ffffff' : '#002147',
                              fontSize: '0.85rem',
                              fontWeight: isActive ? 700 : 500,
                              cursor: 'pointer'
                            }}
                          >
                            {pageBtnNum}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === pagination.totalPages || loading}
                        style={{
                          padding: '0.45rem 0.8rem',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          background: currentPage === pagination.totalPages ? '#f1f5f9' : '#ffffff',
                          color: currentPage === pagination.totalPages ? '#94a3b8' : '#002147',
                          cursor: currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}
                      >
                        Next <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </>
        )}

      </div>
    </Layout>
  );
}
