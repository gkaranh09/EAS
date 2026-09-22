import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { createAdminSubjectApi } from '../api/adminApi';
import { BookOpen, AlertCircle, CheckCircle, ExternalLink, ArrowLeft } from 'lucide-react';
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
      <div className="container" style={{ paddingBottom: '4rem', paddingTop: 'clamp(1rem, 2.5vw, 2rem)' }}>
        {/* Header with responsive wrapping */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}>
          <div style={{ flex: '1 1 280px', minWidth: 0 }}>
            <h2 style={{
              color: '#002147',
              fontWeight: 800,
              margin: 0,
              fontSize: 'clamp(1.3rem, 4vw, 1.8rem)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <BookOpen size={24} style={{ flexShrink: 0 }} /> Create New Subject
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0.3rem 0 0 0', lineHeight: 1.4 }}>
              Register a new course in the Master Subject Catalog (can be mapped across any semester or program).
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button 
              type="button"
              className="btn btn-outline"
              onClick={() => window.open('/institute/subjects', '_blank')}
              style={{
                borderColor: '#002147',
                color: '#002147',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#f8fafc',
                padding: '0.55rem 0.9rem',
                fontSize: '0.85rem'
              }}
            >
              <ExternalLink size={15} /> Show Subjects
            </button>
            <button 
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/admin/dashboard')}
              style={{
                borderColor: '#cbd5e1',
                color: '#002147',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.55rem 0.9rem',
                fontSize: '0.85rem'
              }}
            >
              <ArrowLeft size={14} /> Back to Console
            </button>
          </div>
        </div>

        {error && (
          <div className="alert error" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', wordBreak: 'break-word' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}
        {success && (
          <div className="alert success" style={{ marginBottom: '1.25rem', background: '#d1fae5', color: '#065f46', border: '1px solid #10b981', padding: '0.85rem 1rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', wordBreak: 'break-word' }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} /> Subject created successfully in master catalog!
          </div>
        )}

        {/* Responsive Form Card */}
        <form onSubmit={handleSubmit} style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: 'clamp(1rem, 3.5vw, 2.25rem)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
        }}>
          {/* Row 1: Code & Name */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: '1.25rem',
            marginBottom: '1.25rem'
          }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                Subject Code <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="subject_code"
                value={formData.subject_code}
                onChange={handleChange}
                placeholder="e.g. PCC-COMP-302"
                required
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                Subject Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="subject_name"
                value={formData.subject_name}
                onChange={handleChange}
                placeholder="e.g. Database Management System"
                required
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* Row 2: Department & Scheme */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                Offering Department <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <DepartmentSelect
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#002147', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                Scheme Detail <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="scheme_detail"
                value={formData.scheme_detail}
                onChange={handleChange}
                required
                placeholder="e.g. CBCGS-HME 2023"
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* Section: Exam Components */}
          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#002147', margin: '0 0 0.75rem 0', fontSize: '1.05rem', fontWeight: 700 }}>
              Exam Components (Max Marks)
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 110px), 1fr))',
              gap: '0.85rem'
            }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '0.3rem', fontSize: '0.8rem' }}>ISE</label>
                <input type="number" name="ise" value={formData.ise} onChange={handleChange} min="0" required style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '0.3rem', fontSize: '0.8rem' }}>IE</label>
                <input type="number" name="ie" value={formData.ie} onChange={handleChange} min="0" required style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '0.3rem', fontSize: '0.8rem' }}>Theory (ESE)</label>
                <input type="number" name="ese" value={formData.ese} onChange={handleChange} min="0" required style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '0.3rem', fontSize: '0.8rem' }}>OR-PR</label>
                <input type="number" name="or_pr" value={formData.or_pr} onChange={handleChange} min="0" required style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '0.3rem', fontSize: '0.8rem' }}>Term Work (TW)</label>
                <input type="number" name="tw" value={formData.tw} onChange={handleChange} min="0" required style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }} />
              </div>
            </div>
          </div>

          {/* Section: Credit Distribution */}
          <div style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ color: '#002147', margin: '0 0 0.75rem 0', fontSize: '1.05rem', fontWeight: 700 }}>
              Credit Distribution
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
              gap: '1rem',
              background: '#f8fafc',
              padding: 'clamp(0.85rem, 2.5vw, 1.25rem)',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '0.3rem', fontSize: '0.8rem' }}>Theory Credit</label>
                <input type="number" name="theory_credit" value={formData.theory_credit} onChange={handleChange} min="0" required style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', background: '#ffffff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '0.3rem', fontSize: '0.8rem' }}>OR-PR & TW Credit</label>
                <input type="number" name="orprtw_credit" value={formData.orprtw_credit} onChange={handleChange} min="0" required style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', background: '#ffffff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '0.3rem', fontSize: '0.8rem' }}>Total Credit</label>
                <div style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', background: '#e2e8f0', color: '#1e293b', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
                  {parseInt(formData.theory_credit || 0) + parseInt(formData.orprtw_credit || 0)} Credits
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || loadingDepts}
            style={{
              width: '100%',
              padding: '0.85rem 1.25rem',
              fontSize: '0.95rem',
              background: '#002147',
              color: 'white',
              fontWeight: 700,
              border: 'none',
              borderRadius: '6px',
              cursor: loading || loadingDepts ? 'not-allowed' : 'pointer',
              opacity: loading || loadingDepts ? 0.7 : 1,
              transition: 'background 0.2s',
              minHeight: '44px'
            }}
          >
            {loading ? 'Creating Subject...' : 'Create Subject in Master Catalog'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
