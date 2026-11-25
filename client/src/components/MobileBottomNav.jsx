import React, { useState } from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  Package,
  Sparkles,
  MoreHorizontal,
  User,
  History,
  Settings,
  LogOut,
  X,
  UserCheck
} from 'lucide-react';

export default function MobileBottomNav({
  activeTab,
  setActiveTab,
  onLogout = () => {},
  onOpenProfile = () => {},
  canManageUsers = true,
  canAccessUpdate = true,
  canAccessHistory = true,
  canAccessSettings = true,
  canViewDevices = true,
  canViewDailyTasks = true,
  canViewInventory = true,
  currentUser = '',
  currentUserName = '',
  currentUserRole = 'Admin',
  currentUserAvatar = ''
}) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsMoreOpen(false);
  };

  const isMoreActive = ['usermanage', 'history', 'settings'].includes(activeTab);

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {canViewDevices && (
          <button
            type="button"
            className={`mobile-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleTabClick('dashboard')}
            title="Dashboard"
          >
            <div className="mobile-nav-icon-wrap">
              <LayoutDashboard size={20} />
            </div>
            <span>Dashboard</span>
          </button>
        )}

        {canViewDailyTasks && (
          <button
            type="button"
            className={`mobile-nav-btn ${activeTab === 'dailytask' ? 'active' : ''}`}
            onClick={() => handleTabClick('dailytask')}
            title="Daily Task"
          >
            <div className="mobile-nav-icon-wrap">
              <ClipboardCheck size={20} />
            </div>
            <span>Daily Task</span>
          </button>
        )}

        {canViewInventory && (
          <button
            type="button"
            className={`mobile-nav-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => handleTabClick('inventory')}
            title="Inventory"
          >
            <div className="mobile-nav-icon-wrap">
              <Package size={20} />
            </div>
            <span>Inventory</span>
          </button>
        )}

        {canAccessUpdate && (
          <button
            type="button"
            className={`mobile-nav-btn ${activeTab === 'update' ? 'active' : ''}`}
            onClick={() => handleTabClick('update')}
            title="Update"
          >
            <div className="mobile-nav-icon-wrap">
              <Sparkles size={20} />
            </div>
            <span>Update</span>
          </button>
        )}

        <button
          type="button"
          className={`mobile-nav-btn ${isMoreActive || isMoreOpen ? 'active' : ''}`}
          onClick={() => setIsMoreOpen(prev => !prev)}
          title="More options"
        >
          <div className="mobile-nav-icon-wrap">
            <MoreHorizontal size={20} />
          </div>
          <span>More</span>
        </button>
      </nav>

      {/* Slide-up "More" Bottom Sheet for Mobile */}
      {isMoreOpen && (
        <div
          className="mobile-sheet-backdrop"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className="mobile-sheet-container"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle Drag bar */}
            <div className="mobile-sheet-drag-handle" />

            {/* Header: User Profile snippet & Close */}
            <div className="mobile-sheet-header">
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                onClick={() => {
                  setIsMoreOpen(false);
                  onOpenProfile('general');
                }}
              >
                <img
                  src={currentUserAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt="User"
                  className="mobile-avatar"
                  style={{ width: '42px', height: '42px' }}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#111827' }}>
                    {currentUserName || currentUser || 'Shanaka'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      backgroundColor: '#f0fdf4',
                      color: '#15803d',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '11px',
                      border: '1px solid #bbf7d0'
                    }}>
                      {currentUserRole || 'Admin'}
                    </span>
                    <span>Tap to view profile</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="mobile-close-btn"
                onClick={() => setIsMoreOpen(false)}
                title="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation links inside More sheet */}
            <div className="mobile-sheet-menu">
              {canManageUsers && (
                <button
                  type="button"
                  className={`mobile-sheet-item ${activeTab === 'usermanage' ? 'active' : ''}`}
                  onClick={() => handleTabClick('usermanage')}
                >
                  <div className="mobile-sheet-item-icon">
                    <User size={18} />
                  </div>
                  <div className="mobile-sheet-item-label">
                    <div className="item-title">User Management</div>
                    <div className="item-subtitle">Manage user accounts and permissions</div>
                  </div>
                </button>
              )}

              {canAccessHistory && (
                <button
                  type="button"
                  className={`mobile-sheet-item ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => handleTabClick('history')}
                >
                  <div className="mobile-sheet-item-icon">
                    <History size={18} />
                  </div>
                  <div className="mobile-sheet-item-label">
                    <div className="item-title">History</div>
                    <div className="item-subtitle">View system logs, round audit trails</div>
                  </div>
                </button>
              )}

              {canAccessSettings && (
                <button
                  type="button"
                  className={`mobile-sheet-item ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => handleTabClick('settings')}
                >
                  <div className="mobile-sheet-item-icon">
                    <Settings size={18} />
                  </div>
                  <div className="mobile-sheet-item-label">
                    <div className="item-title">Settings</div>
                    <div className="item-subtitle">Configure system preferences & shifts</div>
                  </div>
                </button>
              )}

              <button
                type="button"
                className="mobile-sheet-item"
                onClick={() => {
                  setIsMoreOpen(false);
                  onOpenProfile('general');
                }}
              >
                <div className="mobile-sheet-item-icon">
                  <UserCheck size={18} />
                </div>
                <div className="mobile-sheet-item-label">
                  <div className="item-title">My Profile & Security</div>
                  <div className="item-subtitle">Update name, password, or photo</div>
                </div>
              </button>

              <button
                type="button"
                className="mobile-sheet-item logout"
                onClick={() => {
                  setIsMoreOpen(false);
                  onLogout();
                }}
              >
                <div className="mobile-sheet-item-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                  <LogOut size={18} />
                </div>
                <div className="mobile-sheet-item-label">
                  <div className="item-title" style={{ color: '#dc2626' }}>Log Out</div>
                  <div className="item-subtitle">Securely end this device session</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
