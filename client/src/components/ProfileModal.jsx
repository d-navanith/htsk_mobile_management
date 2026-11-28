import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  Camera,
  Upload,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Save,
  Loader2,
  Sparkles,
  KeyRound
} from 'lucide-react';

const PRESET_AVATARS = [
  { id: 'avatar1', label: 'Shanaka (Default)', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 'avatar2', label: 'Male Admin 1', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
  { id: 'avatar3', label: 'Male Admin 2', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80' },
  { id: 'avatar4', label: 'Female Admin', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80' },
  { id: 'avatar5', label: 'Lead Developer', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 'avatar6', label: 'Executive Modern', url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80' }
];

export default function ProfileModal({
  isOpen = false,
  onClose = () => {},
  currentUser = 'shanaka',
  currentUserName = 'Shanaka',
  currentUserEmail = 'shanaka@htsk.com',
  currentUserAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  currentUserRole = 'Admin',
  onUpdateProfile = () => {},
  initialTab = 'general'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [fullName, setFullName] = useState(currentUserName);
  const [username, setUsername] = useState(currentUser);
  const [email, setEmail] = useState(currentUserEmail);
  const [avatarUrl, setAvatarUrl] = useState(currentUserAvatar);
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef(null);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'general');
      setFullName(currentUserName || 'Shanaka');
      setUsername(currentUser || 'shanaka');
      setEmail(currentUserEmail || 'shanaka@htsk.com');
      setAvatarUrl(currentUserAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, initialTab, currentUser, currentUserName, currentUserEmail, currentUserAvatar]);

  if (!isOpen) return null;

  // Handle local image file upload
  const handleFileUpload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Max allowed size is 5MB.');
      return;
    }

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success && data.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
        setSuccessMsg('Photo uploaded successfully! Remember to save profile changes.');
      } else {
        setError(data.error || 'Failed to upload photo.');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      // Fallback: create object URL for local preview
      const localUrl = URL.createObjectURL(file);
      setAvatarUrl(localUrl);
      setSuccessMsg('Local photo loaded for preview.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyCustomUrl = () => {
    if (customAvatarInput.trim()) {
      setAvatarUrl(customAvatarInput.trim());
      setShowCustomUrlInput(false);
      setCustomAvatarInput('');
      setSuccessMsg('Custom photo URL applied!');
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    // Password validation if changing password
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        setError('Please enter your current password to authorize a password change.');
        setActiveTab('security');
        return;
      }
      if (newPassword.length < 4) {
        setError('New password must be at least 4 characters long.');
        setActiveTab('security');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match. Please re-enter.');
        setActiveTab('security');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('htsk_session_token');
      const payload = {
        username_orig: currentUser,
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        avatar_url: avatarUrl.trim(),
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined
      };

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg('Profile updated successfully!');
        if (onUpdateProfile) {
          onUpdateProfile(data.user);
        }
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setError(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Update profile error:', err);
      setError('Network error saving profile changes. Please verify server connectivity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #eef2eb',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f7fee7 0%, #ffffff 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: '#ecfccb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4d7c0f',
              border: '1px solid #d9f99d'
            }}>
              <User size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
                Manage Profile
              </h2>
              <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '2px 0 0' }}>
                Update your administrative credentials, photo, and security
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#fafafa',
          padding: '0 24px'
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('general'); setError(''); }}
            style={{
              padding: '12px 18px',
              fontSize: '13.5px',
              fontWeight: 700,
              color: activeTab === 'general' ? '#166534' : '#6b7280',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'general' ? '3px solid #84cc16' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <User size={15} />
            <span>Profile & Identity</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('security'); setError(''); }}
            style={{
              padding: '12px 18px',
              fontSize: '13.5px',
              fontWeight: 700,
              color: activeTab === 'security' ? '#166534' : '#6b7280',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'security' ? '3px solid #84cc16' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <KeyRound size={15} />
            <span>Password & Security</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px',
              fontWeight: 500
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px',
              fontWeight: 600
            }}>
              <Check size={16} style={{ flexShrink: 0 }} color="#16a34a" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'general' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Profile Photo Management */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>
                  Profile Photo
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px',
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '16px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={avatarUrl}
                      alt={fullName}
                      style={{
                        width: '76px',
                        height: '76px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #84cc16',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload new photo"
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: '#84cc16',
                        color: '#000000',
                        border: '2px solid #ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                    >
                      <Camera size={14} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #d1d5db',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          color: '#374151',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        <span>{isUploading ? 'Uploading...' : 'Upload Image'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCustomUrlInput(v => !v)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #d1d5db',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                      >
                        Image URL...
                      </button>
                    </div>

                    <p style={{ fontSize: '11.5px', color: '#6b7280', margin: 0 }}>
                      JPG, PNG, or WebP. Recommended square aspect ratio.
                    </p>
                  </div>
                </div>

                {/* Custom URL Input Field */}
                {showCustomUrlInput && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={customAvatarInput}
                      onChange={e => setCustomAvatarInput(e.target.value)}
                      placeholder="Paste image URL (https://...)"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '13px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCustomUrl}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#84cc16',
                        color: '#000000',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      Apply
                    </button>
                  </div>
                )}

                {/* Preset Avatars Selection */}
                <div style={{ marginTop: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '6px' }}>
                    Or choose a preset avatar:
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {PRESET_AVATARS.map(preset => {
                      const isSelected = avatarUrl === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setAvatarUrl(preset.url);
                            setSuccessMsg('');
                          }}
                          style={{
                            padding: 0,
                            borderRadius: '50%',
                            border: isSelected ? '3px solid #84cc16' : '2px solid #e5e7eb',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'all 0.15s ease',
                            transform: isSelected ? 'scale(1.08)' : 'scale(1)'
                          }}
                          title={preset.label}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Shanaka"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '10px',
                      border: '1px solid #d1d5db',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Username * <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>(Used for system login)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontWeight: 700, fontSize: '14px' }}>@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    placeholder="shanaka"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 32px',
                      borderRadius: '10px',
                      border: '1px solid #d1d5db',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="user@htsk.com"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '10px',
                      border: '1px solid #d1d5db',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* System Role Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Assigned System Role</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>Role determines access levels and capabilities</div>
                </div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#15803d',
                  backgroundColor: '#dcfce7',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  border: '1px solid #bbf7d0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  {currentUserRole || 'Admin'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                padding: '14px 16px',
                backgroundColor: '#f0fdf4',
                borderRadius: '14px',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <ShieldCheck size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12.5px', color: '#166534', lineHeight: 1.5 }}>
                  <strong>Password Security Verification:</strong> To protect sensitive enterprise records, changing credentials requires verification of your existing password.
                </div>
              </div>

              {/* Current Password */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Current Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter existing password"
                    style={{
                      width: '100%',
                      padding: '10px 38px 10px 38px',
                      borderRadius: '10px',
                      border: '1px solid #d1d5db',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(v => !v)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af'
                    }}
                  >
                    {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 4 characters"
                    style={{
                      width: '100%',
                      padding: '10px 38px 10px 38px',
                      borderRadius: '10px',
                      border: '1px solid #d1d5db',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(v => !v)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af'
                    }}
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Confirm New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    style={{
                      width: '100%',
                      padding: '10px 38px 10px 38px',
                      borderRadius: '10px',
                      border: '1px solid #d1d5db',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(v => !v)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af'
                    }}
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#6b7280', padding: '0 4px' }}>
                Note: Updating your password will immediately apply to all future logins across web sessions.
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div style={{
            marginTop: '28px',
            paddingTop: '16px',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#8fe022',
                color: '#111827',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: (isSubmitting || isUploading) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(143, 224, 34, 0.4)',
                transition: 'all 0.15s ease'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
