import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('shanaka');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter username and password.');
      return;
    }

    const cleanUser = username.trim().toLowerCase();
    if (
      (cleanUser === 'shanaka' || cleanUser === 'itadmin' || cleanUser === 'admin' || cleanUser === 'developer') &&
      (password === 'Admin@123' || password === 'Developer@123')
    ) {
      onLogin();
    } else {
      setError('Invalid admin credentials. Please enter valid administrator credentials.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f4f9f2',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      fontFamily: 'inherit',
      overflow: 'hidden'
    }}>
      {/* Decorative Blur Orbs */}
      <div style={{
        position: 'absolute',
        top: '-120px',
        left: '-120px',
        width: '380px',
        height: '380px',
        borderRadius: '50%',
        backgroundColor: 'rgba(200, 245, 59, 0.22)',
        filter: 'blur(70px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-120px',
        right: '-120px',
        width: '380px',
        height: '380px',
        borderRadius: '50%',
        backgroundColor: 'rgba(26, 110, 60, 0.12)',
        filter: 'blur(70px)',
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <header style={{
        padding: '20px 40px',
        borderBottom: '1px solid #e7ebe6',
        backgroundColor: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ fontSize: '32px', fontWeight: 900, color: '#72bf12', letterSpacing: '-0.04em' }}>
          HTSK
        </div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', backgroundColor: '#ffffff', padding: '6px 14px', borderRadius: '999px', border: '1px solid #e5e7eb' }}>
          Admin Console
        </div>
      </header>

      {/* Center Card */}
      <main style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        zIndex: 10,
        flex: 1
      }}>
        <div style={{
          maxWidth: '420px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '28px',
          border: '2px solid #f0f3f0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
          padding: '36px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              backgroundColor: '#f6f9f4',
              border: '1px solid #c8f53b',
              color: '#1a6e3c',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '12px'
            }}>
              <ShieldCheck size={14} />
              <span>ADMINISTRATOR LOGIN</span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>
              Admin Sign In
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>
              Secure access for authorized administrators only.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Admin Username
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  placeholder="admin or itadmin"
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '12px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    backgroundColor: '#f9fafb',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter password"
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 38px',
                    borderRadius: '12px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    backgroundColor: '#f9fafb',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              style={{
                marginTop: '8px',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: '#8fe022',
                color: '#111827',
                fontSize: '14px',
                fontWeight: 800,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(143, 224, 34, 0.4)'
              }}
            >
              <span>Sign In to Admin Workspace</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '16px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#6b7280',
        borderTop: '1px solid #e7ebe6',
        backgroundColor: '#ffffff'
      }}>
        HTSK Mobile Management • Administrator Access Only
      </footer>
    </div>
  );
}
