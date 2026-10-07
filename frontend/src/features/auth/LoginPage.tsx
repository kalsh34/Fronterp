import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { useT } from '../../i18n';
import { ThemeToggle, LanguageToggle } from '../../components/ThemeToggle';

const DEMO_ACCOUNTS = [
  { role: 'Super Admin', email: 'admin@vitalpayroll.com' },
  { role: 'HR Director', email: 'hr@vitalpayroll.com' },
  { role: 'Finance Officer', email: 'finance@vitalpayroll.com' },
  { role: 'Operations', email: 'ops@vitalpayroll.com' },
  { role: 'Security Guard', email: 'guard@vitalpayroll.com' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const t = useT();

  const handleDemoSelect = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      if (user?.role === UserRole.GUARD) {
        navigate('/guard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 p-4 sm:p-6 relative overflow-hidden">
      {/* Top Controls: Language & Theme */}
      <div className="flex items-center justify-end gap-3 z-10">
        <LanguageToggle className="bg-slate-900 border-slate-800 text-slate-200" />
        <ThemeToggle className="bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800" />
      </div>

      {/* Background subtle glowing radial gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md mx-auto my-6 bg-surface dark:bg-navy-900 rounded-2xl shadow-2xl border border-slate-800/40 dark:border-navy-700 overflow-hidden z-10">
        {/* Top Header Card Strip */}
        <div className="bg-slate-900 dark:bg-navy-950 px-8 pt-8 pb-7 text-center border-b border-slate-800 dark:border-navy-800">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800/90 border border-slate-700/80 mb-3.5 shadow-inner">
            <img src="/logo.png" alt="Vital Security" className="w-9 h-9 object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            VITAL SECURITY
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Enterprise Workforce & Payroll System
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
                {t('email')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-canvas border border-line rounded-xl text-xs font-medium text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all"
                  placeholder={t('enterEmail')}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
                  {t('password')}
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-canvas border border-line rounded-xl text-xs font-medium text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all"
                  placeholder={t('enterPassword')}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-150 flex items-center justify-center gap-2 group cursor-pointer"
            >
              {loading ? (
                <span>{t('signingIn')}</span>
              ) : (
                <>
                  <span>{t('signIn')}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick 1-Click Demo Accounts Selector */}
          <div className="mt-7 pt-6 border-t border-line/70">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary-600" /> Demo Roles (One-Click)
              </p>
              <span className="text-[10px] text-muted">pwd: password123</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {DEMO_ACCOUNTS.map((demo) => {
                const isCurrent = email === demo.email;
                return (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => handleDemoSelect(demo.email)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                      isCurrent
                        ? 'border-primary-600 bg-primary-50/80 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300'
                        : 'border-line hover:border-line-strong bg-canvas hover:bg-subtle text-ink'
                    }`}
                  >
                    <span className="font-semibold">{demo.role}</span>
                    <span className="text-[11px] text-muted font-mono">{demo.email}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Security watermark footer */}
        <div className="bg-subtle/50 px-8 py-3 border-t border-line flex items-center justify-between text-[11px] text-muted">
          <span>Vital Security PLC © 2026</span>
          <span className="flex items-center gap-1 text-muted">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> TLS 1.3 Encrypted
          </span>
        </div>
      </div>

      <div />
    </div>
  );
}
