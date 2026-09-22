import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getAdminStatsApi, getAdminFormsApi, getAdminFormSubjectsApi } from '../api/adminApi';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, LogOut, AlertCircle, Inbox, Eye, FileText, BookOpen, CheckCircle, BarChart3, Calendar, Clock, Users, Layers, AlertTriangle, Landmark } from 'lucide-react';

export default function AdminDashboard() {
  const { student, logout } = useAuth();
  const roleLower = student?.role?.toLowerCase() || '';
  const isGlobalUser = ['admin', 'head', 'administrator'].includes(roleLower);
  const isAdmin = isGlobalUser;
  const [stats, setStats] = useState({ totalForms: 0, pendingPayment: 0, completedPayment: 0, totalRevenue: 0 });
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Drawer & Service State
  const navigate = useNavigate();
  
  // Detailed Modal State
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Fetch Stats and Applications list
  const fetchData = async () => {
    try {
      setLoading(true);
      const statsData = await getAdminStatsApi();
      setStats(statsData);

      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.payment_status = statusFilter;

      const formsData = await getAdminFormsApi(params);
      setForms(formsData);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load faculty console data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter]);

  // Load detailed subjects for modal
  const handleViewSubjects = async (formId) => {
    setSelectedFormId(formId);
    setLoadingSubjects(true);
    try {
      const data = await getAdminFormSubjectsApi(formId);
      setSelectedSubjects(data);
    } catch (err) {
      alert('Failed to load subjects details.');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const closeSubjectsModal = () => {
    setSelectedFormId(null);
    setSelectedSubjects([]);
  };

  const getConsoleTitle = () => {
    if (roleLower === 'head') return 'EXAM CENTER HEAD CONSOLE';
    if (roleLower === 'admin') return 'EXAM CENTER ADMIN CONSOLE';
    return `${(student?.department || 'DEPARTMENT').toUpperCase()} COORDINATOR CONSOLE`;
  };

  return (
    <Layout>
      <div className="container" style={{ paddingBottom: '3rem' }}>
        
        {/* Header Console Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0 1.5rem 0', borderBottom: '2.5px solid #002147', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ color: '#002147', fontWeight: 800, margin: 0, fontSize: '1.5rem', letterSpacing: '0.01em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={22} /> {getConsoleTitle()}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.2rem 0 0 0' }}>
              Welcome back, <strong>{student?.name || 'Employee'}</strong> ({student?.role}) • Employee ID: <strong>{student?.employee_id || student?.faculty_id}</strong> • Department: <strong>{student?.department || 'Computer Engineering'}</strong>
            </p>
          </div>
          <button 
            className="btn btn-outline btn-sm" 
            onClick={logout}
            style={{ borderColor: '#e2e8f0', color: '#002147', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        {error && (
          <div className="alert error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={16} /> {error}</div>
        )}

        {/* ── Admin Dashboard Statistics (Applications Console) ─────────────────── */}
        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Total Applications</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#002147', marginTop: '0.25rem' }}>{stats.totalForms}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Filled by students</div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.75rem', color: '#b45309', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Pending Checkout</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', marginTop: '0.25rem' }}>{stats.pendingPayment}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Unpaid application forms</div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Verified Payments</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>{stats.completedPayment}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Completed registrations</div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.75rem', color: '#002147', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Total Revenue</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#002147', marginTop: '0.25rem' }}>₹{stats.totalRevenue}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>INR collected via gateway</div>
          </div>

        </div>

        {/* ── Role-Aware Allowed Services Panel ────────────────────────────────── */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#002147', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            {isAdmin ? 'ALL AVAILABLE INSTITUTIONAL SERVICES' : 'AVAILABLE SERVICES FOR AUTHORIZED COORDINATE PROGRAMS'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            
            {/* Institute Services Hub */}
            <Link 
              to="/institute" 
              style={{ textDecoration: 'none', background: '#ffffff', border: '1.5px solid #bfdbfe', borderRadius: '8px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,33,71,0.04)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#002147'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ background: '#eff6ff', color: '#002147', padding: '0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Landmark size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#002147', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  Institute Hub <span style={{ fontSize: '0.65rem', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: 800 }}>PORTAL</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Master subjects & institute services</div>
              </div>
            </Link>
            
            {/* Head Exclusive: Employee Management */}
            {roleLower === 'head' && (
              <Link 
                to="/admin/services/employee_management" 
                style={{ textDecoration: 'none', background: '#ffffff', border: '1.5px solid #d8b4fe', borderRadius: '8px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(126,34,206,0.05)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7e22ce'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d8b4fe'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ background: '#faf5ff', color: '#7e22ce', padding: '0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#002147', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    Employee Mgmt <span style={{ fontSize: '0.65rem', background: '#faf5ff', color: '#7e22ce', border: '1px solid #d8b4fe', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: 800 }}>HEAD</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Staff, roles & activations</div>
                </div>
              </Link>
            )}

            {/* 1. Approve Form (Allowed for both) */}
            <Link 
              to="/admin/action/approve_form" 
              style={{ textDecoration: 'none', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#002147'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ background: '#ecfdf5', color: '#16a34a', padding: '0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#002147', fontSize: '0.92rem' }}>Approve Forms</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Review & verify exam applications</div>
              </div>
            </Link>

            {/* 2. Manage Subjects (Allowed for both, department-scoped for coordinator) */}
            <Link 
              to="/admin/create/subject" 
              style={{ textDecoration: 'none', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#002147'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ background: '#eff6ff', color: '#2563eb', padding: '0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#002147', fontSize: '0.92rem' }}>Manage Subjects</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Curriculum & marks setup</div>
              </div>
            </Link>

            {/* 3. Count Analysis (Allowed for both) */}
            <Link 
              to="/admin/services/count_analysis" 
              style={{ textDecoration: 'none', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#002147'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ background: '#fef3c7', color: '#d97706', padding: '0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#002147', fontSize: '0.92rem' }}>Count Analysis</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Student subject enrollment</div>
              </div>
            </Link>

            {/* 4. Semester Templates (Allowed for all employees) */}
            <Link 
              to="/admin/services/semester_templates" 
              style={{ textDecoration: 'none', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#002147'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ background: '#f0fdfa', color: '#0d9488', padding: '0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#002147', fontSize: '0.92rem' }}>Semester Templates</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pre-built subject structures</div>
              </div>
            </Link>

            {/* 5. Student Hold List (Allowed for all employees, read-only for coordinators) */}
            <Link 
              to="/admin/services/hold_list" 
              style={{ textDecoration: 'none', background: '#ffffff', border: '1.5px solid #fecaca', borderRadius: '8px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(220,38,38,0.05)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#002147', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  Student Hold List {isAdmin && <span style={{ fontSize: '0.65rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: 800 }}>MANAGE</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Restricted students & holds</div>
              </div>
            </Link>

            {/* Admin-Only Services (Completely hidden from Department Exam Coordinator) */}
            {isAdmin && (
              <>
                <Link 
                  to="/admin/create/exam" 
                  style={{ textDecoration: 'none', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#002147'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ background: '#faf5ff', color: '#9333ea', padding: '0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#002147', fontSize: '0.92rem' }}>Create Exam</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Institute-wide examination</div>
                  </div>
                </Link>

                <Link 
                  to="/admin/create/schedule" 
                  style={{ textDecoration: 'none', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#002147'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ background: '#fdf2f8', color: '#db2777', padding: '0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#002147', fontSize: '0.92rem' }}>Schedule Exam</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Timetable & time slots</div>
                  </div>
                </Link>

                <Link 
                  to="/admin/action/admit_card" 
                  style={{ textDecoration: 'none', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#002147'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ background: '#fff7ed', color: '#ea580c', padding: '0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#002147', fontSize: '0.92rem' }}>Manage Admit Cards</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Admit card releases</div>
                  </div>
                </Link>

                {/* Failed Records — Head/Admin only */}
                <Link 
                  to="/admin/services/failed_records"
                  style={{ textDecoration: 'none', background: '#ffffff', border: '1.5px solid #fca5a5', borderRadius: '8px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(220,38,38,0.05)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#002147', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      Failed Records <span style={{ fontSize: '0.65rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: 800 }}>ADMIN</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ATKT / Supp eligibility</div>
                  </div>
                </Link>
              </>
            )}

          </div>
        </div>

        {/* Live Filter Controls */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          <div style={{ flex: 1, minWidth: '260px' }}>
            <input
              type="text"
              placeholder="Search student name, email, or Student ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ width: '180px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem' }}
            >
              <option value="">All Payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <button 
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => { setSearch(''); setStatusFilter(''); }}
            style={{ height: '38px', borderRadius: '4px' }}
          >
            Clear Filters
          </button>

        </div>

            {/* Applications table */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#002147', fontWeight: 'bold' }}>
                    <th style={{ padding: '1rem' }}>Application No</th>
                    <th style={{ padding: '1rem' }}>Student Details</th>
                    <th style={{ padding: '1rem' }}>Division</th>
                    <th style={{ padding: '1rem' }}>Applied Exam</th>
                    <th style={{ padding: '1rem' }}>Status</th>
                    <th style={{ padding: '1rem' }}>Approved</th>
                    <th style={{ padding: '1rem' }}>Amount Paid</th>
                    <th style={{ padding: '1rem' }}>Payment Reference</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && forms.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #cbd5e1', borderTopColor: '#002147', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <p style={{ margin: '0.5rem 0 0 0' }}>Fetching application records...</p>
                      </td>
                    </tr>
                  ) : forms.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}><Inbox size={32} /></div>
                        <p style={{ margin: 0 }}>No matching exam application forms found.</p>
                      </td>
                    </tr>
                  ) : (
                    forms.map(form => (
                      <tr key={form.form_id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                        <td style={{ padding: '1rem', fontWeight: 800, color: '#002147', fontFamily: 'monospace', fontSize: '0.86rem' }}>
                          <span style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                            {form.form_code || `ef${String(form.form_id).padStart(6, '0')}`}
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
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '12px', 
                            fontWeight: 'bold',
                            fontSize: '0.7rem',
                            textTransform: 'uppercase'
                          }}>
                            {form.is_approved ? 'Approved' : 'Not Approved'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>
                          ₹{form.amount_paid || 0}
                        </td>
                        <td style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {form.payment_id || 'N/A'}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => handleViewSubjects(form.form_id)}
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <Eye size={12} /> Subjects
                            </button>
                            
                            {form.payment_status === 'paid' ? (
                              <a
                                href={`/api/form/pdf/${form.form_id}`}
                                className="btn btn-success btn-sm"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ textDecoration: 'none', padding: '0.3rem 0.6rem', fontSize: '0.78rem', borderRadius: '4px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                              >
                                <FileText size={12} /> PDF
                              </a>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', borderRadius: '4px', opacity: 0.5, cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                              >
                                <FileText size={12} /> PDF
                              </button>
                            )}

                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

      </div>

      {/* Selected Subjects Overlay Modal */}
      {selectedFormId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '8px', maxWidth: '600px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            
            <div style={{ background: '#002147', color: '#ffffff', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={18} /> Selected Subjects (Form #{selectedFormId})
              </h3>
              <button 
                onClick={closeSubjectsModal} 
                style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '1.5rem', maxHeight: '400px', overflowY: 'auto' }}>
              {loadingSubjects ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #cbd5e1', borderTopColor: '#002147', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Loading subjects...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedSubjects.map(sub => (
                    <div key={sub.subject_code} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem' }}>
                      <div style={{ fontWeight: 'bold', color: '#002147', fontSize: '0.9rem' }}>
                        {sub.subject_code} – {sub.subject_name}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <span>Semester: <strong>{sub.semester}</strong></span>
                        <span>Branch: <strong>{sub.branch}</strong></span>
                        <span>Credits: <strong>{sub.credit}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.15rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <span>ESE: <strong>{sub.max_marks_endsem} Marks</strong></span>
                        <span>TW: <strong>{sub.max_marks_tw || 0} Marks</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={closeSubjectsModal}
                style={{ borderRadius: '4px' }}
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

    </Layout>
  );
}
