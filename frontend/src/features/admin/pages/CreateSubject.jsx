import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { createAdminSubjectApi } from '../api/adminApi';
import { BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { DepartmentSelect } from '../../../components/common/LookupSelect';

export default function CreateSubject() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const [formData, setFormData] = useState({
    subject_code: '',
    subject_name: '',
    department_id: '',
    ise: 20,
    ie: 20,
    ese: 60,
    or_pr: 25,
    tw: 25,
    theory_credit: 3,
    orprtw_credit: 1,
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
      const computedTotalCredit = parseInt(formData.theory_credit || 0) + parseInt(formData.orprtw_credit || 0);
      await createAdminSubjectApi({ ...formData, total_credit: computedTotalCredit });
      setSuccess(true);
      setFormData(prev => ({
        subject_code: '',
        subject_name: '',
        department_id: prev.department_id || (departments.length > 0 ? String(departments[0].department_id) : '1'),
        ise: 20,
        ie: 20,
        ese: 60,
        or_pr: 25,
        tw: 25,
        theory_credit: 3,
        orprtw_credit: 1,
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
              <DepartmentSelect
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
              />
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

          <h3 style={{ color: '#002147', marginTop: '1rem', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 'bold' }}>Exam Components (Max Marks)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>ISE</label>
              <input type="number" name="ise" value={formData.ise} onChange={handleChange} min="0" required style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>IE</label>
              <input type="number" name="ie" value={formData.ie} onChange={handleChange} min="0" required style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Theory (ESE)</label>
              <input type="number" name="ese" value={formData.ese} onChange={handleChange} min="0" required style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>OR-PR</label>
              <input type="number" name="or_pr" value={formData.or_pr} onChange={handleChange} min="0" required style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Term Work (TW)</label>
              <input type="number" name="tw" value={formData.tw} onChange={handleChange} min="0" required style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
          </div>

          <h3 style={{ color: '#002147', marginTop: '1rem', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 'bold' }}>Credit Distribution</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Theory Credit</label>
              <input type="number" name="theory_credit" value={formData.theory_credit} onChange={handleChange} min="0" required style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>OR-PR & TW Credit</label>
              <input type="number" name="orprtw_credit" value={formData.orprtw_credit} onChange={handleChange} min="0" required style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Total Credit</label>
              <div style={{ width: '100%', padding: '0.7rem 0.9rem', background: '#e2e8f0', color: '#334155', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                {parseInt(formData.theory_credit || 0) + parseInt(formData.orprtw_credit || 0)}
              </div>
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
