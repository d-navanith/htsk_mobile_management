import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, ChevronDown, ShieldCheck, KeyRound, RefreshCw, Users, Check } from 'lucide-react';

export default function UserProfileMenu({
  currentUser = 'shanaka',
  currentUserName = 'Shanaka',
  currentUserRole = 'Admin',
  currentUserEmail = 'shanaka@htsk.com',
  currentUserAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  onOpenProfile = () => {},
  onOpenSecurity = () => {},
  onLogout = () => {},
  setActiveTab = () => {},
  onRefresh = () => {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const displayName = currentUserName || (currentUser ? currentUser.charAt(0).toUpperCase() + currentUser.slice(1) : 'Shanaka');
  const displayRole = currentUserRole || 'Admin';
  const displayUsername = currentUser ? `@${currentUser}` : '@shanaka';

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={menuRef}>
      {/* Clickable Profile Capsule */}
      <div
        className="desktop-only-profile user-profile-capsule"
        onClick={() => setIsOpen(prev => !prev)}
        title="Admin Profile & Settings Menu"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          padding: '4px 12px 4px 5px',
          backgroundColor: isOpen ? '#f0fdf4' : '#ffffff',
          border: isOpen ? '1.5px solid #84cc16' : '1px solid #e5e7eb',
          borderRadius: '9999px',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 4px 12px rgba(132, 204, 22, 0.18)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.18s ease',
          userSelect: 'none'
        }}
      >
        <img
          src={currentUserAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
          alt={displayName}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid #84cc16',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
          }}
        />
        <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#1f2937' }}>
          {displayName}
        </span>
        <ChevronDown
          size={14}
          color="#6b7280"
          style={{
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '270px',
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #eef2eb',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 1050,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Header Card Area */}
          <div style={{
            padding: '16px 16px 14px',
            background: 'linear-gradient(135deg, #f7fee7 0%, #f0fdf4 100%)',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={currentUserAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt={displayName}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #84cc16',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                }}
              />
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{
                  fontSize: '14.5px',
                  fontWeight: 700,
                  color: '#111827',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  {displayName}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '1px',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  {displayUsername}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '10px',
              paddingTop: '8px',
              borderTop: '1px dashed #dcfce7'
            }}>
              <span style={{ fontSize: '11px', color: '#65a30d', fontWeight: 600 }}>System Role</span>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#166534',
                backgroundColor: '#dcfce7',
                padding: '2px 9px',
                borderRadius: '999px',
                border: '1px solid #bbf7d0',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                {displayRole}
              </span>
            </div>
          </div>

          {/* Menu Items */}
          <div style={{ padding: '6px' }}>
            {/* Manage Profile */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenProfile();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '12px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#ecfccb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4d7c0f'
              }}>
                <User size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>Manage Profile</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Edit name, email, avatar</div>
              </div>
            </button>

            {/* Change Password / Security */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenSecurity();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '12px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#b45309'
              }}>
                <KeyRound size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>Password & Security</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Update login credentials</div>
              </div>
            </button>

            {/* User Manage (Admins) */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setActiveTab('usermanage');
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '12px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#ede9fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6d28d9'
              }}>
                <Users size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>User Management</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Roles & permissions</div>
              </div>
            </button>

            {/* Quick Refresh */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onRefresh();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '12px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0369a1'
              }}>
                <RefreshCw size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>Refresh Data</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Reload inventory & records</div>
              </div>
            </button>
          </div>

          {/* Sign Out Action */}
          <div style={{ padding: '6px', borderTop: '1px solid #f3f4f6' }}>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '10px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                color: '#dc2626',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <LogOut size={16} color="#dc2626" />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
