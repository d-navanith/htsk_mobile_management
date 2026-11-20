import React from 'react';
import { LayoutDashboard, Sparkles, History, Settings, LogOut, User, ClipboardCheck, Package, X } from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  onLogout = () => {},
  isMobileOpen = false,
  setIsMobileOpen = () => {},
  canManageUsers = true,
  canAccessUpdate = true,
  canAccessHistory = true,
  canAccessSettings = true,
  canViewDevices = true,
  canViewDailyTasks = true,
  canViewInventory = true
}) {
  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileOpen(false)}
          title="Close Navigation Menu"
        />
      )}

      <aside
        className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}
      >
        <div>
          {/* Brand Logo & Mobile Close button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div className="brand-logo" style={{ marginBottom: 0 }} title="HTSK Mobile Management">
              HTSK
            </div>
            <button
              className="mobile-close-btn"
              onClick={() => setIsMobileOpen(false)}
              title="Close Menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Menu matching user requested flow */}
          <nav className="nav-menu">
            {canViewDevices && (
              <button
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleNavClick('dashboard')}
              >
                <LayoutDashboard />
                <span>Dashboard</span>
              </button>
            )}

            {canViewDailyTasks && (
              <button
                className={`nav-item ${activeTab === 'dailytask' ? 'active' : ''}`}
                onClick={() => handleNavClick('dailytask')}
              >
                <ClipboardCheck />
                <span>Daily Task</span>
              </button>
            )}

            {canViewInventory && (
              <button
                className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => handleNavClick('inventory')}
              >
                <Package />
                <span>Inventory</span>
              </button>
            )}

            {canAccessUpdate && (
              <button
                className={`nav-item ${activeTab === 'update' ? 'active' : ''}`}
                onClick={() => handleNavClick('update')}
              >
                <Sparkles />
                <span>Update</span>
              </button>
            )}

            {canManageUsers && (
              <button
                className={`nav-item ${activeTab === 'usermanage' ? 'active' : ''}`}
                onClick={() => handleNavClick('usermanage')}
              >
                <User />
                <span>User manage</span>
              </button>
            )}

            {canAccessHistory && (
              <button
                className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => handleNavClick('history')}
              >
                <History />
                <span>History</span>
              </button>
            )}

            {canAccessSettings && (
              <button
                className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => handleNavClick('settings')}
              >
                <Settings />
                <span>Settings</span>
              </button>
            )}
          </nav>
        </div>

        {/* Logout button matching Image 1, 2, 3, 4 bottom-left */}
        <div style={{ paddingBottom: '16px' }}>
          <button
            onClick={() => {
              setIsMobileOpen(false);
              onLogout();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#ff5a5f',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              width: '120px',
              boxShadow: '0 2px 4px rgba(255, 90, 95, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f43f5e'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ff5a5f'}
            title="Logout from Mobile Management"
          >
            <span>Logout</span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
