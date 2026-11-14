import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Lock,
  User,
  AlertCircle,
  ShieldCheck,
  Terminal,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  Building2
} from 'lucide-react';

const PORTAL_CONFIGS = {
  Employee: {
    role: 'Employee',
    hash: '#/login/employee',
    badge: 'Staff Access Portal',
    title: 'Employee Sign In',
    subtitle: 'Read-only access to mobile phone availability, group assignments, and checking history.',
    icon: Building2,
    accentBg: 'from-emerald-600 to-teal-700',
    accentLight: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-500 focus-visible:outline-emerald-500 shadow-emerald-950/50',
    ringClass: 'focus:ring-emerald-500',
    cardBorder: 'hover:border-emerald-500/60',
    features: [
      'View live availability of all company mobile phones',
      'Inspect department & employee group status',
      'Browse historical 2-hour checking records & alerts'
    ],
    placeholderUser: 'Enter your employee username'
  },
  ITAdmin: {
    role: 'ITAdmin',
    hash: '#/login/itadmin',
    badge: 'IT Operations Portal',
    title: 'IT Admin Sign In',
    subtitle: 'Conduct mandatory 2-hour physical phone inspections, manage inventory, and handle missing incidents.',
    icon: ShieldCheck,
    accentBg: 'from-blue-600 to-indigo-700',
    accentLight: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    buttonClass: 'bg-blue-600 hover:bg-blue-500 focus-visible:outline-blue-500 shadow-blue-950/50',
    ringClass: 'focus:ring-blue-500',
    cardBorder: 'hover:border-blue-500/60',
    features: [
      'Start & complete 2-hour mobile checking sessions',
      'Register mobile devices and organize employee groups',
      'Investigate & resolve escalated missing-phone incidents'
    ],
    placeholderUser: 'Enter your IT Admin username'
  },
  Developer: {
    role: 'Developer',
    hash: '#/login/developer',
    badge: 'System Owner Console',
    title: 'Developer Sign In',
    subtitle: 'System administration, user account provisioning, role governance, and global configuration.',
    icon: Terminal,
    accentBg: 'from-purple-600 to-violet-800',
    accentLight: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    buttonClass: 'bg-purple-600 hover:bg-purple-500 focus-visible:outline-purple-500 shadow-purple-950/50',
    ringClass: 'focus:ring-purple-500',
    cardBorder: 'hover:border-purple-500/60',
    features: [
      'Create, manage, and deactivate user accounts & roles',
      'Configure 2-hour interval & escalation thresholds',
      'Full access to all operational & audit modules'
    ],
    placeholderUser: 'Enter your Developer username'
  }
};

function getPortalFromHash(hash) {
  const h = (hash || '').toLowerCase();
  if (h.includes('employee')) return 'Employee';
  if (h.includes('itadmin') || h.includes('admin')) return 'ITAdmin';
  if (h.includes('developer') || h.includes('dev')) return 'Developer';
  return null;
}

