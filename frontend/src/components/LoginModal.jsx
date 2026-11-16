import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Lock,
  User,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Clock,
  ArrowRight,
  CheckCircle2,
  KeyRound
} from 'lucide-react';

export const PORTAL_CONFIGS = {
  ITAdmin: {
    role: 'ITAdmin',
    path: '/',
    hash: '#/',
    badge: 'Administrator Portal',
    code: 'ADMIN-PORTAL',
    title: 'Admin Sign In'
  }
};

export function detectPortalFromLocation() {
  return 'ITAdmin';
}

export default function LoginModal({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [colomboTime, setColomboTime] = useState('');

  const usernameInputRef = useRef(null);
  const errorBannerRef = useRef(null);

  useEffect(() => {
    usernameInputRef.current?.focus();
  }, []);

  // Synchronized Colombo SLST Live Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const colombo = new Date(utc + 3600000 * 5.5);
      const timeStr = colombo.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const dateStr = colombo.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      setColomboTime(`${dateStr} • ${timeStr} SLST`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleQuickFill = () => {
    setUsername('itadmin');
    setPassword('Admin@123');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both admin username and password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await onLogin(username.trim(), password, 'ITAdmin');
    } catch (err) {
      setError(
        err.message ||
          'Sign in failed. Please verify your administrator credentials.'
      );
      setTimeout(() => {
        errorBannerRef.current?.focus();
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f9f2] text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-[#c8f53b] selection:text-slate-950">
      {/* Theme Decorative Glow Elements */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#c8f53b]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#1a6e3c]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/40 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-3xl sm:text-[34px] leading-none font-black tracking-widest bg-gradient-to-r from-[#c8f53b] via-[#7ed321] to-[#1b6b3a] bg-clip-text text-transparent select-none">
              HTSK
            </div>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="hidden sm:block">
              <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Mobile Device Management
              </div>
              <div className="text-[10px] text-slate-500">
                Company Fleet &amp; Physical Verification System
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-slate-700 bg-white px-3.5 py-1.5 rounded-full border border-slate-200/90 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-[#1a6e3c]" />
            <span>{colomboTime || 'Colombo SLST'}</span>
          </div>
        </div>
      </header>

      {/* Main Admin Sign-In Section */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[440px] bg-white rounded-[32px] border-2 border-slate-100 shadow-xl shadow-slate-900/5 p-7 sm:p-10 transition-all">
          {/* Admin Portal Header Badge */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#f6f9f4] border border-[#c8f53b] text-[#1a6e3c] mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1a6e3c]" />
              <span>ADMINISTRATOR PORTAL</span>
            </div>
            <h1
              id="admin-login-heading"
              className="text-2xl sm:text-[28px] font-black text-slate-950 tracking-tight"
            >
              Admin Sign In
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Authorized admin access only. Manage company device inventory,
              physical audits, and missing incidents.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            aria-labelledby="admin-login-heading"
            className="mt-6 space-y-4"
          >
            {error && (
              <div
                ref={errorBannerRef}
                tabIndex={-1}
                role="alert"
                aria-live="polite"
                className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 text-xs flex items-start space-x-2 focus:outline-none"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-username"
                className="block text-xs font-bold text-slate-800"
              >
                Admin Username <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  ref={usernameInputRef}
                  id="admin-username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-[#f8faf6] border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a6e3c] focus:ring-2 focus:ring-[#c8f53b]/40 transition"
                  placeholder="e.g. itadmin or admin"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-bold text-slate-800"
                >
                  Password <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  Case-sensitive
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full pl-10 pr-11 py-3 bg-[#f8faf6] border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a6e3c] focus:ring-2 focus:ring-[#c8f53b]/40 transition"
                  placeholder="Enter admin password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Quick Demo Fill Helper */}
            <div className="pt-1">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f6f9f4] border border-slate-200/90 text-xs">
                <div className="flex items-center space-x-2 text-slate-600">
                  <KeyRound className="w-3.5 h-3.5 text-[#1a6e3c] shrink-0" />
                  <span className="text-[11px] font-medium">
                    Default Admin: <strong className="text-slate-900">itadmin</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="px-2.5 py-1 text-[10px] font-extrabold text-slate-900 bg-[#c8f53b] hover:bg-[#b8e629] rounded-lg shadow-2xs transition cursor-pointer"
                >
                  Auto Fill
                </button>
              </div>
            </div>

            {/* Submit Button in signature HTSK Lime */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-[#c8f53b] hover:bg-[#b8e629] active:bg-[#a8d619] text-slate-950 font-black rounded-xl shadow-sm hover:shadow transition flex items-center justify-center space-x-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Authenticating Admin...</span>
                ) : (
                  <>
                    <span>Sign In to Admin Workspace</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>

            {/* Admin Features Checkmarks */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center space-x-2 text-[11px] text-slate-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Physical inspection sessions &amp; inventory reconciliation</span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-slate-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Device handover, replacements &amp; bank profile management</span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-slate-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Missing device investigations &amp; executive reports</span>
              </div>
            </div>

            {/* Security Notice */}
            <div className="pt-3 text-center">
              <p className="text-[10px] text-slate-400 font-medium flex items-center justify-center space-x-1">
                <Lock className="w-3 h-3 text-[#1a6e3c]" />
                <span>
                  Admin-only access. Non-admin accounts are strictly restricted.
                </span>
              </p>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 bg-white/60 backdrop-blur-md py-4 text-center text-xs text-slate-500">
        HTSK Mobile Device Management System • Administrator Console • Colombo (UTC+05:30)
      </footer>
    </div>
  );
}
