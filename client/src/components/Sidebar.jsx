import React from 'react';
import { LayoutDashboard, Sparkles, History, Settings, LogOut, User, ClipboardCheck, Package } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onLogout = () => {} }) {
  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'space-between' }}>
      <div>
        {/* Brand Logo matching screenshots */}
        <div className="brand-logo" title="HTSK Mobile Management">
          HTSK
        </div>

        {/* Navigation Menu matching user mockup order */}
        <nav className="nav-menu">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard />
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'dailytask' ? 'active' : ''}`}
            onClick={() => setActiveTab('dailytask')}
          >
            <ClipboardCheck />
            <span>Daily Task</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History />
            <span>History</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'usermanage' ? 'active' : ''}`}
            onClick={() => setActiveTab('usermanage')}
          >
            <User />
            <span>User manage</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'update' ? 'active' : ''}`}
            onClick={() => setActiveTab('update')}
          >
            <Sparkles />
            <span>Update</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Package />
            <span>Inventory</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings />
            <span>Settings</span>
          </button>
        </nav>
      </div>

      {/* Logout button matching Image 1, 2, 3, 4 bottom-left */}
      <div style={{ paddingBottom: '16px' }}>
        <button
          onClick={onLogout}
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
  );
}