export default function LoginModal({ onLogin, initialPortal = null }) {
  const [selectedPortal, setSelectedPortal] = useState(() => {
    return getPortalFromHash(window.location.hash) || initialPortal || null;
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [colomboTime, setColomboTime] = useState('');

  const usernameInputRef = useRef(null);
  const errorBannerRef = useRef(null);

  useEffect(() => {
    const handleHashChange = () => {
      const portal = getPortalFromHash(window.location.hash);
      setSelectedPortal(portal);
      setError('');
      setUsername('');
      setPassword('');
      setShowPassword(false);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (selectedPortal && usernameInputRef.current) {
      usernameInputRef.current.focus();
    }
  }, [selectedPortal]);

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

  const choosePortal = (portalKey) => {
    if (portalKey && PORTAL_CONFIGS[portalKey]) {
      window.location.hash = PORTAL_CONFIGS[portalKey].hash;
      setSelectedPortal(portalKey);
    } else {
      window.location.hash = '#/portals';
      setSelectedPortal(null);
    }
    setError('');
    setUsername('');
    setPassword('');
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPortal) return;

    setError('');
    setLoading(true);
    try {
      await onLogin(username, password, selectedPortal);
    } catch (err) {
      setError(err.message || 'Sign in failed. Please check your credentials.');
      setTimeout(() => {
        errorBannerRef.current?.focus();
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  // --- VIEW 1: SEPARATE LOGIN PORTAL GATEWAY (Select which separate login page to open) ---
  if (!selectedPortal) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden">
        {/* Background decorative radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/50 via-slate-950 to-slate-950 pointer-events-none" />

        {/* Top Header */}
        <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#0f2942] rounded-xl flex items-center justify-center shadow-lg border border-slate-700">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-white">HTSK</span>
                <span className="hidden sm:inline-block text-xs text-slate-400 ml-2 pl-2 border-l border-slate-700">
                  HTSK Mobile Management
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{colomboTime} (Asia/Colombo)</span>
            </div>
          </div>
        </header>

        {/* Main Portal Selection Content */}
        <main className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 my-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
              <span>Role-Segregated Authentication</span>
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Select Your Dedicated Login Portal
            </h1>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Each role in HTSK Mobile Management authenticates through a separate, dedicated login portal with isolated permissions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.values(PORTAL_CONFIGS).map((portal) => {
              const IconComponent = portal.icon;
              return (
                <div
                  key={portal.role}
                  className={`group bg-slate-900/90 border border-slate-800 ${portal.cardBorder} rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${portal.accentBg} flex items-center justify-center text-white shadow-lg`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${portal.accentLight}`}>
                        {portal.badge}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-white">{portal.title}</h2>
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                      {portal.subtitle}
                    </p>

                    <ul className="mt-5 space-y-2.5 border-t border-slate-800/80 pt-4">
                      {portal.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => choosePortal(portal.role)}
                      className={`w-full min-h-[48px] py-2.5 px-4 rounded-xl font-semibold text-sm text-white shadow-lg flex items-center justify-center space-x-2 transition ${portal.buttonClass}`}
                    >
                      <span>Open {portal.title}</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-slate-900 py-4 text-center text-xs text-slate-500">
          HTSK Mobile Management • 2-Hour Verification Protocol • Sri Lanka Standard Time (UTC+05:30)
        </footer>
      </div>
    );
  }

  // --- VIEW 2: DEDICATED SINGLE-ROLE LOGIN PAGE ---
  const activeConfig = PORTAL_CONFIGS[selectedPortal];
  const PortalIcon = activeConfig.icon;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => choosePortal(null)}
            className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3 py-2 rounded-lg border border-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Portal Selection</span>
          </button>

          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{colomboTime}</span>
          </div>
        </div>
      </header>

      {/* Dedicated Role Sign-In Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Role Banner Header */}
          <div className={`bg-gradient-to-r ${activeConfig.accentBg} p-6 text-white`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-black/25 px-2.5 py-1 rounded-full border border-white/15">
                {activeConfig.badge}
              </span>
              <PortalIcon className="w-7 h-7 text-white/90" />
            </div>
            <h1 id="portal-signin-heading" className="text-2xl font-bold mt-3">
              {activeConfig.title}
            </h1>
            <p className="text-xs text-white/85 mt-1 leading-relaxed">
              {activeConfig.subtitle}
            </p>
          </div>

          {/* Sign-In Form */}
          <form
            method="post"
            action={`/api/auth/login/${activeConfig.role.toLowerCase()}`}
            aria-labelledby="portal-signin-heading"
            onSubmit={handleSubmit}
            className="p-6 sm:p-8 space-y-5"
          >
            {error && (
              <div
                ref={errorBannerRef}
                tabIndex={-1}
                role="alert"
                aria-live="polite"
                className="bg-rose-950/70 border border-rose-500/60 rounded-xl p-3.5 text-rose-200 text-xs flex items-start space-x-2.5 focus:outline-none"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-slate-200 tracking-wide"
              >
                Username <span aria-hidden="true" className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  ref={usernameInputRef}
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="next"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError('');
                  }}
                  aria-invalid={error ? 'true' : 'false'}
                  style={{ fontSize: 'max(1rem, 1em)' }}
                  className={`block w-full min-h-[48px] pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${activeConfig.ringClass} focus:border-transparent`}
                  placeholder={activeConfig.placeholderUser}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="current-password"
                className="block text-xs font-semibold text-slate-200 tracking-wide"
              >
                Password <span aria-hidden="true" className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="current-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  enterKeyHint="done"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  aria-invalid={error ? 'true' : 'false'}
                  style={{ fontSize: 'max(1rem, 1em)' }}
                  className={`block w-full min-h-[48px] pl-10 pr-12 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${activeConfig.ringClass} focus:border-transparent`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 px-3.5 flex items-center text-slate-400 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 rounded-r-xl"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full min-h-[48px] flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white transition disabled:opacity-50 ${activeConfig.buttonClass}`}
              >
                {loading ? 'Authenticating...' : `Sign In to ${activeConfig.badge}`}
              </button>
            </div>

            <div className="pt-3 border-t border-slate-800 text-center">
              <p className="text-[11px] text-slate-400">
                Restricted to authorized <strong className="text-slate-200">{activeConfig.role}</strong> accounts only.
              </p>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        Company Mobile Management System • Dedicated {activeConfig.badge}
      </footer>
    </div>
  );
}
