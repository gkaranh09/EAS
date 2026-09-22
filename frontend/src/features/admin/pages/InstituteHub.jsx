import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { 
  BookOpen, Users, Layers, GraduationCap, Building, BarChart3, 
  ArrowRight, CheckCircle, Clock, ArrowLeft, Landmark, SlidersHorizontal 
} from 'lucide-react';

export default function InstituteHub() {
  const navigate = useNavigate();
  const { student } = useAuth();
  const roleLower = (student?.role || '').toLowerCase();
  const isHead = roleLower === 'head';

  const services = [
    {
      id: 'subjects',
      title: 'Institute Subjects',
      badge: 'Active Service',
      badgeColor: '#16a34a',
      badgeBg: '#dcfce7',
      icon: BookOpen,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
      description: 'Search, filter, and inspect curriculum courses, evaluations, and syllabus schemes across all departments.',
      link: '/institute/subjects',
      actionText: 'Launch Subject Directory',
      isAvailable: true,
      openNewTab: false,
    },
    {
      id: 'faculty',
      title: 'Faculty & Employee Management',
      badge: isHead ? 'Active (Head Only)' : 'Head Privileges',
      badgeColor: '#7e22ce',
      badgeBg: '#faf5ff',
      icon: Users,
      iconColor: '#7e22ce',
      iconBg: '#faf5ff',
      description: 'Manage institutional faculty accounts, coordinate program assignments, role privileges, and active statuses.',
      link: isHead ? '/admin/services/employee_management' : null,
      actionText: isHead ? 'Manage Faculty' : 'Restricted to Head',
      isAvailable: isHead,
      openNewTab: false,
    },
    {
      id: 'templates',
      title: 'Semester Templates',
      badge: 'Active Service',
      badgeColor: '#0d9488',
      badgeBg: '#f0fdfa',
      icon: Layers,
      iconColor: '#0d9488',
      iconBg: '#f0fdfa',
      description: 'Define elective groups, subject buckets, and branch-semester curriculum structures for student exam forms.',
      link: '/admin/services/semester_templates',
      actionText: 'Configure Templates',
      isAvailable: true,
      openNewTab: false,
    },
    {
      id: 'analytics',
      title: 'Count Analysis & Reports',
      badge: 'Analytics',
      badgeColor: '#d97706',
      badgeBg: '#fef3c7',
      icon: BarChart3,
      iconColor: '#d97706',
      iconBg: '#fef3c7',
      description: 'Real-time student form count analysis, subject registrations, enrollment statistics, and financial summaries.',
      link: '/admin/services/count_analysis',
      actionText: 'View Analytics',
      isAvailable: true,
      openNewTab: false,
    },
    {
      id: 'students',
      title: 'Student Master Directory',
      badge: 'Active Service',
      badgeColor: '#16a34a',
      badgeBg: '#dcfce7',
      icon: GraduationCap,
      iconColor: '#0369a1',
      iconBg: '#e0f2fe',
      description: 'Search, filter, and inspect enrolled student profiles, UID identifiers, ABC IDs, departments, programs, and divisions.',
      link: '/institute/students',
      actionText: 'Launch Student Directory',
      isAvailable: true,
      openNewTab: false,
    },
    {
      id: 'departments',
      title: 'Programs & Departments',
      badge: 'Planned Service',
      badgeColor: '#64748b',
      badgeBg: '#f1f5f9',
      icon: Building,
      iconColor: '#64748b',
      iconBg: '#f8fafc',
      description: 'Institutional degree programs, academic departments, branch codes, intake capacities, and scheme mappings.',
      link: null,
      actionText: 'Coming Soon',
      isAvailable: false,
      openNewTab: false,
    }
  ];

  return (
    <Layout>
      <div className="container" style={{ paddingBottom: '5rem', paddingTop: '2rem' }}>
        
        {/* ── Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span style={{ 
                background: '#e0e7ff', 
                color: '#3730a3', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                padding: '0.2rem 0.6rem', 
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <Landmark size={13} /> Institutional Portal
              </span>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>/</span>
              <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Institute Services</span>
            </div>
            <h2 style={{ color: '#002147', fontWeight: 800, margin: 0, fontSize: '1.95rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Landmark size={28} color="#002147" /> Institute Services Hub
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', margin: '0.35rem 0 0 0', maxWidth: '650px' }}>
              Centralized administrative portal for institute-wide master directories, curriculum subjects, faculty governance, and academic records.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/admin/dashboard')}
              style={{ borderColor: '#cbd5e1', color: '#002147', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ArrowLeft size={16} /> Back to Console
            </button>
          </div>
        </div>

        {/* ── Services Directory Grid ── */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#002147', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SlidersHorizontal size={16} /> All Institutional Services & Modules
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {services.map((svc) => {
              const IconComponent = svc.icon;
              const isClickable = svc.isAvailable && svc.link;

              const cardContent = (
                <div 
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%',
                    opacity: svc.isAvailable ? 1 : 0.72,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    cursor: isClickable ? 'pointer' : 'default'
                  }}
                  onMouseEnter={(e) => {
                    if (isClickable) {
                      e.currentTarget.style.borderColor = '#002147';
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,33,71,0.07)';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isClickable) {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div>
                    {/* Top row: Icon + Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
                      <div style={{ 
                        background: svc.iconBg, 
                        color: svc.iconColor, 
                        width: '44px', 
                        height: '44px', 
                        borderRadius: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <IconComponent size={22} />
                      </div>

                      <span style={{
                        background: svc.badgeBg,
                        color: svc.badgeColor,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}>
                        {svc.isAvailable ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {svc.badge}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h4 style={{ margin: '0 0 0.4rem 0', color: '#002147', fontWeight: 800, fontSize: '1.08rem' }}>
                      {svc.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b', lineHeight: 1.45 }}>
                      {svc.description}
                    </p>
                  </div>

                  {/* Bottom Action Footer */}
                  <div style={{ 
                    marginTop: '1.5rem', 
                    paddingTop: '0.9rem', 
                    borderTop: '1px solid #f1f5f9', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                  }}>
                    <span style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: 700, 
                      color: isClickable ? '#002147' : '#94a3b8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      {svc.actionText} {isClickable && <ArrowRight size={14} />}
                    </span>

                    {svc.id === 'subjects' && (
                      <span style={{ fontSize: '0.75rem', color: '#0369a1', background: '#e0f2fe', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                        /institute/subjects
                      </span>
                    )}

                    {svc.id === 'students' && (
                      <span style={{ fontSize: '0.75rem', color: '#0369a1', background: '#e0f2fe', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                        /institute/students
                      </span>
                    )}
                  </div>
                </div>
              );

              if (isClickable) {
                return (
                  <Link key={svc.id} to={svc.link} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {cardContent}
                  </Link>
                );
              }

              return <div key={svc.id}>{cardContent}</div>;
            })}
          </div>
        </div>

      </div>
    </Layout>
  );
}
