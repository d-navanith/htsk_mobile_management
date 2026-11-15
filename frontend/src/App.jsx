import React, { useState, useEffect, useMemo } from 'react';
import { api, getStoredUser } from './api';
import { Sidebar, TopHeader } from './components/Navbar';
import LoginModal, { detectPortalFromLocation, PORTAL_CONFIGS } from './components/LoginModal';
import DashboardView from './components/DashboardView';
import CheckingSessionView from './components/CheckingSessionView';
import DevicesView from './components/DevicesView';
import ReturnReplacementView from './components/ReturnReplacementView';
import GroupsView from './components/GroupsView';
import IncidentsView from './components/IncidentsView';
import NotificationsView from './components/NotificationsView';
import HistoryView from './components/HistoryView';
import ReportsView from './components/ReportsView';
import ReconciliationView from './components/ReconciliationView';
import AuditLogsView from './components/AuditLogsView';
import UsersView from './components/UsersView';
import PermissionsView from './components/PermissionsView';
import SettingsView from './components/SettingsView';

class WorkspaceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Workspace render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Workspace View Reload Needed
            </h2>
            <p className="text-xs text-slate-500">
              {this.state.error?.message || 'An unexpected UI error occurred.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-4 py-2 bg-[#1e4e8c] text-white rounded-lg text-xs font-semibold"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Reset Session
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const u = getStoredUser();
      if (!u || !u.role) return null;
      const urlPortal = detectPortalFromLocation();
      // Enforce strict URL-to-role isolation: if opening a different role's URL, require sign-in for that role
      if (urlPortal && u.role !== urlPortal) {
        api.logout();
        return null;
      }
      return u;
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [permissionsList, setPermissionsList] = useState([]);
  const [lastRolePortal, setLastRolePortal] = useState(() => detectPortalFromLocation());
  const [globalSearch, setGlobalSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [initialReturnDevice, setInitialReturnDevice] = useState(null);

  const fetchDashboard = async () => {
    if (!user) return;
    try {
      const data = await api.getDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const fetchPermissions = async () => {
    if (!user) return;
    try {
      const perms = await api.getPermissions();
      if (Array.isArray(perms)) {
        setPermissionsList(perms);
      }
    } catch (err) {
      console.error('Failed to load permissions:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboard();
      fetchPermissions();
    }
  }, [user]);

  // Compute map of functionKey -> boolean for the current user's role
  const userPermissions = useMemo(() => {
    if (!user || !Array.isArray(permissionsList) || permissionsList.length === 0) {
      return null;
    }
    const role = user.role;
    const map = {};
    permissionsList.forEach((row) => {
      if (!row || !row.functionKey) return;
      if (role === 'Developer') map[row.functionKey] = Boolean(row.developer);
      else if (role === 'ITAdmin') map[row.functionKey] = Boolean(row.itAdmin);
      else map[row.functionKey] = Boolean(row.employee);
    });
    return map;
  }, [user, permissionsList]);

  // Compute full map of functionKey -> PermissionRowDto (including employeeCanEdit, employeeCanDo, employeeCannotDo)
  const permissionDetails = useMemo(() => {
    const map = {};
    if (Array.isArray(permissionsList)) {
      permissionsList.forEach((row) => {
        if (row && row.functionKey) {
          map[row.functionKey] = row;
        }
      });
    }
    return map;
  }, [permissionsList]);

  // Handle automatic logout on token expiry
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setDashboardData(null);
      setPermissionsList([]);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const handleLogin = async (username, password, expectedRole) => {
    const data = await api.login(username, password, expectedRole);
    setLastRolePortal(data.role);
    setUser(data);
    setActiveTab('dashboard');
    const portalCfg = PORTAL_CONFIGS[data.role] || PORTAL_CONFIGS.Employee;
    try {
      window.history.replaceState(null, '', portalCfg.path);
    } catch {
      window.location.hash = portalCfg.hash;
    }
  };

  const handleLogout = () => {
    const previousRole = user?.role || lastRolePortal || detectPortalFromLocation();
    api.logout();
    setUser(null);
    setDashboardData(null);
    setPermissionsList([]);
    setActiveTab('dashboard');
    setLastRolePortal(previousRole);

    const portalCfg = PORTAL_CONFIGS[previousRole] || PORTAL_CONFIGS.Employee;
    try {
      window.history.replaceState(null, '', portalCfg.path);
    } catch {
      window.location.hash = portalCfg.hash;
    }
  };

  const handleStartSessionFromDashboard = async () => {
    try {
      await api.startSession('Started from Dashboard');
      await fetchDashboard();
      setActiveTab('checking');
    } catch (err) {
      alert(err.message || 'Failed to start session');
    }
  };

  if (!user) {
    return (
      <WorkspaceErrorBoundary>
        <LoginModal onLogin={handleLogin} initialPortal={lastRolePortal} />
      </WorkspaceErrorBoundary>
    );
  }

  return (
    <WorkspaceErrorBoundary>
      <div className="min-h-screen bg-[#f4f9f2] flex font-sans text-slate-900">
        {/* Left Sidebar + Mobile Drawer + Mobile Bottom Bar */}
        <Sidebar
          user={user}
          userPermissions={userPermissions}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          dashboardData={dashboardData}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* Right Workspace Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Workspace Header */}
          <TopHeader
            user={user}
            userPermissions={userPermissions}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            dashboardData={dashboardData}
            onLogout={handleLogout}
            globalSearch={globalSearch}
            setGlobalSearch={setGlobalSearch}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          {/* Main Content Area */}
          <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-20 lg:pb-8">
            {activeTab === 'dashboard' && (
              <DashboardView
                dashboard={dashboardData}
                user={user}
                userPermissions={userPermissions}
                onNavigateToChecking={() => setActiveTab('checking')}
                onNavigateToIncidents={() => setActiveTab('incidents')}
                onNavigateToGroups={() => setActiveTab('groups')}
                onNavigateToReports={() => setActiveTab('reports')}
                onNavigateToHistory={() => setActiveTab('history')}
                onNavigateToDevices={() => setActiveTab('devices')}
                onNavigateToReturns={(dev = null) => {
                  setInitialReturnDevice(dev);
                  setActiveTab('returns');
                }}
                onStartSession={handleStartSessionFromDashboard}
                onDataChange={fetchDashboard}
              />
            )}

            {activeTab === 'returns' && (
              <ReturnReplacementView
                user={user}
                userPermissions={userPermissions}
                permissionDetails={permissionDetails}
                onDataChange={fetchDashboard}
                initialDevice={initialReturnDevice}
                onClearInitialDevice={() => setInitialReturnDevice(null)}
              />
            )}

            {activeTab === 'checking' && (
              <CheckingSessionView
                user={user}
                userPermissions={userPermissions}
                permissionDetails={permissionDetails}
                onSessionChange={fetchDashboard}
                onSaveAndExit={() => setActiveTab('dashboard')}
              />
            )}

            {activeTab === 'devices' && (
              <DevicesView
                user={user}
                userPermissions={userPermissions}
                permissionDetails={permissionDetails}
                onDataChange={fetchDashboard}
                onNavigateToReturns={(dev = null) => {
                  setInitialReturnDevice(dev);
                  setActiveTab('returns');
                }}
                externalSearch={globalSearch}
              />
            )}

            {activeTab === 'groups' && (
              <GroupsView
                user={user}
                userPermissions={userPermissions}
                permissionDetails={permissionDetails}
                onDataChange={fetchDashboard}
              />
            )}

            {activeTab === 'incidents' && (
              <IncidentsView
                user={user}
                permissionDetails={permissionDetails}
                onDataChange={fetchDashboard}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsView
                user={user}
                userPermissions={userPermissions}
                permissionDetails={permissionDetails}
                onNotificationsChange={fetchDashboard}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                user={user}
                userPermissions={userPermissions}
                permissionDetails={permissionDetails}
                onDataChange={fetchDashboard}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView />
            )}

            {activeTab === 'reconciliation' && (
              <ReconciliationView user={user} />
            )}

            {activeTab === 'audit-logs' && user?.role === 'Developer' && (
              <AuditLogsView user={user} />
            )}

            {activeTab === 'users' && (user?.role === 'Developer' || userPermissions?.add_user_accounts) && (
              <UsersView
                user={user}
                onNavigateToPermissions={
                  user?.role === 'Developer'
                    ? () => setActiveTab('permissions')
                    : undefined
                }
              />
            )}

            {activeTab === 'permissions' && user?.role === 'Developer' && (
              <PermissionsView onPermissionsChange={fetchPermissions} />
            )}

            {activeTab === 'settings' && user?.role === 'Developer' && (
              <SettingsView onSettingsChange={fetchDashboard} />
            )}
          </main>
        </div>
      </div>
    </WorkspaceErrorBoundary>
  );
}
