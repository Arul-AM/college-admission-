import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// Auth
import LoginPage from './pages/auth/LoginPage';

// Layout
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import RegisterStudent from './pages/admin/RegisterStudent';
import StudentsList from './pages/admin/StudentsList';
import StaffManagement from './pages/admin/StaffManagement';
import DepartmentManagement from './pages/admin/DepartmentManagement';
import AdmissionDayManagement from './pages/admin/AdmissionDayManagement';
import Reports from './pages/admin/Reports';
import AuditLogs from './pages/admin/AuditLogs';
import TokenGenerator from './pages/admin/TokenGenerator';
import PreloadStudents from './pages/admin/PreloadStudents';
import PreloadedList from './pages/admin/PreloadedList';

// Staff pages
import StaffQueue from './pages/staff/StaffQueue';
import CompleteAdmission from './pages/staff/CompleteAdmission';
import StudentDetail from './pages/staff/StudentDetail';
import StaffSearch from './pages/staff/StaffSearch';

const AppRedirect: React.FC = () => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/staff/queue" replace />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AppRedirect />} />

        {/* Admin Routes */}
        <Route path="/admin/*" element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="register" element={<RegisterStudent />} />
                <Route path="students" element={<StudentsList />} />
                <Route path="staff" element={<StaffManagement />} />
                <Route path="departments" element={<DepartmentManagement />} />
                <Route path="admission-days" element={<AdmissionDayManagement />} />
                <Route path="reports" element={<Reports />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="token-generator" element={<TokenGenerator />} />
                <Route path="preload-students" element={<PreloadStudents />} />
                <Route path="preloaded-list" element={<PreloadedList />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />

        {/* Staff Routes */}
        <Route path="/staff/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="queue" element={<StaffQueue />} />
                <Route path="register" element={<RegisterStudent />} />
                <Route path="complete/:id" element={<CompleteAdmission />} />
                <Route path="search" element={<StaffSearch />} />
                <Route path="*" element={<Navigate to="/staff/queue" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />

        {/* Shared student detail */}
        <Route path="/student/:id" element={
          <ProtectedRoute>
            <Layout>
              <StudentDetail />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
