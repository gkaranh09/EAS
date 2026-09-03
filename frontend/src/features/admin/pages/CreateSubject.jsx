import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { createAdminSubjectApi } from '../api/adminApi';
import { BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

export default function CreateSubject() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const [formData, setFormData] = useState({
    subject_code: '',
    subject_name: '',
    department_id: '',
    theory: 60,
    or_pr: 25,
    term_work: 25,
    credit: 4,
    scheme_detail: 'CBCGS-HME 2023'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch departments directly from database
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoadingDepts(true);
      try {
        const res = await axios.get('/api/programs/departments');
        const list = res.data || [];
        setDepartments(list);
        if (list.length > 0) {
          setFormData(prev => ({
            ...prev,
            department_id: String(list[0].department_id)
          }));
        }
      } catch (err) {
        console.error('Failed to fetch departments from DB:', err);
      } finally {
        setLoadingDepts(false);
      }
    };
    fetchDepartments();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await createAdminSubjectApi(formData);
      setSuccess(true);
      setFormData(prev => ({
        subject_code: '',
        subject_name: '',
        department_id: prev.department_id || (departments.length > 0 ? String(departments[0].department_id) : '1'),
        theory: 60,
        or_pr: 25,
        term_work: 25,
        credit: 4,
        scheme_detail: 'CBCGS-HME 2023'
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create subject.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container" style={{ paddingBottom: '4rem', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ color: '#002147', fontWeight: 800, margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={24} /> Create New Subject
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
              Register a new course in the Master Subject Catalog (can be mapped across any semester or program).
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
        {success && <div className="alert success" style={{ marginBottom: '1.5rem', background: '#d1fae5', color: '#065f46', border: '1px solid #10b981', padding: '1rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} /> Subject created successfully in master catalog!</div>}

        <form onSubmit={handleSubmit} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Subject Code</label>
              <input
                type="text"
                name="subject_code"
                value={formData.subject_code}
                onChange={handleChange}
                placeholder="e.g. PCC-COMP-302"
                required
                style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Subject Name</label>
              <input
                type="text"
                name="subject_name"
                value={formData.subject_name}
                onChange={handleChange}
                placeholder="e.g. Database Management System"
                required
                style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Offering Department</label>
              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                disabled={loadingDepts}
                style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white' }}
              >
                {loadingDepts ? (
                  <option value="">Loading departments from database...</option>
                ) : (
                  departments.map(dept => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_name} ({dept.department_code})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Scheme Detail</label>
              <input
                type="text"
                name="scheme_detail"
                value={formData.scheme_detail}
                onChange={handleChange}
                required
                placeholder="e.g. CBCGS-HME 2023"
                style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Theory Marks</label>
              <input
                type="number"
                name="theory"
                value={formData.theory}
                onChange={handleChange}
                min="0"
                required
                style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>0 = No written exam</span>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Oral / Practical</label>
              <input
                type="number"
                name="or_pr"
                value={formData.or_pr}
                onChange={handleChange}
                min="0"
                required
                style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Term Work</label>
              <input
                type="number"
                name="term_work"
                value={formData.term_work}
                onChange={handleChange}
                min="0"
                required
                style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Credits</label>
              <input
                type="number"
                name="credit"
                value={formData.credit}
                onChange={handleChange}
                min="0"
                required
                style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || loadingDepts}
            style={{ width: '100%', padding: '1rem', fontSize: '1rem', background: '#002147', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {loading ? 'Creating...' : 'Create Subject'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
