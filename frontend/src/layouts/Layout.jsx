import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { MedalIcon, GlobeIcon, DocIcon } from '../components/Logos.jsx';
import { User, ChevronDown, Menu } from 'lucide-react';
import tcetLogoImg from '../assets/images/tcetlogo.png';

export default function Layout({ children }) {
  const { student, logout, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatName = (name) => {
    if (!name) return '';
    const upper = name.toUpperCase();
    if (upper.length > 18) {
      return upper.substring(0, 16) + '...';
    }
    return upper;
  };

  const isLoginPage = location.pathname === '/login';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── TCET Header Navbar ─────────────────────────────────── */}
      <header className="tcet-header">
        <div className="tcet-header-inner" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          {/* Brand Left */}
          <Link to="/" className="tcet-brand" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <div className="tcet-brand-text">
              <span className="tcet-brand-title" style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.02em', display: 'block' }}>TCET EXAM</span>
              <span className="tcet-brand-subtitle" style={{ color: '#c58c28', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>ONLINE EXAM PROCESSING SYSTEM</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="tcet-nav-menu" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ul className="tcet-nav-links desktop-only">
              {token && student && (student.is_faculty || student.is_employee) ? (
                <>
                  <li>
                    <Link to="/admin/dashboard" className={`tcet-nav-link ${location.pathname === '/admin/dashboard' ? 'active' : ''}`}>
                      {student?.role?.toLowerCase() === 'head' ? 'Head Dashboard' : (student?.role?.toLowerCase() === 'admin' ? 'Admin Dashboard' : 'Coordinator Dashboard')}
                    </Link>
                  </li>
                  {student?.role?.toLowerCase() === 'head' && (
                    <li>
                      <Link to="/admin/services/employee_management" className={`tcet-nav-link ${location.pathname === '/admin/services/employee_management' ? 'active' : ''}`}>
                        Employees
                      </Link>
                    </li>
                  )}
                  <li className="nav-dropdown">
                    <span className="tcet-nav-link" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>Action <ChevronDown size={14} /></span>
                    <div className="nav-dropdown-content">
                      <Link to="/admin/action/approve_form" className="nav-dropdown-item">Approve Form</Link>
                      {['admin', 'head', 'administrator'].includes(student?.role?.toLowerCase()) && (
                        <Link to="/admin/action/admit_card" className="nav-dropdown-item">Admit Card</Link>
                      )}
                      {student?.role?.toLowerCase() === 'head' && (
                        <Link to="/admin/services/employee_management" className="nav-dropdown-item">Employee Management</Link>
                      )}
                    </div>
                  </li>
                  <li className="nav-dropdown">
                    <span className="tcet-nav-link" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>Analytics <ChevronDown size={14} /></span>
                    <div className="nav-dropdown-content">
                      <Link to="/admin/services/count_analysis" className="nav-dropdown-item">Count analysis</Link>
                    </div>
                  </li>
                  <li className="nav-dropdown">
                    <span className="tcet-nav-link" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>Create <ChevronDown size={14} /></span>
                    <div className="nav-dropdown-content">
                      {['admin', 'head', 'administrator'].includes(student?.role?.toLowerCase()) && (
                        <Link to="/admin/create/exam" className="nav-dropdown-item">Exam</Link>
                      )}
                      <Link to="/admin/create/subject" className="nav-dropdown-item">Subjects</Link>
                      {['admin', 'head', 'administrator'].includes(student?.role?.toLowerCase()) && (
                        <Link to="/admin/create/schedule" className="nav-dropdown-item">Schedule exam</Link>
                      )}
                    </div>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <a href="#admit-card" className="tcet-nav-link" onClick={(e) => { e.preventDefault(); alert("Admit Cards will be available for download 7 days prior to examinations."); }}>
                      Admit Card
                    </a>
                  </li>
                  <li>
                    <Link to="/dashboard" className={`tcet-nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
                      Exam Forms
                    </Link>
                  </li>
                  <li>
                    <a href="#results" className="tcet-nav-link" onClick={(e) => { e.preventDefault(); alert("Examination results will be published following evaluation completion."); }}>
                      Results
                    </a>
                  </li>
                  <li>
                    <a href="#open-house" className="tcet-nav-link" onClick={(e) => { e.preventDefault(); alert("Open House scheduling and registration will be announced soon."); }}>
                      Open House
                    </a>
                  </li>
                </>
              )}
              {!token && (
                <li>
                  <Link to="/login" className={`tcet-nav-link ${isLoginPage ? 'active' : ''}`}>
                    Login
                  </Link>
                </li>
              )}
            </ul>

            {/* User Profile / Dropdown */}
            {token && student ? (
              <div style={{ position: 'relative' }}>
                <button
                  className="tcet-profile-pill"
                  onClick={() => setShowDropdown(!showDropdown)}
                  id="user-profile-menu-btn"
                  style={{ border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <User size={14} />
                  <span>{formatName(student.full_name)}</span>
                  <ChevronDown size={10} />
                </button>

                {showDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '105%',
                      background: '#ffffff',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      boxShadow: 'var(--shadow-card)',
                      minWidth: '160px',
                      zIndex: 10,
                      padding: '0.4rem 0',
                    }}
                  >
                    <div
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        borderBottom: '1px solid var(--border)',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    >
                      {student.is_faculty || student.is_employee
                        ? `ID: ${student.employee_id || student.faculty_id}`
                        : `ID: ${student.student_id || 'Student'}`}
                    </div>
                    {!student.is_faculty && !student.is_employee && (
                      <Link
                        to="/profile"
                        id="my-profile-link"
                        onClick={() => setShowDropdown(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          width: '100%',
                          padding: '0.6rem 1rem',
                          textDecoration: 'none',
                          color: '#002147',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          borderBottom: '1px solid #f1f5f9'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      >
                        <User size={14} /> My Profile
                      </Link>
                    )}
                    <button
                      id="logout-dropdown-btn"
                      onClick={handleLogout}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '0.6rem 1rem',
                        textAlign: 'left',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--red)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#fff5f5'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {/* TCET Logo Image */}
            <img src={tcetLogoImg} alt="TCET Logo" style={{ height: '40px', width: 'auto', marginLeft: '0.5rem' }} className="desktop-only" />

            <button
              className="mobile-hamburger-btn"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Toggle Navigation Menu"
            >
              {showMobileMenu ? <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>&times;</span> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Sidebar Drawer (Full Screen) ─────────────────────────────────── */}
      {showMobileMenu && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: '#002147', zIndex: 2000,
          display: 'flex', flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
          color: 'white'
        }}>
          {/* Drawer Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.02em', color: '#ffffff' }}>TCET EXAM</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: '#c58c28' }}>ONLINE EXAM PROCESSING SYSTEM</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <img src={tcetLogoImg} alt="TCET Logo" style={{ height: '36px', width: 'auto' }} />
              <button onClick={() => setShowMobileMenu(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer', lineHeight: 1, padding: '0 0.5rem' }}>&times;</button>
            </div>
          </div>

          {/* Drawer Links */}
          <div style={{ flex: 1, padding: '2.5rem 3rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
            {token && student && (student.is_faculty || student.is_employee) ? (
              <>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#88a0b9', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem', fontWeight: 700 }}>Main</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingLeft: '0.2rem' }}>
                    <Link to="/admin/dashboard" style={{ color: '#f59e0b', textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowMobileMenu(false)}>
                      <span style={{ width: '4px', height: '1.1rem', background: '#f59e0b', display: 'inline-block' }}></span>
                      {student?.role?.toLowerCase() === 'head' ? 'HEAD CONSOLE' : (student?.role?.toLowerCase() === 'admin' ? 'ADMIN CONSOLE' : 'COORDINATOR CONSOLE')}
                    </Link>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: '#88a0b9', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem', fontWeight: 700 }}>Action</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingLeft: '0.8rem' }}>
                    <Link to="/admin/action/approve_form" style={{ color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.05em' }} onClick={() => setShowMobileMenu(false)}>APPROVE FORM</Link>
                    {['admin', 'head', 'administrator'].includes(student?.role?.toLowerCase()) && (
                      <Link to="/admin/action/admit_card" style={{ color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.05em' }} onClick={() => setShowMobileMenu(false)}>ADMIT CARD</Link>
                    )}
                    {student?.role?.toLowerCase() === 'head' && (
                      <Link to="/admin/services/employee_management" style={{ color: '#f59e0b', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.05em' }} onClick={() => setShowMobileMenu(false)}>EMPLOYEE MANAGEMENT</Link>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: '#88a0b9', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem', fontWeight: 700 }}>Analytics</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingLeft: '0.8rem' }}>
                    <Link to="/admin/services/count_analysis" style={{ color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.05em' }} onClick={() => setShowMobileMenu(false)}>COUNT ANALYSIS</Link>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: '#88a0b9', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem', fontWeight: 700 }}>Create</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingLeft: '0.8rem' }}>
                    {['admin', 'head', 'administrator'].includes(student?.role?.toLowerCase()) && (
                      <Link to="/admin/create/exam" style={{ color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.05em' }} onClick={() => setShowMobileMenu(false)}>EXAM</Link>
                    )}
                    <Link to="/admin/create/subject" style={{ color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.05em' }} onClick={() => setShowMobileMenu(false)}>SUBJECTS</Link>
                    {['admin', 'head', 'administrator'].includes(student?.role?.toLowerCase()) && (
                      <Link to="/admin/create/schedule" style={{ color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.05em' }} onClick={() => setShowMobileMenu(false)}>SCHEDULE EXAM</Link>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#88a0b9', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem', fontWeight: 700 }}>Main</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingLeft: '0.2rem' }}>
                    <Link to="/dashboard" style={{ color: '#f59e0b', textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowMobileMenu(false)}>
                      <span style={{ width: '4px', height: '1.1rem', background: '#f59e0b', display: 'inline-block' }}></span>
                      EXAM FORMS
                    </Link>
                    <a href="#admit-card" style={{ color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.05em', paddingLeft: '0.6rem' }} onClick={(e) => { e.preventDefault(); alert("Admit Cards will be available for download 7 days prior to examinations."); }}>ADMIT CARD</a>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: '#88a0b9', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem', fontWeight: 700 }}>Results & Updates</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingLeft: '0.8rem' }}>
                    <a href="#results" style={{ color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.05em' }} onClick={(e) => { e.preventDefault(); alert("Examination results will be published following evaluation completion."); }}>RESULTS</a>
                    <a href="#open-house" style={{ color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.05em' }} onClick={(e) => { e.preventDefault(); alert("Open House scheduling and registration will be announced soon."); }}>OPEN HOUSE</a>
                  </div>
                </div>
              </>
            )}

            <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
              {!token ? (
                <Link to="/login" style={{ display: 'block', background: '#f59e0b', color: '#002147', textAlign: 'center', padding: '1rem', fontWeight: 800, textDecoration: 'none', fontSize: '1.1rem' }} onClick={() => setShowMobileMenu(false)}>LOGIN</Link>
              ) : (
                <button onClick={() => { handleLogout(); setShowMobileMenu(false); }} style={{ width: '100%', display: 'block', background: '#f59e0b', border: 'none', color: '#002147', textAlign: 'center', padding: '1rem', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>SIGN OUT</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────────── */}
      <main style={{ flex: 1 }}>
        {children}
      </main>

      {/* ── Institutional Footer ───────────────────────────────── */}
      <footer className="tcet-footer">
        <div className="container">
          <div className="tcet-footer-grid">

            {/* Column 1: Info & Socials */}
            <div className="tcet-footer-column">
              <h4 className="tcet-footer-title blue">TCET CENTRE OF EXCELLENCE</h4>
              <p className="tcet-footer-text">
                Thakur Village, Kandivali (E), Mumbai - 400101.<br />
                Maharashtra, India.<br />
                <strong>Email:</strong> <a href="mailto:tcet.eas@tcetmumbai.in" style={{ color: '#1a5fb4', textDecoration: 'none' }}>tcet.eas@tcetmumbai.in</a>
              </p>
              <div className="tcet-footer-socials">
                <a href="#credits" className="tcet-footer-social-icon" title="Credits" onClick={e => e.preventDefault()}>
                  <MedalIcon size={20} />
                </a>
                <a href="#website" className="tcet-footer-social-icon" title="Website" onClick={e => e.preventDefault()}>
                  <GlobeIcon size={20} />
                </a>
                <a href="#documents" className="tcet-footer-social-icon" title="Documents" onClick={e => e.preventDefault()}>
                  <DocIcon size={20} />
                </a>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="tcet-footer-column">
              <h4 className="tcet-footer-title gold">INSTITUTIONAL QUICK LINKS</h4>
              <ul className="tcet-footer-links">
                <li>
                  <a href="#naac" className="tcet-footer-link" onClick={e => e.preventDefault()}>
                    Institute Address & NAAC
                  </a>
                </li>
                <li>
                  <a href="#mu" className="tcet-footer-link" onClick={e => e.preventDefault()}>
                    Mumbai University
                  </a>
                </li>
                <li>
                  <a href="#links" className="tcet-footer-link" onClick={e => e.preventDefault()}>
                    Quick Links
                  </a>
                </li>
                <li>
                  <a href="#privacy" className="tcet-footer-link" onClick={e => e.preventDefault()}>
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#contact" className="tcet-footer-link" onClick={e => e.preventDefault()}>
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Accreditations */}
            <div className="tcet-footer-column">
              <h4 className="tcet-footer-title gold">ACCREDITATION</h4>
              <div className="tcet-accreditation-boxes">
                <div className="tcet-accreditation-box">NAAC A</div>
                <div className="tcet-accreditation-box">NBA</div>
                <div className="tcet-accreditation-box">ISO</div>
              </div>
            </div>

          </div>
        </div>

        {/* Navy Bottom Bar */}
        <div className="tcet-footer-bottom">
          <div className="container tcet-footer-bottom-inner">
            <span>
              © {new Date().getFullYear()} TCET EXAM PROCESSING SYSTEM. ALL RIGHTS RESERVED DESIGNED FOR ACADEMIC INTEGRITY.
            </span>
            <ul className="tcet-footer-bottom-links">
              <li>
                <a href="#accessibility" className="tcet-footer-bottom-link" onClick={e => e.preventDefault()}>
                  Accessibility
                </a>
              </li>
              <li>
                <a href="#archives" className="tcet-footer-bottom-link" onClick={e => e.preventDefault()}>
                  Legal Archives
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>

    </div>
  );
}
