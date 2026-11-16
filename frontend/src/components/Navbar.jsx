import React, { useState } from 'react';
import {
  LayoutGrid,
  Smartphone,
  ArrowLeftRight,
  CalendarCheck,
  AlertTriangle,
  Bell,
  BarChart2,
  GitCompare,
  History,
  Users,
  ShieldCheck,
  Settings,
  ClipboardList,
  Search,
  LogOut,
  Menu,
  X
} from 'lucide-react';

export function Sidebar({
  user,
  userPermissions,
  activeTab,
  setActiveTab,
  dashboardData,
  mobileMenuOpen = false,
  setMobileMenuOpen = () => {},
  onLogout = () => {}
}) {
  const activeIncidentsCount =
    dashboardData?.activeIncidentsCount ?? dashboardData?.missingDevices ?? 0;
  const unreadNotificationsCount = dashboardData?.unreadNotificationsCount ?? 0;

  const isDeveloper = user?.role === 'Developer';
  const isAdmin = user?.role === 'ITAdmin';
  const isEmployee = user?.role === 'Employee';

  const mainNav = isEmployee
    ? [
        { id: 'dashboard', label: 'My Dashboard', icon: LayoutGrid },
        { id: 'devices', label: 'My Assigned Phone', icon: Smartphone },
        {
          id: 'notifications',
          label: 'Notification',
          icon: Bell,
          badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null
        }
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
        { id: 'devices', label: 'Mobile Phones', icon: Smartphone },
        { id: 'returns', label: 'Return & Replace', icon: ArrowLeftRight },
        { id: 'checking', label: 'Checking sessions', icon: CalendarCheck },
        {
          id: 'incidents',
          label: 'Missing Incidents',
          icon: AlertTriangle,
          badge: activeIncidentsCount > 0 ? activeIncidentsCount : null
        },
        {
          id: 'notifications',
          label: 'Notification',
          icon: Bell,
          badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null
        }
      ];

  const insightsNav = [
    { id: 'reconciliation', label: 'Reconciliation', icon: GitCompare },
    { id: 'reports', label: 'Report', icon: BarChart2 },
    { id: 'history', label: 'History', icon: History }
  ];

  // Developer exclusive console
  const developerNav = [
    { id: 'audit-logs', label: 'System Audit Logs', icon: ClipboardList },
    { id: 'permissions', label: 'User Permissions', icon: ShieldCheck },
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'users', label: 'User Management', icon: Users }
  ];

  // Admin operational management (Developer console items hidden!)
  const adminNav = [
    { id: 'users', label: 'Staff & Accounts', icon: Users }
  ];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const renderNavButton = (item) => {
    const isActive = activeTab === item.id;
    const Icon = item.icon;

    return (
      <button
        type="button"
        key={item.id}
        onClick={() => handleSelectTab(item.id)}
        aria-current={isActive ? 'page' : undefined}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[14.5px] transition-all cursor-pointer select-none ${
          isActive
            ? 'bg-white text-slate-950 font-bold shadow-2xs'
            : 'text-slate-800 hover:text-black hover:bg-white/60 font-medium'
        }`}
      >
        <span className="flex items-center space-x-3">
          <Icon
            className={`w-[18px] h-[18px] shrink-0 ${
              isActive ? 'text-black stroke-[2.2]' : 'text-slate-700 stroke-[1.8]'
            }`}
          />
          <span className="truncate">{item.label}</span>
        </span>
        {item.badge !== null && item.badge !== undefined && (
          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#ffc5c5] text-rose-900 shrink-0">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const sidebarContent = (isMobile = false) => (
    <div className="px-5 py-6 flex flex-col h-full overflow-y-auto">
      {/* Top Brand Logo — HTSK Gradient Style matching mockup */}
      <div className="flex items-center justify-between px-2 mb-6">
        <div
          onClick={() => handleSelectTab('dashboard')}
          className="cursor-pointer select-none"
        >
          <div className="text-[34px] leading-none font-black tracking-widest bg-gradient-to-r from-[#c8f53b] via-[#7ed321] to-[#1b6b3a] bg-clip-text text-transparent">
            HTSK
          </div>
        </div>

        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Primary Navigation */}
      <nav aria-label="Primary Workspace Navigation" className="space-y-1">
        {mainNav.map(renderNavButton)}
      </nav>

      {/* INSIGHTS Section - Hidden for standard employees */}
      {!isEmployee && (
        <div className="mt-6 space-y-1">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            INSIGHTS
          </div>
          {insightsNav.map(renderNavButton)}
        </div>
      )}

      {/* Developer Exclusive Suite */}
      {isDeveloper && (
        <div className="mt-6 space-y-1">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center justify-between">
            <span>DEVELOPER SUITE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#7ed321]"></span>
          </div>
          {developerNav.map(renderNavButton)}
        </div>
      )}

      {/* Admin Operations Section - Dedicated to ITAdmin */}
      {isAdmin && (
        <div className="mt-6 space-y-1">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            OPERATIONS
          </div>
          {adminNav.map(renderNavButton)}
        </div>
      )}

      {/* Admin Profile & Logout Section at bottom of Sidebar */}
      <div className="mt-auto pt-6 border-t border-slate-200/80">
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-[#c8f53b] font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
              {(user?.fullName || user?.username || 'AD').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold text-slate-900 truncate">
                {user?.fullName || user?.username || 'Administrator'}
              </div>
              <div className="flex items-center space-x-1 mt-0.5">
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#c8f53b] text-slate-950 uppercase tracking-tight">
                  {user?.role === 'Developer' ? 'DEV ADMIN' : 'IT ADMIN'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate">
                  Active
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="w-full mt-3 py-2 px-3 rounded-xl bg-[#f8faf6] hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 text-slate-700 hover:text-rose-700 text-xs font-bold transition flex items-center justify-between cursor-pointer group"
          >
            <span className="flex items-center space-x-2">
              <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 transition" />
              <span>Sign Out</span>
            </span>
            <span className="text-[10px] text-slate-400 group-hover:text-rose-400 font-mono">
              Logout
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex w-[240px] bg-[#f4f9f2] flex-col shrink-0 select-none border-r border-slate-200/60">
        {sidebarContent(false)}
      </aside>

      {/* Mobile & Tablet Slide-Over Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#f4f9f2] h-full flex flex-col shadow-2xl z-10 select-none border-r border-slate-200/60">
            {sidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}

export function TopHeader({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  globalSearch,
  setGlobalSearch,
  onOpenMobileMenu = () => {}
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const breadcrumbMap = {
    dashboard: 'Dashboard',
    devices: 'Mobile Phones',
    returns: 'Return & Replace',
    checking: 'Checking sessions',
    incidents: 'Missing Incidents',
    notifications: 'Notification',
    reports: 'Report',
    history: 'History',
    reconciliation: 'Reconciliation',
    'audit-logs': 'System Audit Logs',
    users: 'User Management',
    permissions: 'User Permissions',
    settings: 'Settings'
  };

  const roleLabel =
    user?.role === 'ITAdmin'
      ? 'IT Admin'
      : user?.role === 'Developer'
      ? 'Developer'
      : 'Employee';

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && globalSearch.trim()) {
      setActiveTab('devices');
    }
  };

  return (
    <header className="bg-[#f4f9f2] sticky top-0 z-30 shrink-0">
      <div className="h-16 px-4 sm:px-8 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Button + Breadcrumb ("Workspace / Dashboard") */}
        <div className="flex items-center space-x-2 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg transition shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-normal">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="hover:text-slate-600 cursor-pointer"
            >
              Workspace
            </button>
            <span>/</span>
            <span className="text-slate-500 font-medium">
              {breadcrumbMap[activeTab] || 'Dashboard'}
            </span>
          </div>
        </div>

        {/* Right: Search Input + User Avatar matching mockup */}
        <div className="flex items-center space-x-4 sm:space-x-6 shrink-0">
          <div className="relative">
            <input
              type="search"
              aria-label="Search"
              placeholder="| Search"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-44 sm:w-72 md:w-80 px-3.5 py-1.5 bg-[#ecefee] focus:bg-white border border-slate-300/90 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition"
            />
          </div>

          {/* Explicit Logout Button in Top Header */}
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-700 text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            title="Sign out of Admin Session"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Logout</span>
          </button>

          {/* User Profile Avatar Circle matching mockup */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center cursor-pointer"
              title={`${user?.fullName || user?.username} (${roleLabel})`}
            >
              <svg
                viewBox="0 0 36 36"
                className="w-full h-full"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="36" height="36" rx="18" fill="#e2e8f0" />
                <circle cx="18" cy="13.5" r="5.5" fill="#475569" />
                <path
                  d="M7 33c1.5-6.5 6-10 11-10s9.5 3.5 11 10"
                  fill="#1e293b"
                />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="font-bold text-slate-800 truncate">
                    {user?.fullName || user?.username}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {user?.email || `@${user?.username}`}
                  </div>
                  <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-lime-100 text-lime-900 border border-lime-300">
                    {roleLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 font-semibold flex items-center space-x-2 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Sidebar;
