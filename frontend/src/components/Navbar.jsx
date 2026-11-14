import React, { useState } from 'react';
import {
  Smartphone,
  LayoutGrid,
  Folder,
  CalendarCheck,
  AlertTriangle,
  Bell,
  BarChart2,
  History,
  Users,
  Settings,
  Clock,
  HelpCircle,
  ChevronDown,
  Search,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  ShieldCheck
} from 'lucide-react';

export function Sidebar({
  user,
  userPermissions,
  activeTab,
  setActiveTab,
  dashboardData,
  mobileMenuOpen = false,
  setMobileMenuOpen = () => {}
}) {
  const role = user?.role || 'Employee';
  const activeIncidentsCount =
    dashboardData?.activeIncidentsCount ?? dashboardData?.missingDevices ?? 0;
  const unreadNotificationsCount = dashboardData?.unreadNotificationsCount ?? 0;

  const canViewDashboard = userPermissions?.view_dashboard ?? true;
  const canViewCheckingSessions = userPermissions?.checking_sessions ?? true;
  const canViewNotifications = userPermissions?.notifications ?? true;
  const canViewReports = userPermissions?.view_missing_reports ?? true;
  const canViewHistory = userPermissions?.view_checking_history ?? true;
  const canManageUsers =
    userPermissions?.add_user_accounts ?? role === 'Developer';

  const mainNav = [
    ...(canViewDashboard
      ? [{ id: 'dashboard', label: 'Dashboard', icon: LayoutGrid }]
      : []),
    { id: 'devices', label: 'Mobile phones', icon: Smartphone },
    { id: 'groups', label: 'Groups', icon: Folder },
    ...(canViewCheckingSessions
      ? [{ id: 'checking', label: 'Checking sessions', icon: CalendarCheck }]
      : []),
    ...(canViewReports
      ? [
          {
            id: 'incidents',
            label: 'Missing incidents',
            icon: AlertTriangle,
            badge: activeIncidentsCount > 0 ? activeIncidentsCount : null,
            badgeColor: 'text-rose-600 font-bold'
          }
        ]
      : []),
    ...(canViewNotifications
      ? [
          {
            id: 'notifications',
            label: 'Notifications',
            icon: Bell,
            badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null,
            badgeColor: 'text-amber-600 font-bold'
          }
        ]
      : [])
  ];

  const insightsNav = [
    ...(canViewReports ? [{ id: 'reports', label: 'Reports', icon: BarChart2 }] : []),
    ...(canViewHistory ? [{ id: 'history', label: 'History', icon: History }] : [])
  ];

  const adminNav = [
    ...(canManageUsers
      ? [{ id: 'users', label: 'User management', icon: Users }]
      : []),
    ...(role === 'Developer'
      ? [
          { id: 'permissions', label: 'User permissions', icon: ShieldCheck },
          { id: 'settings', label: 'Settings', icon: Settings }
        ]
      : [])
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
        className={`w-full flex items-center justify-between px-3 py-2.5 lg:py-2 rounded-lg text-[13px] transition-colors ${
          isActive
            ? 'bg-[#edf4ff] text-[#1d4ed8] font-semibold'
            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
        }`}
      >
        <span className="flex items-center space-x-2.5">
          <Icon
            className={`w-4 h-4 ${
              isActive ? 'text-[#1d4ed8]' : 'text-slate-500'
            }`}
          />
          <span>{item.label}</span>
        </span>
        {item.badge !== null && item.badge !== undefined && (
          <span className={`text-xs ${item.badgeColor || 'text-slate-500'}`}>
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const sidebarContent = (isMobile = false) => (
    <>
      <div className="p-4 space-y-5 overflow-y-auto">
        {/* Top Brand Logo */}
        <div className="flex items-center justify-between px-1">
          <div
            onClick={() => handleSelectTab('dashboard')}
            className="flex items-center space-x-2.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0f2942] flex items-center justify-center text-white shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <div className="font-extrabold text-[15px] tracking-tight text-slate-900">
                HTSK
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                HTSK Mobile Management
              </div>
            </div>
          </div>

          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Organization Selector */}
        <div className="px-3 py-2 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs font-semibold text-slate-800 shadow-2xs">
          <span className="truncate">HTSK Mobile Management</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>

        {/* Primary Navigation */}
        <nav aria-label="Primary Workspace Navigation" className="space-y-1">
          {mainNav.map(renderNavButton)}
        </nav>

        {/* Insights Section */}
        <div className="space-y-1 pt-1">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            INSIGHTS
          </div>
          {insightsNav.map(renderNavButton)}
        </div>

        {/* Administration Section (Developer Only) */}
        {adminNav.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ADMINISTRATION
            </div>
            {adminNav.map(renderNavButton)}
          </div>
        )}
      </div>

      {/* Bottom 2-Hour Callout & Help */}
      <div className="p-4 space-y-3 border-t border-slate-100">
        <div className="bg-[#f4f7fb] rounded-xl p-3.5 border border-slate-200/60">
          <Clock className="w-4 h-4 text-[#1d4ed8] mb-2" />
          <div className="text-xs font-bold text-slate-900">
            Every device. Every 2 hours.
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Manual checks. Peace of mind.
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleSelectTab('reports')}
          className="w-full flex items-center space-x-2 px-2 py-1 text-xs text-slate-500 hover:text-slate-800 transition"
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>Help &amp; documentation</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-slate-200/90 flex-col justify-between shrink-0 select-none">
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
          <aside className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col justify-between shadow-2xl z-10 select-none">
            {sidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Mobile Bottom Quick Navigation Bar (< lg) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 flex items-center justify-around py-1.5 px-2 shadow-lg"
      >
        {[
          ...(canViewDashboard
            ? [{ id: 'dashboard', label: 'Dashboard', icon: LayoutGrid }]
            : []),
          { id: 'devices', label: 'Phones', icon: Smartphone },
          ...(canViewCheckingSessions
            ? [{ id: 'checking', label: 'Check', icon: CalendarCheck }]
            : []),
          ...(canViewReports
            ? [
                {
                  id: 'incidents',
                  label: 'Missing',
                  icon: AlertTriangle,
                  badge: activeIncidentsCount > 0 ? activeIncidentsCount : null
                }
              ]
            : []),
          { id: 'groups', label: 'Groups', icon: Folder }
        ].map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition ${
                isActive ? 'text-[#1d4ed8]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-[#1d4ed8]' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {item.badge && (
                <span className="absolute top-0.5 right-1.5 px-1 min-w-[14px] h-[14px] rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}

export function TopHeader({
  user,
  userPermissions,
  activeTab,
  setActiveTab,
  onLogout,
  dashboardData,
  globalSearch,
  setGlobalSearch,
  onOpenMobileMenu = () => {}
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const canViewNotifications = userPermissions?.notifications ?? true;

  const breadcrumbMap = {
    dashboard: 'Dashboard',
    devices: 'Mobile phones',
    groups: 'Groups',
    checking:
      dashboardData?.latestSession?.sessionStatus === 'InProgress'
        ? 'Checking sessions / Active checking'
        : 'Checking sessions',
    incidents: 'Missing incidents',
    notifications: 'Notifications',
    reports: 'Reports',
    history: 'History',
    users: 'User management',
    permissions: 'User permissions',
    settings: 'Settings'
  };

  const roleLabel =
    user?.role === 'ITAdmin'
      ? 'IT Admin'
      : user?.role === 'Developer'
      ? 'Developer'
      : 'Employee';

  const unreadCount = dashboardData?.unreadNotificationsCount ?? 0;

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && globalSearch.trim()) {
      setActiveTab('devices');
      setMobileSearchOpen(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shrink-0">
      <div className="h-14 px-3 sm:px-6 flex items-center justify-between gap-2">
        {/* Left: Mobile Menu Button + Breadcrumb */}
        <div className="flex items-center space-x-2 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs min-w-0">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="hidden sm:inline text-slate-400 hover:text-slate-600 font-medium shrink-0"
            >
              Workspace
            </button>
            <span className="hidden sm:inline text-slate-300 shrink-0">/</span>
            <span className="text-slate-800 font-semibold truncate">
              {breadcrumbMap[activeTab] || 'Dashboard'}
            </span>
          </div>
        </div>

        {/* Right: Search, Notifications & User Profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* Desktop Global Workspace Search */}
          <search className="hidden sm:block relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search workspace"
              placeholder="Search workspace...  ⌘K"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-44 md:w-56 pl-8 pr-3 py-1.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition"
            />
          </search>

          {/* Mobile Search Toggle */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            aria-label="Toggle search"
            className="sm:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notification Bell */}
          {canViewNotifications && (
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              aria-label="Notifications"
              className="relative p-2 sm:p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>
          )}

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center space-x-2 py-1 px-1.5 sm:px-2 rounded-lg hover:bg-slate-100 transition text-left"
            >
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="hidden md:block leading-tight">
                <div className="text-xs font-bold text-slate-800">
                  {user?.fullName || user?.username}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {roleLabel}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="font-bold text-slate-800 truncate">
                    {user?.fullName || user?.username}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {user?.email || `@${user?.username}`}
                  </div>
                  <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {roleLabel} Portal
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 font-semibold flex items-center space-x-2 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Mobile Search Bar */}
      {mobileSearchOpen && (
        <div className="sm:hidden px-3 pb-2.5 border-t border-slate-100 pt-2 bg-white">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search workspace"
              placeholder="Search Mobile ID, device or group..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
              className="w-full pl-8 pr-3 py-2 bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>
      )}
    </header>
  );
}

export default Sidebar;
