import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap, LayoutDashboard, Users, Building2, CalendarDays,
  Search, FileText, ClipboardList, LogOut, Menu, X, ChevronRight,
  ListOrdered, CheckSquare, HelpCircle, User, Ticket, Upload
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { STAGE_NAMES } from '../../constants';
import { cn } from '../../utils';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, isAdmin } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminNav = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/students', icon: Search, label: 'All Students' },
    { to: '/admin/register', icon: GraduationCap, label: 'Register Student' },
    { to: '/admin/staff', icon: Users, label: 'Staff Management' },
    { to: '/admin/departments', icon: Building2, label: 'Departments' },
    { to: '/admin/admission-days', icon: CalendarDays, label: 'Admission Days' },
    { to: '/admin/reports', icon: FileText, label: 'Reports' },
    { to: '/admin/token-generator', icon: Ticket, label: 'Token Generator' },
    { to: '/admin/preload-students', icon: Upload, label: 'Preload Students' },
    { to: '/admin/preloaded-list', icon: Users, label: 'Preloaded List' },
    { to: '/admin/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
  ];

  const staffNav = user?.role === 'staff' ? [
    { to: '/staff/queue', icon: ListOrdered, label: `Stage ${user.stage_assigned} Queue` },
    ...(user.stage_assigned === 1 ? [{ to: '/staff/register', icon: GraduationCap, label: 'Register Student' }] : []),
    { to: '/staff/search', icon: Search, label: 'Search Students' },
  ] : [];

  const navItems = isAdmin() ? adminNav : staffNav;

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        'bg-gray-900 text-white flex flex-col transition-all duration-300 flex-shrink-0',
        sidebarOpen ? 'w-64' : 'w-16'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-700">
          <GraduationCap className="w-8 h-8 text-blue-400 flex-shrink-0" />
          {sidebarOpen && (
            <div>
              <div className="font-bold text-sm leading-tight">Admission</div>
              <div className="text-xs text-gray-400">Management System</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(to)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
              title={!sidebarOpen ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
              {sidebarOpen && isActive(to) && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          ))}

          {/* Stage indicator for staff */}
          {!isAdmin() && user?.stage_assigned && sidebarOpen && (
            <div className="mt-4 mx-3 p-3 bg-blue-900/50 rounded-lg border border-blue-700">
              <div className="text-xs text-blue-300 font-medium">Your Stage</div>
              <div className="text-sm font-semibold text-white mt-1">
                Stage {user.stage_assigned}: {STAGE_NAMES[user.stage_assigned]}
              </div>
            </div>
          )}
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-gray-700 p-3 space-y-2">
          {sidebarOpen && (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white truncate">{user?.full_name}</div>
                <div className="text-xs text-gray-400 capitalize">{user?.role}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg text-sm transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="text-lg font-semibold text-gray-800">
            {navItems.find(n => isActive(n.to))?.label || 'College Admission System'}
          </h1>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
