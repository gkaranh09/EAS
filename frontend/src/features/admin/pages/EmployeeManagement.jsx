import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getEmployeesApi, addEmployeeApi, toggleActiveApi, updateRoleApi } from '../api/adminApi';
import { Users, Search, Plus, UserPlus, Settings, Shield, Ban, CheckCircle2, UserCircle, Briefcase, Mail, Key, ArrowLeft, RefreshCw, AlertCircle, Info, Check, UserCheck, UserX, Building, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EmployeeManagement() {
  const { student } = useAuth();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [departmentsList, setDepartmentsList] = useState([]);

  // Modal State for Adding Employee
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    department: '',
    role: 'coordinator'
  });
  const [addingLoading, setAddingLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Modal State for Changing Role
  const [roleModalEmp, setRoleModalEmp] = useState(null);
  const [selectedNewRole, setSelectedNewRole] = useState('coordinator');
  const [roleLoading, setRoleLoading] = useState(false);

  // Modal State for Program Assignments
  const [programModalEmp, setProgramModalEmp] = useState(null);
  const [allProgramsList, setAllProgramsList] = useState([]);
  const [selectedProgramIds, setSelectedProgramIds] = useState([]);
  const [programSaveLoading, setProgramSaveLoading] = useState(false);

  const openProgramModal = async (emp) => {
    setProgramModalEmp(emp);
    setSelectedProgramIds((emp.allowed_programs || []).map(p => p.program_id));
    if (allProgramsList.length === 0) {
      try {
        const res = await axios.get('/api/programs');
        setAllProgramsList(res.data || []);
      } catch (err) {
        console.error('Error fetching programs list:', err);
      }
    }
  };

  const handleSavePrograms = async () => {
    if (!programModalEmp) return;
    try {
      setProgramSaveLoading(true);
      const token = localStorage.getItem('eas_token');
      const res = await axios.put(`/api/programs/employee/${programModalEmp.id}`, {
        program_ids: selectedProgramIds
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEmployees(prev => prev.map(e => {
        if (e.id === programModalEmp.id) {
          return { ...e, allowed_programs: res.data.programs || [] };
        }
        return e;
      }));
      setSuccessMsg(`Coordinate programs updated for ${programModalEmp.name}.`);
      setProgramModalEmp(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update coordinate programs.');
    } finally {
      setProgramSaveLoading(false);
    }
  };

  // Fetch all employees and departments
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      const [data, deptsRes] = await Promise.all([
        getEmployeesApi(),
        axios.get('/api/programs/departments')
      ]);
      setEmployees(data || []);
      const depts = deptsRes.data || [];
      setDepartmentsList(depts);
      if (depts.length > 0) {
        setAddForm(prev => ({
          ...prev,
          department: prev.department || depts[0].department_name
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch employee records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Handle Add Employee Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError('');

    const EMAIL_REGEX = /^\d{10}@tcetmumbai\.in$/i;
    if (!EMAIL_REGEX.test(addForm.email.trim())) {
      setAddError('Email must be a 10-digit number followed by @tcetmumbai.in (e.g. 1234567890@tcetmumbai.in)');
      return;
    }

    try {
      setAddingLoading(true);
      const data = await addEmployeeApi(addForm);
      setEmployees(prev => [...prev, data.employee]);
      setSuccessMsg('Employee created successfully.');
      setShowAddModal(false);
      setAddForm({
        name: '',
        email: '',
        department: 'Computer Engineering',
        role: 'coordinator'
      });
      await fetchEmployees();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to create employee.');
    } finally {
      setAddingLoading(false);
    }
  };

  // Handle Toggle Active Status
  const handleToggleActive = async (emp) => {
    const actionText = emp.active ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionText} ${emp.name} (${emp.employee_id})?`)) {
      return;
    }

    try {
      const data = await toggleActiveApi(emp.id, !emp.active);
      setEmployees(prev => prev.map(e => e.id === emp.id ? data.employee : e));
      setSuccessMsg(`Employee ${actionText}d successfully.`);
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${actionText} employee.`);
    }
  };

  // Handle Role Change
  const handleRoleChangeSubmit = async () => {
    if (!roleModalEmp) return;

    try {
      setRoleLoading(true);
      const data = await updateRoleApi(roleModalEmp.id, selectedNewRole);
      setEmployees(prev => prev.map(e => e.id === roleModalEmp.id ? data.employee : e));
      setSuccessMsg('Role updated successfully.');
      setRoleModalEmp(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update employee role.');
    } finally {
      setRoleLoading(false);
    }
  };

  // Filtered List
  const filteredEmployees = employees.filter(emp => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      emp.name?.toLowerCase().includes(term) ||
      emp.email?.toLowerCase().includes(term) ||
      emp.employee_id?.toLowerCase().includes(term);

    const matchesDept = !filterDept || emp.department === filterDept;
    const matchesRole = !filterRole || emp.role?.toLowerCase() === filterRole.toLowerCase();
    const matchesStatus =
      !filterStatus ||
      (filterStatus === 'active' && emp.active) ||
      (filterStatus === 'inactive' && !emp.active);

    return matchesSearch && matchesDept && matchesRole && matchesStatus;
  });

  // Calculate quick stats
  const totalCount = employees.length;
  const activeCount = employees.filter(e => e.active).length;
  const inactiveCount = employees.filter(e => !e.active).length;
  const headCount = employees.filter(e => e.role?.toLowerCase() === 'head').length;
  const adminCount = employees.filter(e => e.role?.toLowerCase() === 'admin').length;
  const coordCount = employees.filter(e => e.role?.toLowerCase() === 'coordinator').length;

  return (
    <Layout>
      <div className="admin-container" style={{ paddingBottom: '3rem' }}>
        
        {/* Back Link & Header */}
        <div style={{ margin: '1.5rem 0 1rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <button
              onClick={() => navigate('/admin/dashboard')}
              style={{ background: 'none', border: 'none', color: '#002147', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem', padding: 0, marginBottom: '0.5rem' }}
            >
              <ArrowLeft size={16} /> Back to Head Console
            </button>
            <h2 style={{ color: '#002147', fontWeight: 800, margin: 0, fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Users size={26} color="#002147" /> Employee Management Console
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              Exclusive to <strong>Exam Center Head</strong>: Add employees, configure access roles, and activate/deactivate accounts.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={fetchEmployees}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderColor: '#cbd5e1' }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setShowAddModal(true); setAddError(''); }}
              style={{ background: '#002147', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, padding: '0.5rem 1rem' }}
            >
              <UserPlus size={16} /> Add New Employee
            </button>
          </div>
        </div>

        {/* Success / Error Alerts */}
        {successMsg && (
          <div className="alert success" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={16} /> {successMsg}
            </div>
            <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}>&times;</button>
          </div>
        )}

        {error && (
          <div className="alert error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* ── Summary Stats Cards ────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Staff</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#002147', marginTop: '0.2rem' }}>{totalCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered employees</div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.72rem', color: '#16a34a', textTransform: 'uppercase', fontWeight: 700 }}>Active Accounts</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>{activeCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Authorized to log in</div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.72rem', color: '#dc2626', textTransform: 'uppercase', fontWeight: 700 }}>Inactive Accounts</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>{inactiveCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Login access blocked</div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.72rem', color: '#002147', textTransform: 'uppercase', fontWeight: 700 }}>Role Distribution</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#002147', marginTop: '0.35rem', display: 'flex', gap: '0.6rem' }}>
              <span>Head: <strong>{headCount}</strong></span>
              <span>Admin: <strong>{adminCount}</strong></span>
              <span>Coord: <strong>{coordCount}</strong></span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Role allocation breakdown</div>
          </div>

        </div>

        {/* ── Search & Filter Controls ───────────────────────────────────── */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, email, or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2rem', height: '38px', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ width: '200px' }}>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="form-select"
              style={{ height: '38px', fontSize: '0.85rem' }}
            >
              <option value="">All Departments</option>
              {departmentsList.map(dept => (
                <option key={dept.department_id} value={dept.department_name}>
                  {dept.department_name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: '150px' }}>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="form-select"
              style={{ height: '38px', fontSize: '0.85rem' }}
            >
              <option value="">All Roles</option>
              <option value="head">Head</option>
              <option value="admin">Admin</option>
              <option value="coordinator">Coordinator</option>
            </select>
          </div>

          <div style={{ width: '150px' }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="form-select"
              style={{ height: '38px', fontSize: '0.85rem' }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

        </div>

        {/* ── Employee Records Table ─────────────────────────────────────── */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '0.85rem 1.25rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#002147' }}>
              Showing {filteredEmployees.length} of {employees.length} Employees
            </span>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
            <table className="table" style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#002147', fontWeight: 800 }}>EMPLOYEE ID</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#002147', fontWeight: 800 }}>NAME & EMAIL</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#002147', fontWeight: 800 }}>DEPARTMENT</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#002147', fontWeight: 800 }}>ALLOWED COORDINATE PROGRAMS</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#002147', fontWeight: 800 }}>DESIGNATION / ROLE</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#002147', fontWeight: 800 }}>LOGIN STATUS</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#002147', fontWeight: 800, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                      <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #cbd5e1', borderTopColor: '#002147', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading employees...</p>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No employee records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      
                      {/* Employee ID */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 700, color: '#002147' }}>
                        <span style={{ background: 'rgba(0,33,71,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                          {emp.employee_id}
                        </span>
                      </td>

                      {/* Name & Email */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#002147', fontSize: '0.9rem' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Mail size={12} /> {emp.email}
                        </div>
                      </td>

                      {/* Department */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Building size={14} color="#64748b" /> {emp.department || 'Computer Engineering'}
                        </div>
                      </td>

                      {/* Allowed Coordinate Programs */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem' }}>
                        {emp.role?.toLowerCase() === 'head' || emp.role?.toLowerCase() === 'admin' ? (
                          <span style={{ color: '#0284c7', fontWeight: 700, fontSize: '0.75rem', background: '#e0f2fe', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                            All Programs (Global)
                          </span>
                        ) : emp.allowed_programs && emp.allowed_programs.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {emp.allowed_programs.map(p => (
                              <span key={p.program_id} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', color: '#334155', fontWeight: 600 }}>
                                {p.program_name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', italic: 'true', fontSize: '0.75rem' }}>None Assigned</span>
                        )}
                      </td>

                      {/* Role */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            background:
                              emp.role?.toLowerCase() === 'head' ? '#faf5ff' :
                              emp.role?.toLowerCase() === 'admin' ? '#eff6ff' : '#f8fafc',
                            color:
                              emp.role?.toLowerCase() === 'head' ? '#7e22ce' :
                              emp.role?.toLowerCase() === 'admin' ? '#1d4ed8' : '#475569',
                            border:
                              emp.role?.toLowerCase() === 'head' ? '1px solid #d8b4fe' :
                              emp.role?.toLowerCase() === 'admin' ? '1px solid #bfdbfe' : '1px solid #cbd5e1'
                          }}
                        >
                          {emp.role}
                        </span>
                      </td>

                      {/* Active Status Badge */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {emp.active ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#ecfdf5', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700 }}>
                            <CheckCircle2 size={13} /> Active
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700 }}>
                            <XCircle size={13} /> Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                          
                          {/* Manage Programs Button */}
                          <button
                            type="button"
                            onClick={() => openProgramModal(emp)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', borderColor: '#0284c7', color: '#0284c7' }}
                            title="Manage coordinate programs for coordinator"
                          >
                            Programs
                          </button>

                          {/* Role Changer Button */}
                          <button
                            type="button"
                            onClick={() => { setRoleModalEmp(emp); setSelectedNewRole(emp.role?.toLowerCase() || 'coordinator'); }}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', borderColor: '#cbd5e1' }}
                            title="Change employee role"
                          >
                            Role
                          </button>

                          {/* Activate / Deactivate Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(emp)}
                            className={`btn btn-sm ${emp.active ? 'btn-outline' : 'btn-primary'}`}
                            style={{
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: emp.active ? '#ffffff' : '#16a34a',
                              borderColor: emp.active ? '#dc2626' : '#16a34a',
                              color: emp.active ? '#dc2626' : '#ffffff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}
                          >
                            {emp.active ? (
                              <>
                                <UserX size={12} /> Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck size={12} /> Activate
                              </>
                            )}
                          </button>

                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── Modal: Add New Employee ────────────────────────────────────────── */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '8px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            
            <div style={{ background: '#002147', color: '#ffffff', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={18} /> Add New Employee
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ padding: '1.5rem' }}>
              
              {addError && (
                <div className="alert error" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {addError}
                </div>
              )}

              {/* Requirement Alert Note */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#475569' }}>
                <div style={{ fontWeight: 700, color: '#002147', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Info size={14} /> System Creation Rules:
                </div>
                <div>• Initial Default Password: <strong style={{ fontFamily: 'monospace', background: '#e2e8f0', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>pasword123</strong> (hashed).</div>
                <div>• Initial Status: <strong style={{ color: '#dc2626' }}>Inactive (active = false)</strong>. You must explicitly activate this account before the employee can log in.</div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" htmlFor="add_name">Full Name</label>
                <input
                  id="add_name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dr. Sunita Patil"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" htmlFor="add_email">10-Digit TCET Email</label>
                <input
                  id="add_email"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 9876543220@tcetmumbai.in"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Generated Employee ID: <strong>{addForm.email.includes('@') ? `E${addForm.email.split('@')[0]}` : 'E...'}</strong>
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" htmlFor="add_dept">Department</label>
                <select
                  id="add_dept"
                  className="form-select"
                  value={addForm.department}
                  onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                  required
                >
                  {departmentsList.map(dept => (
                    <option key={dept.department_id} value={dept.department_name}>
                      {dept.department_name} ({dept.department_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="add_role">Designation / Role</label>
                <select
                  id="add_role"
                  className="form-select"
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  required
                >
                  <option value="coordinator">Department Coordinator (Department Scoped)</option>
                  <option value="admin">Exam Center Admin (Institute-wide Access)</option>
                  <option value="head">Exam Center Head (Full Control & Employee Mgmt)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={addingLoading}
                  style={{ background: '#002147', fontWeight: 700 }}
                >
                  {addingLoading ? 'Creating...' : 'Create Employee (Inactive)'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ── Modal: Change Role ────────────────────────────────────────────── */}
      {roleModalEmp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '8px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            
            <div style={{ background: '#002147', color: '#ffffff', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={18} /> Update Role: {roleModalEmp.name}
              </h3>
              <button
                onClick={() => setRoleModalEmp(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 1rem 0' }}>
                Select a new authorization role for <strong>{roleModalEmp.name}</strong> ({roleModalEmp.employee_id}):
              </p>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Authorization Role</label>
                <select
                  className="form-select"
                  value={selectedNewRole}
                  onChange={(e) => setSelectedNewRole(e.target.value)}
                >
                  <option value="coordinator">Department Coordinator (Department Scoped)</option>
                  <option value="admin">Exam Center Admin (Institute-wide Access)</option>
                  <option value="head">Exam Center Head (Full Control & Employee Mgmt)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setRoleModalEmp(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleRoleChangeSubmit}
                  disabled={roleLoading}
                  style={{ background: '#002147', fontWeight: 700 }}
                >
                  {roleLoading ? 'Updating...' : 'Save Role'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
      {/* ── Modal: Manage Coordinate Programs ───────────────────────────────── */}
      {programModalEmp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '8px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            
            <div style={{ background: '#002147', color: '#ffffff', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building size={18} /> Manage Coordinate Programs: {programModalEmp.name}
              </h3>
              <button
                onClick={() => setProgramModalEmp(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 1.25rem 0' }}>
                Select which degree programs <strong>{programModalEmp.name}</strong> ({programModalEmp.employee_id}) is authorized to coordinate:
              </p>

              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', marginBottom: '1.5rem', background: '#f8fafc' }}>
                {allProgramsList.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading programs...</div>
                ) : (
                  allProgramsList.map(prog => {
                    const isChecked = selectedProgramIds.includes(prog.program_id);
                    return (
                      <label key={prog.program_id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.2rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProgramIds(prev => [...prev, prog.program_id]);
                            } else {
                              setSelectedProgramIds(prev => prev.filter(id => id !== prog.program_id));
                            }
                          }}
                          style={{ width: '16px', height: '16px', accentColor: '#002147' }}
                        />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#002147' }}>{prog.program_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dept: {prog.department_name}</div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setProgramModalEmp(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSavePrograms}
                  disabled={programSaveLoading}
                  style={{ background: '#002147', fontWeight: 700 }}
                >
                  {programSaveLoading ? 'Saving...' : 'Save Assigned Programs'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </Layout>
  );
}
