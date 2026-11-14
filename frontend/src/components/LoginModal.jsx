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
  Clock,
  CheckCircle2,
  Building2,
  Globe
} from 'lucide-react';

export const PORTAL_CONFIGS = {
  Employee: {
    role: 'Employee',
    path: '/emp',
    hash: '#/emp',
    subdomainExample: 'htsk-mobile-mgmt-emp.runasp.net',
    badge: 'Employee Access Portal',
    code: 'EMP-PORTAL',
    title: 'Employee Sign In',
    subtitle: 'Read-only access to mobile phone availability, group assignments, and checking history.',
    icon: Building2,
    accentBg: 'from-emerald-600 to-teal-700',
    accentLight: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-500 focus-visible:outline-emerald-500 shadow-emerald-950/50',
    ringClass: 'focus:ring-emerald-500',
    features: [
      'View live availability of all company mobile phones',
      'Inspect department & employee group status',
      'Browse historical 2-hour checking records & daily reports'
    ],
    placeholderUser: 'Enter your Employee username'
  },
  ITAdmin: {
    role: 'ITAdmin',
    path: '/adm002',
    hash: '#/adm002',
    subdomainExample: 'htsk-mobile-mgmt-adm002.runasp.net',
    badge: 'IT Admin Operations Portal',
    code: 'ADM002-PORTAL',
    title: 'IT Admin Sign In',
    subtitle: 'Conduct mandatory 2-hour physical phone inspections, manage inventory, and handle missing incidents.',
    icon: ShieldCheck,
    accentBg: 'from-blue-600 to-indigo-700',
    accentLight: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    buttonClass: 'bg-blue-600 hover:bg-blue-500 focus-visible:outline-blue-500 shadow-blue-950/50',
    ringClass: 'focus:ring-blue-500',
    features: [
      'Start & complete 2-hour mobile checking sessions',
      'Register mobile devices and organize employee groups',
      'Investigate & resolve escalated missing-phone incidents'
    ],
    placeholderUser: 'Enter your IT Admin username'
  },
  Developer: {
    role: 'Developer',
    path: '/dev001',
    hash: '#/dev001',
    subdomainExample: 'htsk-mobile-mgmt-dev001.runasp.net',
    badge: 'Developer System Console',
    code: 'DEV001-PORTAL',
    title: 'Developer Sign In',
    subtitle: 'Full system administration, CRUD operations across all modules, role governance, and configuration.',
    icon: Terminal,
    accentBg: 'from-purple-600 to-violet-800',
    accentLight: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    buttonClass: 'bg-purple-600 hover:bg-purple-500 focus-visible:outline-purple-500 shadow-purple-950/50',
    ringClass: 'focus:ring-purple-500',
    features: [
      'Full CRUD control over all system modules & records',
      'Manage user accounts, role permissions, & system settings',
      'Audit sessions, notifications, incidents, & history'
    ],
    placeholderUser: 'Enter your Developer username'
  }
};

/**
 * Detects which isolated role login portal is requested from:
 * 1. Hostname / Subdomain (e.g. htsk-mobile-mgmt-dev001.runasp.net, htsk-mobile-mgmt-adm002.runasp.net, htsk-mobile-mgmt-emp.runasp.net)
 * 2. Clean URL Path on a single website (e.g. /dev001, /adm002, /emp)
 * 3. URL Hash fallback (e.g. #/dev001, #/adm002, #/emp)
 *
 * Defaults to 'Employee' when visiting the root URL '/' so administrative portals (/dev001, /adm002) remain unexposed.
 */
