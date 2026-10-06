import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { Shield, Lock, Mail, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'Admin (All Access)', email: 'admin@vitalpayroll.com', color: 'border-slate-300 text-slate-800 bg-slate-100' },
  { role: 'HR Manager', email: 'hr@vitalpayroll.com', color: 'border-blue-200 text-blue-700 bg-blue-50' },
  { role: 'Finance Officer', email: 'finance@vitalpayroll.com', color: 'border-sky-200 text-sky-700 bg-sky-50' },
  { role: 'Operations', email: 'ops@vitalpayroll.com', color: 'border-slate-300 text-slate-800 bg-slate-100' },
  { role: 'Security Guard', email: 'guard@vitalpayroll.com', color: 'border-blue-200 text-blue-700 bg-blue-50' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

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
        navigate('/my-shift');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 sm:p-6 relative overflow-hidden">
      {/* Background subtle glowing radial gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-800/20 overflow-hidden">
        {/* Top Header Card Strip */}
        <div className="bg-slate-900 px-8 pt-8 pb-7 text-center border-b border-slate-800">
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
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Corporate Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all"
                  placeholder="name@vitalpayroll.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all"
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-150 flex items-center justify-center gap-2 group cursor-pointer"
            >
              {loading ? (
                <span>Authenticating credentials...</span>
              ) : (
                <>
                  <span>Sign In to ERP</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick 1-Click Demo Accounts Selector */}
          <div className="mt-7 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-600" /> Demo Roles (One-Click)
              </p>
              <span className="text-[10px] text-slate-400">pwd: password123</span>
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
                        ? 'border-blue-600 bg-blue-50/80 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/70 hover:bg-slate-100/80 text-slate-700'
                    }`}
                  >
                    <span className="font-semibold">{demo.role}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{demo.email}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Security watermark footer */}
        <div className="bg-slate-50 px-8 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Vital Security PLC © 2026</span>
          <span className="flex items-center gap-1 text-slate-500">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> TLS Encrypted
          </span>
        </div>
      </div>
    </div>
  );
}
