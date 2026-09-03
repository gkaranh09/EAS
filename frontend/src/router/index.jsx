import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Lazy load components
const LoginPage = React.lazy(() => import('../features/auth/pages/LoginPage.jsx'));
const Dashboard = React.lazy(() => import('../features/student/pages/Dashboard.jsx'));
const ExamFormPage = React.lazy(() => import('../features/student/pages/ExamFormPage.jsx'));
const FormSuccess = React.lazy(() => import('../features/student/pages/FormSuccess.jsx'));
const PaymentPage = React.lazy(() => import('../features/student/pages/PaymentPage.jsx'));
const AdminDashboard = React.lazy(() => import('../features/admin/pages/AdminDashboard.jsx'));
const CountAnalysis = React.lazy(() => import('../features/admin/pages/CountAnalysis.jsx'));
const CreateExam = React.lazy(() => import('../features/admin/pages/CreateExam.jsx'));
const CreateSubject = React.lazy(() => import('../features/admin/pages/CreateSubject.jsx'));
const ScheduleExam = React.lazy(() => import('../features/admin/pages/ScheduleExam.jsx'));
const ApproveForm = React.lazy(() => import('../features/admin/pages/ApproveForm.jsx'));
const AdmitCardManage = React.lazy(() => import('../features/admin/pages/AdmitCardManage.jsx'));
const EmployeeManagement = React.lazy(() => import('../features/admin/pages/EmployeeManagement.jsx'));
const SemesterTemplateManagement = React.lazy(() => import('../features/admin/pages/SemesterTemplateManagement.jsx'));
const ProfilePage = React.lazy(() => import('../features/student/pages/ProfilePage.jsx'));

// Route guards
function ProtectedRoute({ children }) {
  const { token, student } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (student && (student.is_faculty || student.is_employee)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}

function AdminProtectedRoute({ children }) {
  const { token, student } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (student && (student.is_faculty || student.is_employee)) {
    return children;
  }
  return <Navigate to="/dashboard" replace />;
}

function AdminOnlyRoute({ children }) {
  const { token, student } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  const hasGlobalAccess = student?.role && ['admin', 'head', 'administrator'].includes(student.role.toLowerCase());
  if (student && (student.is_faculty || student.is_employee) && hasGlobalAccess) {
    return children;
  }
  return <Navigate to="/admin/dashboard" replace />;
}

function HeadOnlyRoute({ children }) {
  const { token, student } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  const isHead = student?.role?.toLowerCase() === 'head';
  if (student && (student.is_faculty || student.is_employee) && isHead) {
    return children;
  }
  return <Navigate to="/admin/dashboard" replace />;
}

function PublicRoute({ children }) {
  const { token, student } = useAuth();
  if (token) {
    if (student && (student.is_faculty || student.is_employee)) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function AppRouter() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Inter, sans-serif' }}>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        
        {/* Student Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/exam/:examId/fill" element={<ProtectedRoute><ExamFormPage /></ProtectedRoute>} />
        <Route path="/form/:formId/pay" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        <Route path="/form/:formId/success" element={<ProtectedRoute><FormSuccess /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/services/count_analysis" element={<AdminProtectedRoute><CountAnalysis /></AdminProtectedRoute>} />
        <Route path="/admin/services/employee_management" element={<HeadOnlyRoute><EmployeeManagement /></HeadOnlyRoute>} />
        <Route path="/admin/services/semester_templates" element={<AdminProtectedRoute><SemesterTemplateManagement /></AdminProtectedRoute>} />
        <Route path="/admin/create/exam" element={<AdminOnlyRoute><CreateExam /></AdminOnlyRoute>} />
        <Route path="/admin/create/subject" element={<AdminProtectedRoute><CreateSubject /></AdminProtectedRoute>} />
        <Route path="/admin/create/schedule" element={<AdminOnlyRoute><ScheduleExam /></AdminOnlyRoute>} />
        <Route path="/admin/action/approve_form" element={<AdminProtectedRoute><ApproveForm /></AdminProtectedRoute>} />
        <Route path="/admin/action/admit_card" element={<AdminOnlyRoute><AdmitCardManage /></AdminOnlyRoute>} />
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