export function detectPortalFromLocation() {
  const host = (window.location.hostname || '').toLowerCase();
  const path = (window.location.pathname || '').toLowerCase();
  const hash = (window.location.hash || '').toLowerCase();
  const search = (window.location.search || '').toLowerCase();

  // 1. Check Subdomain / Hostname
  if (host.includes('dev001') || host.includes('-dev') || host.startsWith('dev.')) {
    return 'Developer';
  }
  if (host.includes('adm002') || host.includes('-adm') || host.includes('-admin') || host.startsWith('adm.') || host.startsWith('admin.')) {
    return 'ITAdmin';
  }
  if (host.includes('-emp') || host.startsWith('emp.')) {
    return 'Employee';
  }

  // 2. Check Clean URL Pathname (for single MonsterASP.NET website with unique role URLs)
  if (
    path.startsWith('/dev001') ||
    path.startsWith('/dev-001') ||
    path.startsWith('/developer') ||
    path.startsWith('/login/developer')
  ) {
    return 'Developer';
  }
  if (
    path.startsWith('/adm002') ||
    path.startsWith('/adm-002') ||
    path.startsWith('/itadmin') ||
    path.startsWith('/admin') ||
    path.startsWith('/login/itadmin')
  ) {
    return 'ITAdmin';
  }
  if (
    path.startsWith('/emp') ||
    path.startsWith('/employee') ||
    path.startsWith('/login/employee')
  ) {
    return 'Employee';
  }

  // 3. Check Hash or Query string
  if (hash.includes('dev001') || hash.includes('developer') || search.includes('portal=dev')) {
    return 'Developer';
  }
  if (hash.includes('adm002') || hash.includes('itadmin') || search.includes('portal=adm')) {
    return 'ITAdmin';
  }
  if (hash.includes('emp') || hash.includes('employee') || search.includes('portal=emp')) {
    return 'Employee';
  }

  // Default root URL ('/') strictly to Employee portal for security isolation
  return 'Employee';
}

export default function LoginModal({ onLogin, initialPortal = null }) {
  const [selectedPortal, setSelectedPortal] = useState(() => {
    return detectPortalFromLocation() || initialPortal || 'Employee';
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
    const syncPortalFromUrl = () => {
      const detected = detectPortalFromLocation();
      setSelectedPortal(detected);
      setError('');
      setUsername('');
      setPassword('');
      setShowPassword(false);
    };

    window.addEventListener('popstate', syncPortalFromUrl);
    window.addEventListener('hashchange', syncPortalFromUrl);
    return () => {
      window.removeEventListener('popstate', syncPortalFromUrl);
      window.removeEventListener('hashchange', syncPortalFromUrl);
    };
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

  const activeConfig = PORTAL_CONFIGS[selectedPortal] || PORTAL_CONFIGS.Employee;
  const PortalIcon = activeConfig.icon;
  const currentUrlDisplay = `${window.location.origin}${activeConfig.path}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#0f2942] rounded-xl flex items-center justify-center shadow-lg border border-slate-700">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white">HTSK MOBILE MANAGEMENT</span>
              <span className={`hidden sm:inline-block text-xs font-semibold ml-3 px-2.5 py-0.5 rounded-full border ${activeConfig.accentLight}`}>
                {activeConfig.code}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-slate-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{colomboTime}</span>
          </div>
        </div>
      </header>

      {/* Dedicated Single-Role Sign-In Card (Strict Role URL Isolation) */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Role Banner Header */}
          <div className={`bg-gradient-to-r ${activeConfig.accentBg} p-6 text-white`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider bg-black/25 px-3 py-1 rounded-full border border-white/15">
                {activeConfig.badge}
              </span>
              <PortalIcon className="w-7 h-7 text-white/90" />
            </div>
            <h1 id="portal-signin-heading" className="text-2xl font-bold mt-3">
              {activeConfig.title}
            </h1>
            <p className="text-xs text-white/90 mt-1.5 leading-relaxed">
              {activeConfig.subtitle}
            </p>
            <div className="mt-3 pt-3 border-t border-white/15 flex items-center space-x-2 text-xs font-mono text-white/90">
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{currentUrlDisplay}</span>
            </div>
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
                {loading ? 'Authenticating...' : `Sign In as ${activeConfig.role}`}
              </button>
            </div>

            <ul className="pt-4 border-t border-slate-800 space-y-2">
              {activeConfig.features.map((feat, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-xs text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <div className="pt-3 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                Isolated endpoint restricted to <strong className="text-slate-200">{activeConfig.role}</strong> accounts only.
              </p>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        HTSK Mobile Management • Dedicated {activeConfig.badge} • Sri Lanka Standard Time (UTC+05:30)
      </footer>
    </div>
  );
}
